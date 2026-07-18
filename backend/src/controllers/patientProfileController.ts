
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

export const getProfile = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    if (role && role !== "PATIENT") {
      return res.status(403).json({
        success: false,
        message: `This page is for patients only. You are signed in as ${role}.`
      });
    }

    const patient = await getPatientProfile(userId);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message:
          "No patient record is linked to your account. Please log out and sign in with a patient account."
      });
    }

    return res.status(200).json({
      success: true,
      data: patient
    });

  } catch (error) {
    logger.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};

export const updateProfile = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user.id;

    const { phone, email, photo_url } = req.body;

    await updatePatientProfile(
      userId,
      phone,
      email,
      photo_url
    );

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully"
    });

  } catch (error) {
    logger.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};

export const createEmergencyContact = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const patient = await getPatientProfile(
      req.user.id
    );

    const {
      name,
      relationship,
      phone
    } = req.body;

    await addEmergencyContact(
      patient.id,
      name,
      relationship,
      phone
    );

    return res.status(201).json({
      success: true,
      message: "Emergency contact added successfully"
    });

  } catch (error) {
    logger.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};

export const createDependent = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const patient = await getPatientProfile(
      req.user.id
    );

    const {
      first_name,
      last_name,
      dob,
      relationship,
      proxy_consent
    } = req.body;

    await addDependent(
      patient.id,
      first_name,
      last_name,
      dob,
      relationship,
      proxy_consent
    );

    return res.status(201).json({
      success: true,
      message: "Dependent added successfully"
    });

  } catch (error) {
    logger.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};

export const getMyDependents = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {

    const patient =
      await getPatientProfile(
        req.user.id
      );

    const dependents =
      await getDependents(
        patient.id
      );

    return res.status(200).json({
      success: true,
      data: dependents
    });

  } catch (error) {

    logger.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });

  }
};

export const getMyEmergencyContacts = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {

    const patient =
      await getPatientProfile(
        req.user.id
      );

    const contacts =
      await getEmergencyContacts(
        patient.id
      );

    return res.status(200).json({
      success: true,
      data: contacts
    });

  } catch (error) {

    logger.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });

  }
};

/* PATIENT PRESCRIPTIONS (Sprint 6) */
