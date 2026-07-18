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

export const createEncounter = async (
  req: AuthenticatedRequest,
  res: Response
) => {

  try {

    const result =
      await createEncounterService(
        req.body
      );

    res.status(201).json(result);

  } catch (error) {

    res.status(500).json({
      message: errorMessage(error)
    });

  }

};

export const createDiagnosis = async (
  req: Request,
  res: Response
) => {

  try {

    const result =
      await createDiagnosisService(
        req.body
      );

    res.status(201).json(result);

  } catch (error) {

    res.status(500).json({
      message: errorMessage(error)
    });

  }

};

export const createPrescription = async (
  req: Request,
  res: Response
) => {

  try {

    const result =
      await createPrescriptionService(
        req.body
      );

    res.status(201).json(result);

  } catch (error) {

    const status =
      /pharmacy_facility_id is required|pharmacy facility does not exist/i.test(
        errorMessage(error)
      )
        ? 400
        : 500;

    res.status(status).json({
      message: errorMessage(error)
    });

  }

};

/**
 * Sprint 12 — list pharmacy facilities so the doctor's Encounter UI
 * can choose where to route a prescription.
 */

export const listPharmacyFacilities = async (
  _req: Request,
  res: Response
) => {
  try {
    const pool = (await import("../config/db")).default;
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, name, address
         FROM facilities
        WHERE type = 'PHARMACY'
        ORDER BY name`
    );
    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ message: errorMessage(error) });
  }
};

export const createLabOrder = async (
  req: Request,
  res: Response
) => {

  try {

    const result =
      await createLabOrderService(
        req.body
      );

    res.status(201).json(result);

  } catch (error) {

    res.status(providerStatusFor(errorMessage(error))).json({
      message: errorMessage(error)
    });

  }

};

export const getMyLabOrders = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const result = await getMyLabOrdersService(req.user.id, {
      search: typeof req.query.search === "string"
        ? req.query.search
        : undefined,
      status: typeof req.query.status === "string"
        ? req.query.status
        : undefined,
      page: req.query.page
        ? Number(req.query.page)
        : undefined,
      limit: req.query.limit
        ? Number(req.query.limit)
        : undefined
    });

    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    const status =
      errorMessage(error) === "Provider not found" ? 404 : 500;
    res.status(status).json({
      success: false,
      message: errorMessage(error)
    });
  }
};

export const getMyLabOrderById = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const id = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;

    const result = await getMyLabOrderByIdService(
      req.user.id,
      id
    );

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    const status =
      errorMessage(error) === "Lab order not found" ||
      errorMessage(error) === "Provider not found"
        ? 404
        : 500;
    res.status(status).json({
      success: false,
      message: errorMessage(error)
    });
  }
};

export const addLabResults = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const id = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;

    const results = Array.isArray(req.body?.results)
      ? req.body.results
      : Array.isArray(req.body)
        ? req.body
        : [];

    const result = await addLabResultsService(
      req.user.id,
      id,
      results
    );

    res.status(201).json({
      success: true,
      ...result
    });
  } catch (error) {
    const status =
      errorMessage(error) === "Lab order not found" ||
      errorMessage(error) === "Provider not found"
        ? 404
        : 400;
    res.status(status).json({
      success: false,
      message: errorMessage(error)
    });
  }
};

/* PROVIDER PRESCRIPTIONS HISTORY (Sprint 6) */

export const getMyPrescriptions = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const result = await getProviderPrescriptionsService(
      req.user.id,
      {
        search:
          typeof req.query.search === "string"
            ? req.query.search
            : undefined,
        status:
          typeof req.query.status === "string"
            ? req.query.status
            : undefined,
        page: req.query.page
          ? Number(req.query.page)
          : undefined,
        limit: req.query.limit
          ? Number(req.query.limit)
          : undefined
      }
    );
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    const status =
      errorMessage(error) === "Provider not found" ? 404 : 500;
    res.status(status).json({
      success: false,
      message: errorMessage(error)
    });
  }
};
