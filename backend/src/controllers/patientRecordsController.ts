
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

export const getEncounters = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const patient = await getPatientProfile(
      req.user.id
    );

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found"
      });
    }

    const { search, page, limit } = req.query;

    const result = await getPatientEncounters(patient.id, {
      search: search as string | undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined
    });

    return res.status(200).json({
      success: true,
      ...result
    });

  } catch (error) {
    logger.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};

export const getEncounterById = async (
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

    const data = await getPatientEncounterById(
      patient.id,
      id
    );

    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    const status =
      errorMessage(error) === "Encounter not found" ? 404 : 500;
    return res.status(status).json({
      success: false,
      message: errorMessage(error)
    });
  }
};

export const getLabs = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const patient = await getPatientProfile(
      req.user.id
    );

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found"
      });
    }

    const { search, page, limit } = req.query;

    const result = await getPatientLabs(patient.id, {
      search: search as string | undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined
    });

    return res.status(200).json({
      success: true,
      ...result
    });

  } catch (error) {
    logger.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};

export const getLabReportById = async (
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

    const data = await getPatientLabOrderById(
      patient.id,
      id
    );

    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    const status =
      errorMessage(error) === "Lab report not found" ? 404 : 500;
    return res.status(status).json({
      success: false,
      message: errorMessage(error)
    });
  }
};

export const uploadLabResult = async (
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

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "A file is required"
      });
    }

    const id = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;

    const data = await uploadLabResultService(patient.id, id, {
      fileName: req.file.originalname,
      mime: req.file.mimetype,
      buffer: req.file.buffer,
      testName: req.body?.test_name,
      note: req.body?.note
    });

    return res.status(201).json({ success: true, data });
  } catch (error) {
    const status = /not found/i.test(errorMessage(error)) ? 404 : 500;
    return res.status(status).json({
      success: false,
      message: errorMessage(error)
    });
  }
};

export const downloadLabResult = async (
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

    const resultId = Array.isArray(req.params.resultId)
      ? req.params.resultId[0]
      : req.params.resultId;

    const file = await getPatientLabResultFileService(
      patient.id,
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
    return res.send(file.file_data);
  } catch (error) {
    const status = /not found/i.test(errorMessage(error)) ? 404 : 500;
    return res.status(status).json({
      success: false,
      message: errorMessage(error)
    });
  }
};

export const getMyPrescriptions = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const data = await getPatientPrescriptionsService(
      req.user.id
    );
    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    const status =
      errorMessage(error) === "Patient not found" ? 404 : 500;
    return res.status(status).json({
      success: false,
      message: errorMessage(error)
    });
  }
};

export const requestRefill = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const id = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;

    const result = await requestRefillService(
      req.user.id,
      id,
      getAuditContext(req)
    );
    return res.status(201).json({
      ...result,
      message: "Refill requested"
    });
  } catch (error) {
    const status =
      errorMessage(error) === "Patient not found" ||
      errorMessage(error) === "Prescription not found"
        ? 404
        : /No refills remaining|already pending|does not belong/.test(
              errorMessage(error)
            )
          ? 400
          : 500;
    return res.status(status).json({
      success: false,
      message: errorMessage(error)
    });
  }
};
