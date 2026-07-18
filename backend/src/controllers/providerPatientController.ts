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

export const getProviderPatients = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const data = await getProviderPatientsService(req.user.id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(providerStatusFor(errorMessage(error))).json({
      success: false,
      message: errorMessage(error)
    });
  }
};

export const getProviderPatientDetail = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const patientId = Array.isArray(req.params.patientId)
      ? req.params.patientId[0]
      : req.params.patientId;

    const data = await getProviderPatientDetailService(
      req.user.id,
      patientId
    );
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(providerStatusFor(errorMessage(error))).json({
      success: false,
      message: errorMessage(error)
    });
  }
};

export const downloadProviderPatientDocument = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const patientId = req.params.patientId;
    const documentId = req.params.documentId;

    const doc = await getProviderPatientDocumentFileService(
      req.user.id,
      patientId,
      documentId
    );

    res.setHeader(
      "Content-Type",
      doc.mime || "application/octet-stream"
    );
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${doc.file_name || "document"}"`
    );
    res.send(doc.file_data);
  } catch (error) {
    res.status(providerStatusFor(errorMessage(error))).json({
      success: false,
      message: errorMessage(error)
    });
  }
};

export const downloadProviderLabResult = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const resultId = req.params.resultId;

    const file = await getProviderLabResultFileService(
      req.user.id,
      resultId
    );

    res.setHeader(
      "Content-Type",
      file.mime || "application/octet-stream"
    );
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${file.file_name || "lab-result"}"`
    );
    res.send(file.file_data);
  } catch (error) {
    res.status(providerStatusFor(errorMessage(error))).json({
      success: false,
      message: errorMessage(error)
    });
  }
};
