import type { RowDataPacket } from "mysql2";
import pool from "../config/db";
import { v4 as uuid } from "uuid";
import { sendAppointmentCancelledEmail } from "../utils/mail";
import { cacheGet, cacheSet, cacheDel } from "../config/redis";
import { logger } from "../utils/logger";

const availabilityKey = (
  providerId: string,
  date: string
) => `availability:${providerId}:${date}`;

const toDateKey = (value: string | Date): string => {
  const d = new Date(value);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/* ----------------------------------------------------------------
   SCHEDULING HELPERS
-----------------------------------------------------------------*/

const DAY_MINUTES = 24 * 60;

const timeToMinutes = (time: string): number => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
};

const minutesToTime = (mins: number): string => {
  const h = Math.floor(mins / 60)
    .toString()
    .padStart(2, "0");
  const m = (mins % 60)
    .toString()
    .padStart(2, "0");
  return `${h}:${m}`;
};

const generateSlots = (
  set: Set<string>,
  startMin: number,
  endMin: number,
  duration: number,
  step: number
) => {
  for (
    let t = startMin;
    t + duration <= endMin;
    t += step
  ) {
    set.add(minutesToTime(t));
  }
};

/*
Computes the minute-of-day window that an override occupies on a
specific date (handles overrides that span multiple days).
Returns null if the override does not touch the date.
*/
const overrideWindowOnDate = (
  date: string,
  startDatetime: string | Date,
  endDatetime: string | Date
): { startMin: number; endMin: number } | null => {
  const start = new Date(startDatetime);
  const end = new Date(endDatetime);

  const dayStart = new Date(`${date}T00:00:00`);
  const dayEnd = new Date(`${date}T23:59:59`);

  if (end < dayStart || start > dayEnd) {
    return null;
  }

  const startMin =
    start <= dayStart
      ? 0
      : start.getHours() * 60 + start.getMinutes();

  const endMin =
    end >= dayEnd
      ? DAY_MINUTES
      : end.getHours() * 60 + end.getMinutes();

  return { startMin, endMin };
};

/*
Core availability engine.
Builds the set of bookable "HH:MM" slots for a provider on a date,
based on the active schedule template + weekday blocks, then applies
EXTRA_HOURS / UNAVAILABLE overrides, and finally removes slots that
are already booked.
*/
export const computeAvailableSlots = async (
  providerId: string,
  date: string
): Promise<{ slots: string[]; duration: number }> => {

  const [y, mo, d] = date.split("-").map(Number);
  const weekday = new Date(y, mo - 1, d).getDay();

  const [templates] = await pool.query<RowDataPacket[]>(
    `
    SELECT *
    FROM provider_schedule_templates
    WHERE provider_id = ?
      AND is_active = TRUE
      AND effective_start_date <= ?
      AND (
        run_indefinitely = TRUE
        OR effective_end_date IS NULL
        OR effective_end_date >= ?
      )
    ORDER BY created_at DESC
    `,
    [providerId, date, date]
  );

  const slotSet = new Set<string>();
  let duration = 30;

  if (templates.length > 0) {
    const template = templates[0];
    duration = template.appointment_duration || 30;
    const step = duration + (template.buffer_time || 0);

    const [blocks] = await pool.query<RowDataPacket[]>(
      `
      SELECT *
      FROM provider_schedule_blocks
      WHERE template_id = ?
        AND weekday = ?
      `,
      [template.id, weekday]
    );

    for (const block of blocks) {
      generateSlots(
        slotSet,
        timeToMinutes(block.start_time),
        timeToMinutes(block.end_time),
        duration,
        step
      );
    }
  }

  /* Overrides on this date */
  const [overrides] = await pool.query<RowDataPacket[]>(
    `
    SELECT *
    FROM provider_schedule_overrides
    WHERE provider_id = ?
      AND DATE(start_datetime) <= ?
      AND DATE(end_datetime) >= ?
    `,
    [providerId, date, date]
  );

  for (const ov of overrides) {
    const window = overrideWindowOnDate(
      date,
      ov.start_datetime,
      ov.end_datetime
    );

    if (!window) continue;

    if (ov.override_type === "EXTRA_HOURS") {
      generateSlots(
        slotSet,
        window.startMin,
        window.endMin,
        duration,
        duration
      );
    }

    if (ov.override_type === "UNAVAILABLE") {
      for (const slot of [...slotSet]) {
        const slotMin = timeToMinutes(slot);
        if (
          slotMin >= window.startMin &&
          slotMin < window.endMin
        ) {
          slotSet.delete(slot);
        }
      }
    }
  }

  /* Remove already booked slots */
  const [booked] = await pool.query<RowDataPacket[]>(
    `
    SELECT scheduled_at
    FROM appointments
    WHERE provider_id = ?
      AND DATE(scheduled_at) = ?
      AND status != 'CANCELLED'
    `,
    [providerId, date]
  );

  for (const row of booked) {
    const dt = new Date(row.scheduled_at);
    const slot = minutesToTime(
      dt.getHours() * 60 + dt.getMinutes()
    );
    slotSet.delete(slot);
  }

  const slots = [...slotSet].sort();

  return { slots, duration };
};

/*
Parses a scheduled_at value into a date ("YYYY-MM-DD")
and a slot ("HH:MM").
*/
const splitScheduledAt = (
  scheduledAt: string
): { date: string; slot: string } => {
  const normalized = scheduledAt
    .replace(" ", "T")
    .trim();

  const [datePart, timePart = "00:00"] =
    normalized.split("T");

  return {
    date: datePart,
    slot: timePart.slice(0, 5),
  };
};

const assertSlotAvailable = async (
  providerId: string,
  scheduledAt: string,
  ignoreAppointmentId?: string
) => {

  const { date, slot } =
    splitScheduledAt(scheduledAt);

  const { slots } = await computeAvailableSlots(
    providerId,
    date
  );

  /*
  When rescheduling, the appointment's own current slot would have
  already been removed from availability (it's booked) — but the
  new requested slot is what we validate, so we only need to check
  the new slot here.
  */
  if (!slots.includes(slot)) {
    void ignoreAppointmentId;
    throw new Error(
      "Selected time is outside the provider's available schedule"
    );
  }
};

/* ----------------------------------------------------------------
   DIRECTORY (for patient booking)
-----------------------------------------------------------------*/

/*
Only surface providers who are approved, active AND have at least one
facility assigned via provider_facilities. This prevents the dead-end
where a patient picks a doctor only to find an empty facility list.
*/
export const getBookableProvidersService =
async () => {

  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT
      p.id,
      p.name,
      p.specialty,
      p.photo_url,
      p.bio,
      p.languages,
      p.accepting_new
    FROM providers p
    JOIN users u
      ON p.user_id = u.id
    WHERE u.approval_status = 'APPROVED'
      AND u.is_active = TRUE
      AND EXISTS (
        SELECT 1
        FROM provider_facilities pf
        WHERE pf.provider_id = p.id
      )
    ORDER BY p.name
    `
  );

  return {
    success: true,
    data: rows
  };
};

/*
SINGLE SOURCE OF TRUTH:
For patient booking we strictly read from provider_facilities only.
If the provider has no rows in provider_facilities we return [] —
a provider must NOT appear associated with a facility unless the
admin has explicitly created the assignment.
*/
export const getProviderFacilitiesService =
async (
  providerId: string
) => {

  const [linked] = await pool.query<RowDataPacket[]>(
    `
    SELECT
      f.id,
      f.name,
      f.address,
      f.phone,
      f.type
    FROM provider_facilities pf
    JOIN facilities f
      ON pf.facility_id = f.id
    WHERE pf.provider_id = ?
    ORDER BY f.name
    `,
    [providerId]
  );

  return {
    success: true,
    data: linked
  };
};

/* ----------------------------------------------------------------
   AVAILABILITY ENDPOINT
-----------------------------------------------------------------*/

export const getAvailabilityService = async (
  providerId: string,
  date: string
) => {

  const [providers] = await pool.query<RowDataPacket[]>(
    `
    SELECT id
    FROM providers
    WHERE id = ?
    `,
    [providerId]
  );

  if (providers.length === 0) {
    throw new Error("Doctor not found");
  }

  /* Try cache first */
  const cacheKey = availabilityKey(providerId, date);
  const cached = await cacheGet(cacheKey);

  if (cached) {
    return {
      ...JSON.parse(cached),
      cached: true,
    };
  }

  const { slots, duration } =
    await computeAvailableSlots(providerId, date);

  const result = {
    success: true,
    providerId,
    date,
    duration,
    slots,
  };

  /* Short TTL — availability changes as bookings happen */
  await cacheSet(
    cacheKey,
    JSON.stringify(result),
    30
  );

  return result;
};

/* ----------------------------------------------------------------
   FACILITY-AWARE AVAILABILITY (Sprint 7)
   Validates that the provider is assigned to the given facility,
   then delegates to the existing per-provider engine.
-----------------------------------------------------------------*/
export const getAvailabilityForFacilityService = async (
  providerId: string,
  facilityId: string,
  date: string
) => {
  const [link] = await pool.query<RowDataPacket[]>(
    `SELECT 1 FROM provider_facilities
       WHERE provider_id = ? AND facility_id = ? LIMIT 1`,
    [providerId, facilityId]
  );
  if (link.length === 0) {
    throw new Error(
      "This doctor does not practice at the selected hospital"
    );
  }
  const result = await getAvailabilityService(providerId, date);
  return { ...result, facilityId };
};

/* ----------------------------------------------------------------
   BOOK
-----------------------------------------------------------------*/

export const bookAppointmentService = async (
  userId: string,
  data: Record<string, never>
) => {
  const [patients] = await pool.query<RowDataPacket[]>(
    `
    SELECT id
    FROM patients
    WHERE user_id = ?
    `,
    [userId]
  );

  if (patients.length === 0) {
    throw new Error(
      "Patient not found"
    );
  }

  const patientId = patients[0].id;

  const {
    provider_id,
    facility_id,
    scheduled_at,
    duration_min,
    type,
    reason
  } = data;

  const [providers] = await pool.query<RowDataPacket[]>(
    `
    SELECT id
    FROM providers
    WHERE id = ?
    `,
    [provider_id] 
  );

  if (providers.length === 0) {
    throw new Error("Doctor not found");
  }

  if (!facility_id) {
    throw new Error(
      "Please select a facility for this appointment"
    );
  }

  /*
  Single source of truth: the chosen facility MUST be assigned to the
  chosen provider via provider_facilities. This is enforced even if
  the frontend was somehow able to send an unrelated facility_id.
  */
  const [link] = await pool.query<RowDataPacket[]>(
    `
    SELECT 1
    FROM provider_facilities
    WHERE provider_id = ? AND facility_id = ?
    `,
    [provider_id, facility_id]
  );

  if (link.length === 0) {
    throw new Error(
      "This facility is not associated with the selected doctor"
    );
  }

  /* Schedule-aware validation */
  await assertSlotAvailable(
    provider_id,
    scheduled_at
  );

  const [existing] = await pool.query<RowDataPacket[]>(
    `
    SELECT id
    FROM appointments
    WHERE provider_id = ?
    AND scheduled_at = ?
    AND status != 'CANCELLED'
    `,
    [
      provider_id,
      scheduled_at
    ]
  );

  if (existing.length > 0) {
    throw new Error(
      "This slot is already booked"
    );
  }

  const appointmentId = uuid();

  await pool.query(
    `
    INSERT INTO appointments
    (
      id,
      patient_id,
      provider_id,
      facility_id,
      scheduled_at,
      duration_min,
      type,
      status,
      reason
    )
    VALUES
    (?, ?, ?, ?, ?, ?, ?, 'REQUESTED', ?)
    `,
    [
      appointmentId,
      patientId,
      provider_id,
      facility_id,
      scheduled_at,
      duration_min || 30,
      type,
      reason
    ]
  );

  /* Invalidate cached availability for this provider/date */
  await cacheDel(
    availabilityKey(
      provider_id,
      splitScheduledAt(scheduled_at).date
    )
  );

  return {
    success: true,
    appointmentId,
    message:
      "Appointment booked successfully"
  };
};

/* ----------------------------------------------------------------
   RESCHEDULE
-----------------------------------------------------------------*/

export const rescheduleAppointmentService = async (
  userId: string,
  appointmentId: string,
  data: Record<string, never>
) => {
  const { scheduled_at } = data;

  const [appointments] = await pool.query<RowDataPacket[]>(
      `
      SELECT *
      FROM appointments
      WHERE id = ?
      `,
      [appointmentId]
    );

  if (appointments.length === 0) {
    throw new Error(
      "Appointment not found"
    );
  }

  const appointment = appointments[0];

  /* Schedule-aware validation for the new slot */
  await assertSlotAvailable(
    appointment.provider_id,
    scheduled_at,
    appointmentId
  );

  const [existing] = await pool.query<RowDataPacket[]>(
    `
    SELECT id
    FROM appointments
    WHERE provider_id = ?
      AND scheduled_at = ?
      AND status != 'CANCELLED'
      AND id != ?
    `,
    [
      appointment.provider_id,
      scheduled_at,
      appointmentId
    ]
  );

  if (existing.length > 0) {
    throw new Error(
      "This slot is already booked"
    );
  }

  await pool.query(
    `
    UPDATE appointments
    SET scheduled_at = ?
    WHERE id = ?
    `,
    [
      scheduled_at,
      appointmentId
    ]
  );

  /* Invalidate cache for both the old and new dates */
  await cacheDel(
    availabilityKey(
      appointment.provider_id,
      toDateKey(appointment.scheduled_at)
    )
  );
  await cacheDel(
    availabilityKey(
      appointment.provider_id,
      splitScheduledAt(scheduled_at).date
    )
  );

  return {
    success: true,
    message:
      "Appointment rescheduled successfully"
  };
};

/* ----------------------------------------------------------------
   CANCEL
-----------------------------------------------------------------*/

export const cancelAppointmentService = async (
  userId: string,
  appointmentId: string
) => {
  const [appointments] = await pool.query<RowDataPacket[]>(
      `
      SELECT
        a.scheduled_at,
        a.provider_id,
        pat.first_name,
        pat.last_name,
        pat.email,
        pat.user_id AS patient_user_id,
        prov.name AS doctor_name
      FROM appointments a
      JOIN patients pat
        ON a.patient_id = pat.id
      JOIN providers prov
        ON a.provider_id = prov.id
      WHERE a.id = ?
      `,
      [appointmentId]
    );

  if (appointments.length === 0) {
    throw new Error(
      "Appointment not found"
    );
  }

  const info = appointments[0];

  await pool.query(
    `
    UPDATE appointments
    SET status = 'CANCELLED'
    WHERE id = ?
    `,
    [appointmentId]
  );

  /* Free the slot in cached availability */
  await cacheDel(
    availabilityKey(
      info.provider_id,
      toDateKey(info.scheduled_at)
    )
  );

  /* Notify patient by email */
  if (info?.email) {
    try {
      await sendAppointmentCancelledEmail({
        email: info.email,
        patientName:
          `${info.first_name} ${info.last_name}`.trim(),
        doctorName: info.doctor_name,
        scheduledAt: info.scheduled_at,
        cancelledBy:
          info.patient_user_id === userId
            ? "PATIENT"
            : "PROVIDER"
      });
    } catch (mailError) {
      logger.error(
        "Failed to send cancellation email:",
        mailError
      );
    }
  }

  return {
    success: true,
    message:
      "Appointment cancelled successfully"
  };
};

/* ----------------------------------------------------------------
   LIST (patient's own appointments)
-----------------------------------------------------------------*/

export const getMyAppointmentsService = async (
  userId: string
) => {

  const [patients] = await pool.query<RowDataPacket[]>(
    `
    SELECT id
    FROM patients
    WHERE user_id = ?
    `,
    [userId]
  );

  if (patients.length === 0) {
    throw new Error("Patient not found");
  }

  const patientId = patients[0].id;

  const [appointments] = await pool.query<RowDataPacket[]>(
    `
    SELECT
      a.*,
      p.name AS doctor_name
    FROM appointments a
    JOIN providers p
      ON a.provider_id = p.id
    WHERE a.patient_id = ?
    ORDER BY a.scheduled_at DESC
    `,
    [patientId]
  );

  return {
    success: true,
    data: appointments
  };
};
