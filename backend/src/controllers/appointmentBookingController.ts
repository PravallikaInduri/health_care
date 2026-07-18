import { Response } from "express";
import {
  draftAppointmentService,
  confirmAppointmentService,
  cancelBookingService,
  getAppointmentDetailService,
  getAppointmentAlternativesService,
  reassignAppointmentService,
  markProviderUnavailableService,
  listUnavailabilitiesService,
  listAffectedAppointmentsService,
  getPatientAppointmentsService,
} from "../services/appointmentBookingService";
import type {
  DraftInput,
  ReassignInput,
  UnavailabilityInput,
} from "../services/appointmentBookingService";
import { getAuditContext } from "../utils/auditContext";
import type { AuthenticatedRequest } from "../types/auth";
import { errorMessage, pickId } from "../utils/controllerHelpers";

type AppointmentFilter = "upcoming" | "completed" | "cancelled" | "all";

const isAppointmentFilter = (value: string): value is AppointmentFilter =>
  ["upcoming", "completed", "cancelled", "all"].includes(value);

/* PATIENT: draft an appointment */
export const draftAppointment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await draftAppointmentService(
      req.user.id,
      req.body as unknown as DraftInput,
      getAuditContext(req)
    );
    return res.status(201).json({ success: true, ...result });
  } catch (e) {
    const status = /no longer available/.test(errorMessage(e)) ? 409 : 400;
    return res
      .status(status)
      .json({ success: false, message: errorMessage(e) });
  }
};

/* PATIENT: pay (mock gateway) */
export const payAppointment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await confirmAppointmentService(
      req.user.id,
      pickId(req.params.id),
      req.body ?? {},
      getAuditContext(req)
    );
    return res.status(200).json({ ...result, success: true });
  } catch (e) {
    const status = /Forbidden/.test(errorMessage(e))
      ? 403
      : /not found/i.test(errorMessage(e))
        ? 404
        : 400;
    return res
      .status(status)
      .json({ success: false, message: errorMessage(e) });
  }
};

/* PATIENT: detail */
export const getAppointmentDetail = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await getAppointmentDetailService(
      req.user.id,
      pickId(req.params.id),
      req.user.role
    );
    return res.status(200).json({ success: true, data });
  } catch (e) {
    const status = /Forbidden/.test(errorMessage(e))
      ? 403
      : /not found/i.test(errorMessage(e))
        ? 404
        : 500;
    return res
      .status(status)
      .json({ success: false, message: errorMessage(e) });
  }
};

/* PATIENT/ADMIN: cancel */
export const cancelBooking = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await cancelBookingService(
      req.user.id,
      pickId(req.params.id),
      req.body?.reason ?? null,
      getAuditContext(req)
    );
    return res.status(200).json({ ...result, success: true });
  } catch (e) {
    const status = /Forbidden/.test(errorMessage(e))
      ? 403
      : /not found/i.test(errorMessage(e))
        ? 404
        : 400;
    return res
      .status(status)
      .json({ success: false, message: errorMessage(e) });
  }
};

/* PATIENT: alternatives for PENDING_REASSIGNMENT */
export const getAlternatives = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await getAppointmentAlternativesService(
      req.user.id,
      pickId(req.params.id),
      req.user.role
    );
    return res.status(200).json({ success: true, ...data });
  } catch (e) {
    const status = /Forbidden/.test(errorMessage(e))
      ? 403
      : /not found/i.test(errorMessage(e))
        ? 404
        : 500;
    return res
      .status(status)
      .json({ success: false, message: errorMessage(e) });
  }
};

/* PATIENT: reassign (pick new slot/doctor) */
export const reassignAppointment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await reassignAppointmentService(
      req.user.id,
      pickId(req.params.id),
      req.body as unknown as ReassignInput,
      getAuditContext(req)
    );
    return res.status(200).json({ ...result, success: true });
  } catch (e) {
    const status = /no longer available/.test(errorMessage(e))
      ? 409
      : /Forbidden/.test(errorMessage(e))
        ? 403
        : 400;
    return res
      .status(status)
      .json({ success: false, message: errorMessage(e) });
  }
};

/* PATIENT: my appointments (filtered) */
export const getMyAppointmentsBooking = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const rawFilter = req.query.filter || "all";
    const filter = isAppointmentFilter(rawFilter) ? rawFilter : "all";
    const data = await getPatientAppointmentsService(
      req.user.id,
      filter
    );
    return res.status(200).json({ success: true, data });
  } catch (e) {
    return res
      .status(500)
      .json({ success: false, message: errorMessage(e) });
  }
};

/* ============== ADMIN ============== */

export const markProviderUnavailable = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const result = await markProviderUnavailableService(
      pickId(req.params.id),
      req.body as unknown as UnavailabilityInput,
      getAuditContext(req)
    );
    return res.status(201).json({ ...result, success: true });
  } catch (e) {
    const status = /not found/i.test(errorMessage(e))
      ? 404
      : 400;
    return res
      .status(status)
      .json({ success: false, message: errorMessage(e) });
  }
};

export const listUnavailabilities = async (
  _req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const data = await listUnavailabilitiesService();
    return res.status(200).json({ success: true, data });
  } catch (e) {
    return res
      .status(500)
      .json({ success: false, message: errorMessage(e) });
  }
};

export const listAffectedAppointments = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const data = await listAffectedAppointmentsService(
      pickId(req.params.overrideId)
    );
    return res.status(200).json({ success: true, data });
  } catch (e) {
    return res
      .status(500)
      .json({ success: false, message: errorMessage(e) });
  }
};
