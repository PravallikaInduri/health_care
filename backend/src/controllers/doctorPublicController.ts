import { Response } from "express";

import {
  getDoctorPublicProfileService,
  listDoctorReviewsService,
  createDoctorReviewService,
} from "../services/doctorPublicService";

import { getAuditContext } from "../utils/auditContext";
import type { AuthenticatedRequest } from "../types/auth";
import { errorMessage, pickId } from "../utils/controllerHelpers";

export const getDoctorPublicProfile = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const data = await getDoctorPublicProfileService(
      pickId(req.params.providerId)
    );
    return res.status(200).json({ success: true, data });
  } catch (e) {
    const status = errorMessage(e) === "Doctor not found" ? 404 : 500;
    return res
      .status(status)
      .json({ success: false, message: errorMessage(e) });
  }
};

export const listDoctorReviews = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const result = await listDoctorReviewsService(
      pickId(req.params.providerId),
      req.query.page ? Number(req.query.page) : undefined,
      req.query.limit ? Number(req.query.limit) : undefined
    );
    return res.status(200).json({ success: true, ...result });
  } catch (e) {
    return res
      .status(500)
      .json({ success: false, message: errorMessage(e) });
  }
};

export const createDoctorReview = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (req.user?.role !== "PATIENT") {
      return res.status(403).json({
        success: false,
        message: "Only patients can leave reviews",
      });
    }
    const { rating, review } = req.body ?? {};
    const result = await createDoctorReviewService(
      req.user.id,
      pickId(req.params.providerId),
      rating,
      review ?? null,
      getAuditContext(req)
    );
    return res
      .status(result.updated ? 200 : 201)
      .json({ success: true, ...result });
  } catch (e) {
    const status =
      errorMessage(e) === "Patient not found" ? 404 : 400;
    return res
      .status(status)
      .json({ success: false, message: errorMessage(e) });
  }
};
