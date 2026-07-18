import { Response } from "express";

import {
  generateBillFromEncounterService,
  listPatientBillsService,
  listPatientAppointmentPaymentsService,
  listPatientLabChargesService,
  listPatientPharmacyChargesService,
  getPatientBillService,
  payBillService
} from "../services/billingService";
import { getAuditContext } from "../utils/auditContext";
import type { AuthenticatedRequest } from "../types/auth";
import { errorMessage, errorStatus as statusFor } from "../utils/controllerHelpers";

export const generateBill = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const encounterId = Array.isArray(req.params.encounterId)
      ? req.params.encounterId[0]
      : req.params.encounterId;

    const data = await generateBillFromEncounterService(
      req.user.id,
      req.user.role,
      encounterId,
      req.body ?? {},
      getAuditContext(req)
    );
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return res.status(statusFor(error)).json({
      success: false,
      message: errorMessage(error)
    });
  }
};

export const listMyBills = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await listPatientBillsService(req.user.id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(statusFor(error)).json({
      success: false,
      message: errorMessage(error)
    });
  }
};

export const listMyAppointmentPayments = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const data = await listPatientAppointmentPaymentsService(req.user.id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(statusFor(error)).json({
      success: false,
      message: errorMessage(error)
    });
  }
};

export const listMyLabCharges = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await listPatientLabChargesService(req.user.id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(statusFor(error)).json({
      success: false,
      message: errorMessage(error)
    });
  }
};

export const listMyPharmacyCharges = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await listPatientPharmacyChargesService(req.user.id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(statusFor(error)).json({
      success: false,
      message: errorMessage(error)
    });
  }
};

export const getMyBill = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;

    const data = await getPatientBillService(req.user.id, id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(statusFor(error)).json({
      success: false,
      message: errorMessage(error)
    });
  }
};

export const payBill = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;

    const data = await payBillService(
      req.user.id,
      id,
      req.body ?? {},
      getAuditContext(req)
    );
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(statusFor(error)).json({
      success: false,
      message: errorMessage(error)
    });
  }
};
