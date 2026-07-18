import { Request, Response } from "express";

import {
  getPharmacyStatsService,
  getPharmacyMeService,
  listPrescriptionsService,
  getPrescriptionByIdService,
  dispensePrescriptionService,
  listRefillRequestsService,
  dispenseRefillRequestService,
  searchMedicationsService,
  listPharmacyMedicinesService,
  addPharmacyMedicineService,
  updatePharmacyMedicineService,
  deletePharmacyMedicineService,
  markPrescriptionPaidService
} from "../services/prescriptionService";

import { getAuditContext } from "../utils/auditContext";
import { getPharmacistFacilityIds } from "../utils/identity";
import type { AuthenticatedRequest } from "../types/auth";
import { errorMessage, errorStatus, pickId } from "../utils/controllerHelpers";

export const getPharmacyMe = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const role = req.user?.role;
    if (role !== "PHARMACY") {
      return res.status(403).json({
        success: false,
        message: `This page is for pharmacy staff. You are signed in as ${role}.`
      });
    }

    const data = await getPharmacyMeService(req.user.id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    const status =
      errorMessage(error) === "Account not found" ? 404 : 500;
    return res.status(status).json({
      success: false,
      message: errorMessage(error) || "Internal Server Error"
    });
  }
};

export const getPharmacyStats = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const stats = await getPharmacyStatsService(req.user.id);
    return res.status(200).json({ success: true, data: stats });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: errorMessage(error)
    });
  }
};

export const listPrescriptions = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    /* Sprint 12: lock the query to the pharmacist's assigned facilities. */
    const pharmacyFacilityIds = await getPharmacistFacilityIds(
      req.user.id
    );

    const result = await listPrescriptionsService({
      search:
        typeof req.query.search === "string"
          ? req.query.search
          : undefined,
      status:
        typeof req.query.status === "string"
          ? req.query.status
          : undefined,
      patientId:
        typeof req.query.patientId === "string"
          ? req.query.patientId
          : undefined,
      providerId:
        typeof req.query.providerId === "string"
          ? req.query.providerId
          : undefined,
      pharmacyFacilityIds,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined
    });
    return res.status(200).json({
      success: true,
      assigned: pharmacyFacilityIds.length > 0,
      ...result
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: errorMessage(error)
    });
  }
};

export const getPrescriptionById = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const id = pickId(req.params.id);
    const pharmacyFacilityIds = await getPharmacistFacilityIds(
      req.user.id
    );
    const data = await getPrescriptionByIdService(
      id,
      pharmacyFacilityIds
    );
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(errorStatus(error)).json({
      success: false,
      message: errorMessage(error)
    });
  }
};

export const dispensePrescription = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const id = pickId(req.params.id);
    const result = await dispensePrescriptionService(
      id,
      req.user.id,
      getAuditContext(req)
    );
    return res.status(200).json({
      ...result,
      message: "Prescription dispensed"
    });
  } catch (error) {
    return res.status(errorStatus(error)).json({
      success: false,
      message: errorMessage(error)
    });
  }
};

export const listRefillRequests = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const pharmacyFacilityIds = await getPharmacistFacilityIds(
      req.user.id
    );
    const result = await listRefillRequestsService({
      search:
        typeof req.query.search === "string"
          ? req.query.search
          : undefined,
      status:
        typeof req.query.status === "string"
          ? req.query.status
          : undefined,
      pharmacyFacilityIds,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined
    });
    return res.status(200).json({
      success: true,
      assigned: pharmacyFacilityIds.length > 0,
      ...result
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: errorMessage(error)
    });
  }
};

export const dispenseRefillRequest = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const id = pickId(req.params.id);

    const result = await dispenseRefillRequestService(
      id,
      req.user.id,
      getAuditContext(req)
    );

    return res.status(200).json({
      ...result,
      message: "Refill dispensed"
    });
  } catch (error) {
    return res.status(errorStatus(error)).json({
      success: false,
      message: errorMessage(error)
    });
  }
};

export const markPrescriptionPaid = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = pickId(req.params.id);
    const result = await markPrescriptionPaidService(id, req.user.id);
    return res.status(200).json({
      ...result,
      message: "Payment recorded"
    });
  } catch (error) {
    return res.status(errorStatus(error, 400)).json({
      success: false,
      message: errorMessage(error)
    });
  }
};

export const listPharmacyMedicines = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await listPharmacyMedicinesService(req.user.id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(400).json({ success: false, message: errorMessage(error) });
  }
};

export const addPharmacyMedicine = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await addPharmacyMedicineService(req.user.id, {
      name: req.body.name,
      price: req.body.price,
      quantity: req.body.quantity
    });
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return res.status(400).json({ success: false, message: errorMessage(error) });
  }
};

export const updatePharmacyMedicine = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await updatePharmacyMedicineService(
      req.user.id,
      pickId(req.params.id),
      {
        price: req.body.price,
        quantity: req.body.quantity,
        is_active: req.body.is_active
      }
    );
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(400).json({ success: false, message: errorMessage(error) });
  }
};

export const deletePharmacyMedicine = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await deletePharmacyMedicineService(
      req.user.id,
      pickId(req.params.id)
    );
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(400).json({ success: false, message: errorMessage(error) });
  }
};

export const searchMedications = async (
  req: Request,
  res: Response
) => {
  try {
    const data = await searchMedicationsService(
      typeof req.query.q === "string" ? req.query.q : undefined,
      req.query.limit ? Number(req.query.limit) : undefined
    );
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: errorMessage(error)
    });
  }
};
