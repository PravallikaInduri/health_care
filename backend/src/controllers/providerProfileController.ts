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

export const getMyProfile = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {

    const result =
      await getMyProfileService(
        req.user.id
      );  

    res.json(result);

  } catch (error) {

    res.status(500).json({
      message: errorMessage(error)
    });

  }
};

export const updateMyProfile = async (
  req: AuthenticatedRequest,
  res: Response
) => {

  try {

    const result =
      await updateMyProfileService(
        req.user.id,
        req.body
      );

    res.json(result);

  } catch (error) {

    res.status(500).json({
      message: errorMessage(error)
    });

  }

};
