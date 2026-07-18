import { Response } from "express";

import {
  listPatientPrescriptionsService,
  createRefillRequestService,
  listPatientRefillsService,
  listProviderRefillsService,
  decideRefillRequestService
} from "../services/refillService";
import { getAuditContext } from "../utils/auditContext";
import type { AuthenticatedRequest } from "../types/auth";
import { errorMessage, errorStatus as statusFor } from "../utils/controllerHelpers";

export const listMyPrescriptions = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await listPatientPrescriptionsService(req.user.id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(statusFor(error)).json({
      success: false,
      message: errorMessage(error)
    });
  }
};

export const createRefillRequest = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prescriptionId =
      req.params.prescriptionId ?? req.body?.prescription_id;

    const data = await createRefillRequestService(
      req.user.id,
      prescriptionId
    );
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return res.status(statusFor(error)).json({
      success: false,
      message: errorMessage(error)
    });
  }
};

export const listMyRefills = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await listPatientRefillsService(req.user.id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(statusFor(error)).json({
      success: false,
      message: errorMessage(error)
    });
  }
};

export const listProviderRefills = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await listProviderRefillsService(
      req.user.id,
      req.query.status as string | undefined
    );
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(statusFor(error)).json({
      success: false,
      message: errorMessage(error)
    });
  }
};

export const decideRefill = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;

    const data = await decideRefillRequestService(
      req.user.id,
      id,
      req.body?.status,
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
