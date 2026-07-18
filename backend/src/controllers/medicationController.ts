import { Response } from "express";

import {
  listMedicationsService,
  createMedicationService
} from "../services/medicationService";
import type { AuthenticatedRequest } from "../types/auth";
import { errorMessage } from "../utils/controllerHelpers";

export const listMedications = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await listMedicationsService(
      req.query.search as string | undefined
    );
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: errorMessage(error)
    });
  }
};

export const createMedication = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await createMedicationService(req.body ?? {});
    return res.status(201).json({ success: true, data });
  } catch (error) {
    const status = /required/i.test(errorMessage(error)) ? 400 : 500;
    return res.status(status).json({
      success: false,
      message: errorMessage(error)
    });
  }
};
