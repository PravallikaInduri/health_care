import { Response } from "express";
import {
  getLabMeService,
  getLabOrdersService,
  updateLabOrderStatusService,
  getLabResultFileService,
  uploadLabResultService,
  listLabTestsService,
  createLabTestService,
  updateLabTestService,
  deleteLabTestService,
  markLabOrderPaidService,
} from "../services/labService";
import type { AuthenticatedRequest } from "../types/auth";
import { errorMessage } from "../utils/controllerHelpers";

export const getLabMe = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await getLabMeService(req.user.id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(400).json({ success: false, message: errorMessage(error) });
  }
};

export const getLabOrders = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await getLabOrdersService(req.user.id, req.query.status);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(400).json({ success: false, message: errorMessage(error) });
  }
};

export const updateLabOrderStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await updateLabOrderStatusService(
      req.user.id,
      req.params.id,
      req.body.status
    );
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(400).json({ success: false, message: errorMessage(error) });
  }
};

export const uploadLabResult = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });
    }
    const data = await uploadLabResultService(req.user.id, req.params.id, {
      fileName: req.file.originalname,
      mime: req.file.mimetype,
      buffer: req.file.buffer,
      testName: req.body.test_name || null,
      note: req.body.note || null,
    });
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return res.status(400).json({ success: false, message: errorMessage(error) });
  }
};

export const markLabOrderPaid = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await markLabOrderPaidService(req.user.id, req.params.id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(400).json({ success: false, message: errorMessage(error) });
  }
};

export const listLabTests = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await listLabTestsService(req.user.id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(400).json({ success: false, message: errorMessage(error) });
  }
};

export const createLabTest = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await createLabTestService(req.user.id, {
      name: req.body.name,
      price: req.body.price,
    });
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return res.status(400).json({ success: false, message: errorMessage(error) });
  }
};

export const updateLabTest = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await updateLabTestService(req.user.id, req.params.id, {
      name: req.body.name,
      price: req.body.price,
      is_active: req.body.is_active,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(400).json({ success: false, message: errorMessage(error) });
  }
};

export const deleteLabTest = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await deleteLabTestService(req.user.id, req.params.id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(400).json({ success: false, message: errorMessage(error) });
  }
};

export const downloadLabResult = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const file = await getLabResultFileService(req.user.id, req.params.id);
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
    return res.status(400).json({ success: false, message: errorMessage(error) });
  }
};
