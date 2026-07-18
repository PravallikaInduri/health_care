import type { Response } from "express";
import {
  deleteLabReportService,
  getLabReportFileService,
  getLabReportService,
  getLabReportStatsService,
  listDoctorLabReportsService,
  listMyPatientLabReportsService,
  listPatientLabReportsService,
  updateLabReportService,
  uploadLabReportService,
} from "../services/labReportService";
import type { AuthenticatedRequest } from "../types/auth";
import { errorMessage, errorStatus } from "../utils/controllerHelpers";
import { getAuditContext } from "../utils/auditContext";

const queryValue = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

export const uploadLabReport = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No PDF uploaded" });
    }
    const data = await uploadLabReportService(
      req.user.id,
      {
        labOrderId: queryValue(req.body.lab_order_id),
        patientId: queryValue(req.body.patient_id),
        appointmentId: queryValue(req.body.appointment_id),
        encounterId: queryValue(req.body.encounter_id),
        labTestId: queryValue(req.body.lab_test_id),
        reportName: queryValue(req.body.report_name) || req.file.originalname,
        remarks: queryValue(req.body.remarks),
        status: queryValue(req.body.status) || "UPLOADED",
        fileName: req.file.originalname,
        mime: req.file.mimetype,
        buffer: req.file.buffer,
      },
      getAuditContext(req)
    );
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return res
      .status(errorStatus(error, 400))
      .json({ success: false, message: errorMessage(error) });
  }
};

export const updateLabReport = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const data = await updateLabReportService(
      req.user.id,
      req.params.id,
      {
        status: queryValue(req.body.status),
        remarks: queryValue(req.body.remarks),
        reportName: queryValue(req.body.report_name),
      },
      getAuditContext(req)
    );
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res
      .status(errorStatus(error, 400))
      .json({ success: false, message: errorMessage(error) });
  }
};

export const getLabReport = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const data = await getLabReportService(req.user.id, req.user.role, req.params.id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res
      .status(errorStatus(error, 404))
      .json({ success: false, message: errorMessage(error) });
  }
};

export const downloadLabReport = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const file = await getLabReportFileService(
      req.user.id,
      req.user.role,
      req.params.id,
      getAuditContext(req)
    );
    res.setHeader("Content-Type", file.mime || "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${file.report_name || "lab-report.pdf"}"`
    );
    return res.send(file.report_file_data);
  } catch (error) {
    return res
      .status(errorStatus(error, 404))
      .json({ success: false, message: errorMessage(error) });
  }
};

export const listPatientLabReports = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const data = await listPatientLabReportsService(
      req.user.id,
      req.user.role,
      req.params.id,
      {
        search: queryValue(req.query.search),
        status: queryValue(req.query.status),
        from: queryValue(req.query.from),
        to: queryValue(req.query.to),
      }
    );
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res
      .status(errorStatus(error, 403))
      .json({ success: false, message: errorMessage(error) });
  }
};

export const listMyPatientLabReports = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const data = await listMyPatientLabReportsService(req.user.id, {
      search: queryValue(req.query.search),
      status: queryValue(req.query.status),
      from: queryValue(req.query.from),
      to: queryValue(req.query.to),
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res
      .status(errorStatus(error, 403))
      .json({ success: false, message: errorMessage(error) });
  }
};

export const listDoctorLabReports = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const data = await listDoctorLabReportsService(req.user.id, req.params.id, {
      search: queryValue(req.query.search),
      status: queryValue(req.query.status),
      from: queryValue(req.query.from),
      to: queryValue(req.query.to),
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res
      .status(errorStatus(error, 403))
      .json({ success: false, message: errorMessage(error) });
  }
};

export const deleteLabReport = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const data = await deleteLabReportService(
      req.user.id,
      req.user.role,
      req.params.id,
      getAuditContext(req)
    );
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res
      .status(errorStatus(error, 403))
      .json({ success: false, message: errorMessage(error) });
  }
};

export const getLabReportStats = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const data = await getLabReportStatsService(req.user.id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res
      .status(errorStatus(error, 400))
      .json({ success: false, message: errorMessage(error) });
  }
};
