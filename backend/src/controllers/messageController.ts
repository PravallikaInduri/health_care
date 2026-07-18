import { Response } from "express";

import {
  listThreadsService,
  createThreadService,
  getThreadMessagesService,
  sendMessageService,
  editMessageService,
  deleteMessageService
} from "../services/messageService";
import type { AuthenticatedRequest } from "../types/auth";
import { errorMessage, errorStatus as statusFor } from "../utils/controllerHelpers";

export const listThreads = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await listThreadsService(
      req.user.id,
      req.user.role
    );
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(statusFor(error)).json({
      success: false,
      message: errorMessage(error)
    });
  }
};

export const createThread = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await createThreadService(
      req.user.id,
      req.user.role,
      req.body ?? {}
    );
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return res.status(statusFor(error)).json({
      success: false,
      message: errorMessage(error)
    });
  }
};

export const getThreadMessages = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;

    const data = await getThreadMessagesService(
      req.user.id,
      req.user.role,
      id
    );
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(statusFor(error)).json({
      success: false,
      message: errorMessage(error)
    });
  }
};

export const sendMessage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;

    const data = await sendMessageService(
      req.user.id,
      req.user.role,
      id,
      req.body?.body
    );
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return res.status(statusFor(error)).json({
      success: false,
      message: errorMessage(error)
    });
  }
};

export const editMessage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const messageId = Array.isArray(req.params.messageId)
      ? req.params.messageId[0]
      : req.params.messageId;

    const data = await editMessageService(
      req.user.id,
      req.user.role,
      messageId,
      req.body?.body
    );
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(statusFor(error)).json({
      success: false,
      message: errorMessage(error)
    });
  }
};

export const deleteMessage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const messageId = Array.isArray(req.params.messageId)
      ? req.params.messageId[0]
      : req.params.messageId;

    const data = await deleteMessageService(
      req.user.id,
      req.user.role,
      messageId
    );
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(statusFor(error)).json({
      success: false,
      message: errorMessage(error)
    });
  }
};
