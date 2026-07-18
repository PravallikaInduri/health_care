import { Response } from "express";

import {
  uploadDocumentService,
  listDocumentsService,
  getDocumentFileService,
  deleteDocumentService
} from "../services/documentService";
import type { AuthenticatedRequest } from "../types/auth";
import { errorMessage, errorStatus as statusFor } from "../utils/controllerHelpers";

export const uploadDocument = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "A file is required"
      });
    }

    const data = await uploadDocumentService(req.user.id, {
      type: req.body?.type,
      fileName: req.file.originalname,
      mime: req.file.mimetype,
      buffer: req.file.buffer
    });

    return res.status(201).json({ success: true, data });
  } catch (error) {
    return res.status(statusFor(error)).json({
      success: false,
      message: errorMessage(error)
    });
  }
};

export const listDocuments = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await listDocumentsService(req.user.id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(statusFor(error)).json({
      success: false,
      message: errorMessage(error)
    });
  }
};

export const downloadDocument = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;

    const doc = await getDocumentFileService(req.user.id, id);

    res.setHeader(
      "Content-Type",
      doc.mime || "application/octet-stream"
    );
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${doc.file_name || "document"}"`
    );

    return res.send(doc.file_data);
  } catch (error) {
    return res.status(statusFor(error)).json({
      success: false,
      message: errorMessage(error)
    });
  }
};

export const deleteDocument = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;

    await deleteDocumentService(req.user.id, id);
    return res.status(200).json({
      success: true,
      message: "Document deleted"
    });
  } catch (error) {
    return res.status(statusFor(error)).json({
      success: false,
      message: errorMessage(error)
    });
  }
};
