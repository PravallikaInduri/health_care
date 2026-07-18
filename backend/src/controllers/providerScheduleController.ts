import { Request, Response } from "express";
import type { RowDataPacket } from "mysql2";

import {
  getMyProfileService,
  updateMyProfileService,
  createScheduleService,
  getSchedulesService,
  updateScheduleService,
  deleteScheduleService,
  createOverrideService,
  getOverridesService,
  deleteOverrideService,
  createEncounterService,
  createDiagnosisService,
  createPrescriptionService,
  createLabOrderService,
  getMyLabOrdersService,
  getMyLabOrderByIdService,
  addLabResultsService,
  getProviderAvailabilityService,
  getProviderAppointmentsService,
  updateAppointmentStatusService,
  getProviderPatientsService,
  getProviderPatientDetailService,
  getProviderPatientDocumentFileService,
  getProviderLabResultFileService,
} from "../services/providerService";

import { getProviderPrescriptionsService } from "../services/prescriptionService";
import type { AuthenticatedRequest } from "../types/auth";
import { errorMessage } from "../utils/controllerHelpers";

const providerStatusFor = (message: string) => {
  if (/not under your care/i.test(message)) return 403;
  if (/not found/i.test(message)) return 404;
  if (/required/i.test(message)) return 400;
  return 500;
};

export const createSchedule = async (
  req: AuthenticatedRequest,
  res: Response
) => {

  try {

    const result =
      await createScheduleService(
        req.user.id,
        req.body as unknown as Parameters<typeof createScheduleService>[1]
      );

    res.status(201).json(result);

  } catch (error) {

    res.status(500).json({
      message: errorMessage(error)
    });

  }

};

export const getSchedules = async (
  req: AuthenticatedRequest,
  res: Response
) => {

  try {

    const result =
      await getSchedulesService(
        req.user.id
      );

    res.json(result);

  } catch (error) {

    res.status(500).json({
      message: errorMessage(error)
    });

  }

};

export const updateSchedule = async (
  req: AuthenticatedRequest,
  res: Response
) => {

  try {

    const result =
      await updateScheduleService(
        req.params.id,
        req.body
      );

    res.json(result);

  } catch (error) {

    res.status(500).json({
      message: errorMessage(error)
    });

  }

};

export const deleteSchedule = async (
  req: AuthenticatedRequest,
  res: Response
) => {

  try {

    const result =
      await deleteScheduleService(
        req.params.id
      );

    res.json(result);

  } catch (error) {

    res.status(500).json({
      message: errorMessage(error)
    });

  }

};

export const createOverride = async (
  req: AuthenticatedRequest,
  res: Response
) => {

  try {

    const result =
      await createOverrideService(
        req.user.id,
        req.body
      );

    res.status(201).json(result);

  } catch (error) {

    res.status(500).json({
      message: errorMessage(error)
    });

  }

};

export const getOverrides = async (
  req: AuthenticatedRequest,
  res: Response
) => {

  try {

    const result =
      await getOverridesService(
        req.user.id
      );

    res.json(result);

  } catch (error) {

    res.status(500).json({
      message: errorMessage(error)
    });

  }

};

export const deleteOverride = async (
  req: AuthenticatedRequest,
  res: Response
) => {

  try {

    const result =
      await deleteOverrideService(
        req.params.id
      );

    res.json(result);

  } catch (error) {

    res.status(500).json({
      message: errorMessage(error)
    });

  }

};

export const getProviderAvailability = async (
  req: AuthenticatedRequest,
  res: Response
) => {

  try {

    const result =
      await getProviderAvailabilityService(
        req.params.id,
        req.query.date || ""
      );

    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {

    res.status(500).json({
      message: errorMessage(error)
    });

  }

};

export const getProviderAppointments = async (
  req: AuthenticatedRequest,
  res: Response
) => {

  try {

    const result =
      await getProviderAppointmentsService(
        req.user.id
      );

    res.status(200).json(result);

  } catch (error) {

    res.status(500).json({
      message: errorMessage(error)
    });

  }

};

export const updateAppointmentStatus = async (
  req: AuthenticatedRequest,
  res: Response
) => {

  try {

    const result =
      await updateAppointmentStatusService(
        req.user.id,
        req.params.id,
        req.body.status
      );

    res.status(200).json(result);

  } catch (error) {

    res.status(500).json({
      message: errorMessage(error)
    });

  }

};

/* ----------------------------------------------------------------
   PROVIDER LAB ORDERS
-----------------------------------------------------------------*/
