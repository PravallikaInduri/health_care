import type { RowDataPacket } from "mysql2";
import pool from "../config/db";
import { v4 as uuid } from "uuid";
import {
  computeAvailableSlots,
} from "./appointmentService";
import {
  cacheDel,
} from "../config/redis";
import {
  sendAppointmentConfirmedEmail,
  sendAppointmentCancelledEmail,
  sendProviderUnavailableEmail,
} from "../utils/mail";
import { writeAuditLog } from "./auditService";
import { ActorContext } from "../utils/auditContext";
import { createNotification } from "./notificationService";
import { logger } from "../utils/logger";

/* ================================================================
   ENTERPRISE APPOINTMENT BOOKING SERVICE
   - draftAppointmentService:    creates BOOKED + payment_status=PENDING
   - confirmAppointmentService:  pretend gateway success → CONFIRMED
   - cancelAppointmentService:   patient cancel → CANCELLED + refund hint
   - alternativesService:        same-doctor-other-slots, same-dept-other-doctors
   - reassignAppointmentService: patient picks alternative
   - markProviderUnavailableService: admin marks unavailability and triggers
                                     PENDING_REASSIGNMENT for affected appts
   - getAppointmentDetailService: full detail with provider/facility/payment
================================================================*/

const availabilityKey = (providerId: string, date: string) =>
  `availability:${providerId}:${date}`;

const toDateKey = (value: string | Date): string => {
  const d = new Date(value);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/* Extract "HH:MM" from a scheduled_at string ("YYYY-MM-DDTHH:MM[:SS]"). */
const extractHHMM = (scheduledAt: string): string => {
  const norm = scheduledAt.replace(" ", "T").trim();
  const time = (norm.split("T")[1] || "00:00").slice(0, 5);
  return time;
};

const formatHuman = (iso: string | Date): string => {
  const d = new Date(iso);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

/* ----------------------------------------------------------------
   DRAFT — creates a BOOKED appointment with PENDING payment
-----------------------------------------------------------------*/

export interface DraftInput {
  provider_id: string;
  facility_id: string;
  scheduled_at: string;
  duration_min?: number;
  type?: string;
  reason?: string;
}

export const draftAppointmentService = async (
  userId: string,
  input: DraftInput,
  actor?: ActorContext
) => {
  const {
    provider_id,
    facility_id,
    scheduled_at,
    duration_min = 30,
    type = "IN_PERSON",
    reason = null,
  } = input;

  if (!provider_id || !facility_id || !scheduled_at) {
    throw new Error("provider_id, facility_id and scheduled_at are required");
  }

  const safeType = type === "VIDEO" ? "VIDEO" : "IN_PERSON";

  /* Validate patient */
  const [patients] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM patients WHERE user_id = ? LIMIT 1`,
    [userId]
  );
  if (patients.length === 0) {
    throw new Error("Patient not found");
  }
  const patientId = patients[0].id;

  /* Validate provider + facility link */
  const [provider] = await pool.query<RowDataPacket[]>(
    `SELECT id, name, consultation_fee, video_consultation_fee
       FROM providers WHERE id = ?`,
    [provider_id]
  );
  if (provider.length === 0) throw new Error("Doctor not found");

  const [link] = await pool.query<RowDataPacket[]>(
    `SELECT 1 FROM provider_facilities
      WHERE provider_id = ? AND facility_id = ? LIMIT 1`,
    [provider_id, facility_id]
  );
  if (link.length === 0) {
    throw new Error("This doctor does not practice at the selected hospital");
  }

  /* Slot must still be available */
  const dateKey = toDateKey(scheduled_at);
  const { slots } = await computeAvailableSlots(provider_id, dateKey);
  const targetSlot = extractHHMM(scheduled_at);
  if (!slots.includes(targetSlot)) {
    throw new Error(
      "This slot is no longer available. Please pick another time."
    );
  }

  /* Guard against double-booking even though the unique key
     no longer enforces it across cancelled rows. */
  const [conflict] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM appointments
      WHERE provider_id = ?
        AND scheduled_at = ?
        AND status NOT IN ('CANCELLED','NO_SHOW') LIMIT 1`,
    [provider_id, scheduled_at]
  );
  if (conflict.length > 0) {
    throw new Error(
      "This slot is no longer available. Please pick another time."
    );
  }

  /* Video visits use the dedicated video fee when set; fall back to the
     in-person fee so we never charge 0 by accident. */
  const inPersonFee = Number(provider[0].consultation_fee ?? 0);
  const videoFeeRaw = provider[0].video_consultation_fee;
  const videoFee =
    videoFeeRaw == null || videoFeeRaw === ""
      ? inPersonFee
      : Number(videoFeeRaw);
  const fee = safeType === "VIDEO" ? videoFee : inPersonFee;
  const appointmentId = uuid();

  await pool.query(
    `
    INSERT INTO appointments
      (id, patient_id, provider_id, facility_id, scheduled_at,
       duration_min, type, status, reason,
       consultation_fee, payment_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'BOOKED', ?, ?, 'PENDING')
    `,
    [
      appointmentId,
      patientId,
      provider_id,
      facility_id,
      scheduled_at,
      duration_min,
      safeType,
      reason,
      fee,
    ]
  );

  /* Tentatively reserve the slot in cache */
  await cacheDel(availabilityKey(provider_id, dateKey));

  await writeAuditLog({
    actorId: actor?.actorId ?? userId,
    actorRole: actor?.actorRole ?? "PATIENT",
    action: "APPOINTMENT_BOOKED",
    resourceType: "appointment",
    resourceId: appointmentId,
    ip: actor?.ip ?? null,
    userAgent: actor?.userAgent ?? null,
    success: true,
    reason: `provider=${provider_id} facility=${facility_id}`,
  });

  return {
    appointmentId,
    consultation_fee: fee,
    status: "BOOKED",
    payment_status: "PENDING",
  };
};

/* ----------------------------------------------------------------
   CONFIRM (mock-pay) — flips status from BOOKED → CONFIRMED
-----------------------------------------------------------------*/

export const confirmAppointmentService = async (
  userId: string,
  appointmentId: string,
  paymentMeta: {
    gateway?: string;
    gateway_txn_id?: string;
  } = {},
  actor?: ActorContext
) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT a.*, p.user_id AS patient_user_id, p.first_name, p.last_name,
           u.email AS patient_email,
           pr.name AS provider_name,
           f.name AS facility_name
      FROM appointments a
      JOIN patients p ON p.id = a.patient_id
      JOIN users u ON u.id = p.user_id
      JOIN providers pr ON pr.id = a.provider_id
      LEFT JOIN facilities f ON f.id = a.facility_id
     WHERE a.id = ? LIMIT 1
    `,
    [appointmentId]
  );
  if (rows.length === 0) throw new Error("Appointment not found");
  const appt = rows[0];

  if (appt.patient_user_id !== userId) {
    throw new Error("Forbidden");
  }
  if (appt.payment_status === "PAID") {
    return {
      success: true,
      already: true,
      appointmentId,
      status: appt.status,
    };
  }
  if (appt.status === "CANCELLED") {
    throw new Error("Cannot pay for a cancelled appointment");
  }

  const amount = Number(appt.consultation_fee ?? 0);
  const paymentId = uuid();
  const txn =
    paymentMeta.gateway_txn_id ||
    `MOCK-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const gateway = paymentMeta.gateway || "MOCK";

  await pool.query(
    `INSERT INTO payments
       (id, appointment_id, gateway, gateway_txn_id, amount, status, paid_at)
     VALUES (?, ?, ?, ?, ?, 'SUCCESS', NOW())`,
    [paymentId, appointmentId, gateway, txn, amount]
  );

  /* Sprint 6 — video visits: generate a working join link on confirmation.
     Uses a public Jitsi Meet room keyed to the appointment id so both the
     patient and provider land in the same room with no extra integration. */
  const isVideo = appt.type === "VIDEO" || appt.appointment_mode === "VIDEO";
  const meetingLink = isVideo
    ? `https://meet.jit.si/healthapp-${appointmentId}`
    : null;

  await pool.query(
    `UPDATE appointments
        SET status = 'CONFIRMED',
            payment_status = 'PAID',
            paid_at = NOW(),
            payment_id = ?,
            meeting_link = COALESCE(meeting_link, ?)
      WHERE id = ?`,
    [paymentId, meetingLink, appointmentId]
  );

  /* Send confirmation email + in-app notification */
  try {
    await sendAppointmentConfirmedEmail({
      email: appt.patient_email,
      patientName:
        [appt.first_name, appt.last_name].filter(Boolean).join(" ") ||
        "Patient",
      doctorName: appt.provider_name,
      scheduledAt: appt.scheduled_at,
      type: appt.type,
      facilityName: appt.facility_name,
      meetingLink: meetingLink ?? appt.meeting_link ?? null,
    });
  } catch (e) {
    logger.warn("Confirmation email failed:", (e as Error).message);
  }

  await createNotification({
    userId: appt.patient_user_id,
    type: "APPOINTMENT_CONFIRMED",
    title: "Appointment Confirmed",
    body: `Your appointment with Dr. ${appt.provider_name} on ${formatHuman(
      appt.scheduled_at
    )} is confirmed.`,
    link: `/patient/appointments`,
    meta: { appointmentId },
  });

  await writeAuditLog({
    actorId: actor?.actorId ?? userId,
    actorRole: actor?.actorRole ?? "PATIENT",
    action: "APPOINTMENT_CONFIRMED",
    resourceType: "appointment",
    resourceId: appointmentId,
    ip: actor?.ip ?? null,
    userAgent: actor?.userAgent ?? null,
    success: true,
    reason: `payment=${paymentId} amount=${amount}`,
  });

  return {
    success: true,
    appointmentId,
    paymentId,
    status: "CONFIRMED",
    payment_status: "PAID",
    amount,
  };
};

/* ----------------------------------------------------------------
   CANCEL — patient or admin cancellation
-----------------------------------------------------------------*/

export const cancelBookingService = async (
  userId: string,
  appointmentId: string,
  reason: string | null,
  actor?: ActorContext
) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT a.*, p.user_id AS patient_user_id, p.first_name, p.last_name,
           u.email AS patient_email,
           pr.name AS provider_name
      FROM appointments a
      JOIN patients p ON p.id = a.patient_id
      JOIN users u ON u.id = p.user_id
      JOIN providers pr ON pr.id = a.provider_id
     WHERE a.id = ? LIMIT 1
    `,
    [appointmentId]
  );
  if (rows.length === 0) throw new Error("Appointment not found");
  const appt = rows[0];

  /* Patients can only cancel their own.  Admin/Ops can cancel all. */
  const role = actor?.actorRole;
  const isAdmin = role === "ADMIN" || role === "OPS";
  if (!isAdmin && appt.patient_user_id !== userId) {
    throw new Error("Forbidden");
  }

  if (appt.status === "CANCELLED") {
    return { success: true, already: true, appointmentId };
  }
  if (appt.status === "COMPLETED") {
    throw new Error("Cannot cancel a completed appointment");
  }

  const refund = appt.payment_status === "PAID";
  await pool.query(
    `UPDATE appointments
        SET status = 'CANCELLED',
            payment_status = ?
      WHERE id = ?`,
    [refund ? "REFUNDED" : appt.payment_status, appointmentId]
  );

  /* If a payment exists, mark it refunded */
  if (refund && appt.payment_id) {
    await pool.query(
      `UPDATE payments SET status = 'REFUNDED' WHERE id = ?`,
      [appt.payment_id]
    );
  }

  await cacheDel(availabilityKey(appt.provider_id, toDateKey(appt.scheduled_at)));

  /* Email + in-app */
  try {
    await sendAppointmentCancelledEmail({
      email: appt.patient_email,
      patientName:
        [appt.first_name, appt.last_name].filter(Boolean).join(" ") ||
        "Patient",
      doctorName: appt.provider_name,
      scheduledAt: appt.scheduled_at,
      cancelledBy: isAdmin ? "PROVIDER" : "PATIENT",
    });
  } catch (e) {
    logger.warn("Cancellation email failed:", (e as Error).message);
  }

  await createNotification({
    userId: appt.patient_user_id,
    type: "APPOINTMENT_CANCELLED",
    title: "Appointment Cancelled",
    body: `Your appointment with Dr. ${appt.provider_name} on ${formatHuman(
      appt.scheduled_at
    )} has been cancelled.${refund ? " A refund will be processed." : ""}`,
    link: `/patient/appointments`,
    meta: { appointmentId, refund },
  });

  await writeAuditLog({
    actorId: actor?.actorId ?? userId,
    actorRole: role ?? "PATIENT",
    action: "APPOINTMENT_CANCELLED",
    resourceType: "appointment",
    resourceId: appointmentId,
    ip: actor?.ip ?? null,
    userAgent: actor?.userAgent ?? null,
    success: true,
    reason: reason ?? null,
  });

  return { success: true, appointmentId, refund };
};

/* ----------------------------------------------------------------
   APPOINTMENT DETAIL — full payload for review/payment/detail screens
-----------------------------------------------------------------*/

export const getAppointmentDetailService = async (
  userId: string,
  appointmentId: string,
  actorRole?: string
) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT
      a.*,
      pr.name             AS provider_name,
      pr.specialty        AS provider_specialty,
      pr.photo_url        AS provider_photo,
      pr.qualifications   AS provider_qualifications,
      pr.consultation_fee AS provider_fee,
      f.name              AS facility_name,
      f.address           AS facility_address,
      f.city              AS facility_city,
      f.phone             AS facility_phone,
      f.logo_url          AS facility_logo,
      p.user_id           AS patient_user_id,
      p.first_name,
      p.last_name,
      pay.status          AS payment_gateway_status,
      pay.gateway,
      pay.gateway_txn_id,
      pay.amount          AS payment_amount
    FROM appointments a
    JOIN patients  p  ON p.id = a.patient_id
    JOIN providers pr ON pr.id = a.provider_id
    LEFT JOIN facilities f ON f.id = a.facility_id
    LEFT JOIN payments  pay ON pay.id = a.payment_id
    WHERE a.id = ? LIMIT 1
    `,
    [appointmentId]
  );
  if (rows.length === 0) throw new Error("Appointment not found");

  const r = rows[0];
  const isAdmin = actorRole === "ADMIN" || actorRole === "OPS";
  if (!isAdmin && r.patient_user_id !== userId) {
    throw new Error("Forbidden");
  }

  return r;
};

/* ----------------------------------------------------------------
   ALTERNATIVES — for PENDING_REASSIGNMENT
   Returns:
     - sameDoctorSlots:  next available slots for the same doctor
                          on the original date and the next 7 days
     - alternativeDoctors: other doctors in the same dept/facility
                           with their next available slots
-----------------------------------------------------------------*/

export const getAppointmentAlternativesService = async (
  userId: string,
  appointmentId: string,
  actorRole?: string
) => {
  const appt = await getAppointmentDetailService(
    userId,
    appointmentId,
    actorRole
  );

  /* Same doctor — collect slots over the next 7 days */
  const sameDoctorSlots: Array<{
    date: string;
    time: string;
    scheduled_at: string;
  }> = [];
  const startDate = new Date(appt.scheduled_at);
  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const dateKey = toDateKey(d);
    try {
      const { slots } = await computeAvailableSlots(
        appt.provider_id,
        dateKey
      );
      slots.forEach((time) =>
        sameDoctorSlots.push({
          date: dateKey,
          time,
          scheduled_at: `${dateKey}T${time}:00`,
        })
      );
    } catch {
      /* skip days the doctor isn't scheduled */
    }
  }

  /* Same department + same facility → other doctors */
  const [deptRows] = await pool.query<RowDataPacket[]>(
    `SELECT department_id FROM provider_departments
      WHERE provider_id = ?`,
    [appt.provider_id]
  );
  const departmentIds = deptRows.map((r: RowDataPacket) => r.department_id);

  let altDoctors: unknown[] = [];
  if (departmentIds.length > 0) {
    const placeholders = departmentIds.map(() => "?").join(",");
    const [docs] = await pool.query<RowDataPacket[]>(
      `
      SELECT DISTINCT
        pr.id, pr.name, pr.specialty, pr.photo_url,
        pr.experience_years, pr.qualifications,
        pr.consultation_fee,
        pr.video_consultation_fee,
        (SELECT ROUND(AVG(rating),1) FROM doctor_reviews
           WHERE provider_id = pr.id) AS avg_rating,
        (SELECT COUNT(*) FROM doctor_reviews
           WHERE provider_id = pr.id) AS review_count
      FROM providers pr
      JOIN provider_facilities  pf ON pf.provider_id = pr.id
      JOIN provider_departments pd ON pd.provider_id = pr.id
      WHERE pf.facility_id = ?
        AND pd.department_id IN (${placeholders})
        AND pr.id <> ?
        AND pr.verification_status = 'APPROVED'
      LIMIT 10
      `,
      [appt.facility_id, ...departmentIds, appt.provider_id]
    );

    /* For each candidate, fetch their first 5 slots in the next 3 days */
    for (const d of docs) {
      const slotsForDoc: Array<{
        date: string;
        time: string;
        scheduled_at: string;
      }> = [];
      for (let i = 0; i < 3 && slotsForDoc.length < 5; i++) {
        const dt = new Date(startDate);
        dt.setDate(dt.getDate() + i);
        const dateKey = toDateKey(dt);
        try {
          const { slots } = await computeAvailableSlots(d.id, dateKey);
          for (const time of slots) {
            if (slotsForDoc.length >= 5) break;
            slotsForDoc.push({
              date: dateKey,
              time,
              scheduled_at: `${dateKey}T${time}:00`,
            });
          }
        } catch {
          /* skip */
        }
      }
      altDoctors.push({ ...d, nextSlots: slotsForDoc });
    }
  }

  return {
    appointment: appt,
    sameDoctorSlots: sameDoctorSlots.slice(0, 30),
    alternativeDoctors: altDoctors,
  };
};

/* ----------------------------------------------------------------
   REASSIGN — patient picks a new slot/doctor for a
   PENDING_REASSIGNMENT appointment.  Existing payment carries over.
-----------------------------------------------------------------*/

export interface ReassignInput {
  scheduled_at: string;
  provider_id?: string;   // if changing doctor
}

export const reassignAppointmentService = async (
  userId: string,
  appointmentId: string,
  data: ReassignInput,
  actor?: ActorContext
) => {
  const appt = await getAppointmentDetailService(userId, appointmentId);

  if (appt.status !== "PENDING_REASSIGNMENT" && appt.status !== "CONFIRMED") {
    throw new Error(
      "Only confirmed or pending re-assignment appointments can be reassigned"
    );
  }

  const newProvider = data.provider_id || appt.provider_id;
  const newScheduledAt = data.scheduled_at;

  if (!newScheduledAt) {
    throw new Error("scheduled_at is required");
  }

  /* If the doctor changed, validate facility link */
  if (newProvider !== appt.provider_id) {
    const [link] = await pool.query<RowDataPacket[]>(
      `SELECT 1 FROM provider_facilities
        WHERE provider_id = ? AND facility_id = ? LIMIT 1`,
      [newProvider, appt.facility_id]
    );
    if (link.length === 0) {
      throw new Error(
        "Selected doctor does not practice at this hospital"
      );
    }
  }

  /* Slot must still be available */
  const dateKey = toDateKey(newScheduledAt);
  const { slots } = await computeAvailableSlots(newProvider, dateKey);
  const targetSlot = extractHHMM(newScheduledAt);
  if (!slots.includes(targetSlot)) {
    throw new Error("This slot is no longer available");
  }

  await pool.query(
    `
    UPDATE appointments
       SET provider_id  = ?,
           scheduled_at = ?,
           status       = 'RESCHEDULED'
     WHERE id = ?
    `,
    [newProvider, newScheduledAt, appointmentId]
  );

  /* Invalidate caches for old & new dates */
  await cacheDel(availabilityKey(appt.provider_id, toDateKey(appt.scheduled_at)));
  await cacheDel(availabilityKey(newProvider, dateKey));

  /* Notify patient */
  const [provRows] = await pool.query<RowDataPacket[]>(
    `SELECT name FROM providers WHERE id = ?`,
    [newProvider]
  );
  const newDoctorName = provRows[0]?.name || "your doctor";

  await createNotification({
    userId: appt.patient_user_id,
    type: "APPOINTMENT_RESCHEDULED",
    title: "Appointment Rescheduled",
    body: `Your appointment is now with Dr. ${newDoctorName} on ${formatHuman(
      newScheduledAt
    )}.`,
    link: `/patient/appointments`,
    meta: { appointmentId },
  });

  await writeAuditLog({
    actorId: actor?.actorId ?? userId,
    actorRole: actor?.actorRole ?? "PATIENT",
    action: "APPOINTMENT_RESCHEDULED",
    resourceType: "appointment",
    resourceId: appointmentId,
    ip: actor?.ip ?? null,
    userAgent: actor?.userAgent ?? null,
    success: true,
    reason: `provider=${newProvider} scheduled_at=${newScheduledAt}`,
  });

  return { success: true, status: "RESCHEDULED" };
};

/* ----------------------------------------------------------------
   SHARED — apply impact of an UNAVAILABLE override on existing
   appointments.  Called from BOTH the admin endpoint AND the doctor
   schedule-override endpoint, so behaviour is identical regardless of
   which UI created the override.
-----------------------------------------------------------------*/

export interface UnavailabilityImpactInput {
  providerId: string;
  overrideId: string;
  start_datetime: string;
  end_datetime: string;
  reason?: string | null;
}

export const processUnavailabilityImpact = async (
  input: UnavailabilityImpactInput
) => {
  const {
    providerId,
    overrideId,
    start_datetime,
    end_datetime,
    reason = null,
  } = input;

  const [provRows] = await pool.query<RowDataPacket[]>(
    `SELECT id, name FROM providers WHERE id = ?`,
    [providerId]
  );
  if (provRows.length === 0) {
    return { affectedCount: 0, providerName: null };
  }
  const providerName = provRows[0].name;

  const [affected] = await pool.query<RowDataPacket[]>(
    `
    SELECT a.id, a.scheduled_at, a.payment_status,
           p.user_id AS patient_user_id, u.email,
           p.first_name, p.last_name
      FROM appointments a
      JOIN patients p ON p.id = a.patient_id
      JOIN users u ON u.id = p.user_id
     WHERE a.provider_id = ?
       AND a.status IN ('BOOKED','CONFIRMED','RESCHEDULED')
       AND a.scheduled_at >= ?
       AND a.scheduled_at <  ?
    `,
    [providerId, start_datetime, end_datetime]
  );

  for (const a of affected) {
    await pool.query(
      `UPDATE appointments
          SET status = 'PENDING_REASSIGNMENT',
              unavailability_id = ?
        WHERE id = ?`,
      [overrideId, a.id]
    );

    await cacheDel(availabilityKey(providerId, toDateKey(a.scheduled_at)));

    await createNotification({
      userId: a.patient_user_id,
      type: "PROVIDER_UNAVAILABLE",
      title: "Action needed: Doctor Unavailable",
      body: `Dr. ${providerName} is no longer available on ${formatHuman(
        a.scheduled_at
      )}. Please choose an alternative slot or doctor.`,
      link: `/patient/appointments/${a.id}/alternatives`,
      meta: { appointmentId: a.id, overrideId },
    });

    try {
      await sendProviderUnavailableEmail({
        email: a.email,
        patientName:
          [a.first_name, a.last_name].filter(Boolean).join(" ") || "Patient",
        doctorName: providerName,
        scheduledAt: a.scheduled_at,
        reason: reason ?? null,
        alternativesUrl:
          (process.env.PUBLIC_APP_URL || "http://localhost:5173") +
          `/patient/appointments/${a.id}/alternatives`,
      });
    } catch (e) {
      logger.warn("Unavailability email failed:", (e as Error).message);
    }
  }

  return { affectedCount: affected.length, providerName };
};

/* ----------------------------------------------------------------
   REVERSE the impact when an UNAVAILABLE override is removed before
   patients have acted on it.  Restores PENDING_REASSIGNMENT
   appointments back to CONFIRMED (or BOOKED if unpaid) and notifies
   the patients that no action is needed.
-----------------------------------------------------------------*/

export const reverseUnavailabilityImpact = async (
  overrideId: string
) => {
  /* Find appointments still pending re-assignment caused by this override */
  const [pending] = await pool.query<RowDataPacket[]>(
    `
    SELECT a.id, a.payment_status, a.scheduled_at, a.provider_id,
           p.user_id AS patient_user_id,
           pr.name AS provider_name
      FROM appointments a
      JOIN patients p ON p.id = a.patient_id
      JOIN providers pr ON pr.id = a.provider_id
     WHERE a.unavailability_id = ?
       AND a.status = 'PENDING_REASSIGNMENT'
    `,
    [overrideId]
  );

  for (const a of pending) {
    const restoreStatus =
      a.payment_status === "PAID" ? "CONFIRMED" : "BOOKED";
    await pool.query(
      `UPDATE appointments
          SET status = ?,
              unavailability_id = NULL
        WHERE id = ?`,
      [restoreStatus, a.id]
    );

    await cacheDel(availabilityKey(a.provider_id, toDateKey(a.scheduled_at)));

    await createNotification({
      userId: a.patient_user_id,
      type: "PROVIDER_AVAILABLE_AGAIN",
      title: "Good news — your appointment is back on",
      body: `Dr. ${a.provider_name} is now available again on ${formatHuman(
        a.scheduled_at
      )}. No action is needed.`,
      link: `/patient/appointments`,
      meta: { appointmentId: a.id, overrideId },
    });
  }

  return { restoredCount: pending.length };
};

/* ----------------------------------------------------------------
   ADMIN — mark provider unavailable
   Creates a provider_schedule_overrides row, then runs the shared
   impact cascade.
-----------------------------------------------------------------*/

export interface UnavailabilityInput {
  start_datetime: string;
  end_datetime: string;
  reason?: string | null;
  action_for_existing?: "AUTO_CANCEL" | "WAITLIST" | "ROUTE_COLLEAGUE";
  colleague_provider_id?: string | null;
}

export const markProviderUnavailableService = async (
  providerId: string,
  data: UnavailabilityInput,
  actor?: ActorContext
) => {
  const {
    start_datetime,
    end_datetime,
    reason = null,
    action_for_existing = "WAITLIST",
    colleague_provider_id = null,
  } = data;

  if (!start_datetime || !end_datetime) {
    throw new Error("start_datetime and end_datetime are required");
  }
  if (new Date(start_datetime) >= new Date(end_datetime)) {
    throw new Error("end_datetime must be after start_datetime");
  }

  const [provRows] = await pool.query<RowDataPacket[]>(
    `SELECT id, name FROM providers WHERE id = ?`,
    [providerId]
  );
  if (provRows.length === 0) throw new Error("Provider not found");

  const overrideId = uuid();
  await pool.query(
    `
    INSERT INTO provider_schedule_overrides
      (id, provider_id, override_type, start_datetime, end_datetime,
       reason, action_for_existing, colleague_provider_id)
    VALUES (?, ?, 'UNAVAILABLE', ?, ?, ?, ?, ?)
    `,
    [
      overrideId,
      providerId,
      start_datetime,
      end_datetime,
      reason,
      action_for_existing,
      colleague_provider_id,
    ]
  );

  const { affectedCount } = await processUnavailabilityImpact({
    providerId,
    overrideId,
    start_datetime,
    end_datetime,
    reason,
  });

  await writeAuditLog({
    actorId: actor?.actorId ?? null,
    actorRole: actor?.actorRole ?? "ADMIN",
    action: "PROVIDER_MARKED_UNAVAILABLE",
    resourceType: "provider",
    resourceId: providerId,
    ip: actor?.ip ?? null,
    userAgent: actor?.userAgent ?? null,
    success: true,
    reason: `override=${overrideId} affected=${affectedCount}`,
  });

  return {
    success: true,
    overrideId,
    affectedCount,
  };
};

/* ----------------------------------------------------------------
   ADMIN — list unavailability overrides + their affected appts
-----------------------------------------------------------------*/

export const listUnavailabilitiesService = async () => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT
      o.id,
      o.provider_id,
      o.start_datetime,
      o.end_datetime,
      o.reason,
      o.action_for_existing,
      o.colleague_provider_id,
      o.created_at,
      pr.name AS provider_name,
      pr.specialty,
      (
        SELECT COUNT(*) FROM appointments a
         WHERE a.unavailability_id = o.id
           AND a.status = 'PENDING_REASSIGNMENT'
      ) AS pending_count,
      (
        SELECT COUNT(*) FROM appointments a
         WHERE a.unavailability_id = o.id
      ) AS total_affected
    FROM provider_schedule_overrides o
    JOIN providers pr ON pr.id = o.provider_id
    WHERE o.override_type = 'UNAVAILABLE'
    ORDER BY o.start_datetime DESC
    LIMIT 100
    `
  );
  return rows;
};

export const listAffectedAppointmentsService = async (
  overrideId: string
) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT
      a.id, a.scheduled_at, a.status, a.payment_status,
      a.consultation_fee,
      p.first_name, p.last_name,
      u.email AS patient_email,
      pr.name AS provider_name,
      f.name  AS facility_name
      FROM appointments a
      JOIN patients p ON p.id = a.patient_id
      JOIN users u ON u.id = p.user_id
      JOIN providers pr ON pr.id = a.provider_id
      LEFT JOIN facilities f ON f.id = a.facility_id
     WHERE a.unavailability_id = ?
     ORDER BY a.scheduled_at
    `,
    [overrideId]
  );
  return rows;
};

/* ----------------------------------------------------------------
   PATIENT APPOINTMENTS — enriched list grouped/categorised
-----------------------------------------------------------------*/

export const getPatientAppointmentsService = async (
  userId: string,
  filter: "upcoming" | "completed" | "cancelled" | "all" = "all"
) => {
  const [pat] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM patients WHERE user_id = ? LIMIT 1`,
    [userId]
  );
  if (pat.length === 0) throw new Error("Patient not found");
  const patientId = pat[0].id;

  const where: string[] = ["a.patient_id = ?"];
  const params: unknown[] = [patientId];

  if (filter === "upcoming") {
    where.push(
      "a.status IN ('BOOKED','CONFIRMED','RESCHEDULED','PENDING_REASSIGNMENT','CHECKED_IN','IN_PROGRESS')"
    );
    where.push("a.scheduled_at >= NOW() - INTERVAL 1 DAY");
  } else if (filter === "completed") {
    where.push("a.status = 'COMPLETED'");
  } else if (filter === "cancelled") {
    where.push("a.status IN ('CANCELLED','NO_SHOW')");
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT
      a.id, a.scheduled_at, a.duration_min, a.type, a.status,
      a.consultation_fee, a.payment_status, a.paid_at,
      a.unavailability_id, a.appointment_mode, a.meeting_link,
      pr.id AS provider_id, pr.name AS provider_name,
      pr.specialty AS provider_specialty,
      pr.photo_url AS provider_photo,
      f.id AS facility_id, f.name AS facility_name,
      f.address AS facility_address,
      f.city AS facility_city
    FROM appointments a
    JOIN providers pr ON pr.id = a.provider_id
    LEFT JOIN facilities f ON f.id = a.facility_id
    WHERE ${where.join(" AND ")}
    ORDER BY a.scheduled_at DESC
    LIMIT 100
    `,
    params
  );
  return rows;
};
