
import { Response } from "express";

import {
  getPatientProfile,
  updatePatientProfile,
  addEmergencyContact,
  addDependent,
  addInsurance,
  getPatientEncounters,
  getPatientEncounterById,
  getPatientLabs,
  getPatientLabOrderById,
  uploadLabResultService,
  getPatientLabResultFileService,
  getPatientInsurance,
  updatePatientInsurance,
  deletePatientInsurance,
  getDependents,
  getEmergencyContacts
} from "../services/patientService";

import {
  getPatientPrescriptionsService,
  requestRefillService
} from "../services/prescriptionService";

import { getAuditContext } from "../utils/auditContext";
import type { AuthenticatedRequest } from "../types/auth";
import { logger } from "../utils/logger";
import { errorMessage } from "../utils/controllerHelpers";

export const createInsurance = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const patient = await getPatientProfile(
      req.user.id
    );

    const {
      payer,
      member_id,
      group_no,
      valid_from,
      valid_to
    } = req.body;

    await addInsurance(
      patient.id,
      payer,
      member_id,
      group_no,
      valid_from,
      valid_to
    );

    return res.status(201).json({
      success: true,
      message: "Insurance added successfully"
    });

  } catch (error) {
    logger.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};

export const getInsurance = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const patient = await getPatientProfile(req.user.id);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found"
      });
    }

    const data = await getPatientInsurance(patient.id);

    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    logger.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};

export const updateInsurance = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const patient = await getPatientProfile(req.user.id);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found"
      });
    }

    const id = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;

    await updatePatientInsurance(
      patient.id,
      id,
      req.body ?? {}
    );

    return res.status(200).json({
      success: true,
      message: "Insurance updated"
    });
  } catch (error) {
    const status =
      errorMessage(error) === "Insurance not found"
        ? 404
        : /No fields/i.test(errorMessage(error))
          ? 400
          : 500;
    return res.status(status).json({
      success: false,
      message: errorMessage(error)
    });
  }
};

export const deleteInsurance = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const patient = await getPatientProfile(req.user.id);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found"
      });
    }

    const id = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;

    await deletePatientInsurance(patient.id, id);

    return res.status(200).json({
      success: true,
      message: "Insurance deleted"
    });
  } catch (error) {
    const status =
      errorMessage(error) === "Insurance not found" ? 404 : 500;
    return res.status(status).json({
      success: false,
      message: errorMessage(error)
    });
  }
};
