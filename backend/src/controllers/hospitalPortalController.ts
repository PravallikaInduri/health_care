import { Response } from "express";
import {
  getHospitalOverviewService,
  getHospitalDoctorsService,
  getHospitalUnitsService,
  createHospitalUnitService,
  updateHospitalUnitService,
  deleteHospitalUnitService,
  getHospitalStaffService,
  createHospitalStaffService,
  updateHospitalStaffService,
  deleteHospitalStaffService,
  getHospitalBillingService,
  updateHospitalDoctorFeeService,
  listHospitalDepartmentsService,
  createHospitalDepartmentService,
  updateHospitalDepartmentService,
  deleteHospitalDepartmentService,
  attachHospitalDepartmentService,
  detachHospitalDepartmentService,
  listHospitalPatientsService,
} from "../services/hospitalPortalService";
import type { AuthenticatedRequest } from "../types/auth";
import { sendError } from "../utils/controllerHelpers";

export const getHospitalOverview = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await getHospitalOverviewService(req.user.id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error, 400);
  }
};

export const getHospitalDoctors = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await getHospitalDoctorsService(
      req.user.id,
      req.query.search
    );
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error, 400);
  }
};

export const getHospitalUnits = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await getHospitalUnitsService(req.user.id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error, 400);
  }
};

export const createHospitalUnit = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await createHospitalUnitService(
      req.user.id,
      req.body as unknown as Parameters<typeof createHospitalUnitService>[1]
    );
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return sendError(res, error, 400);
  }
};

export const updateHospitalUnit = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await updateHospitalUnitService(
      req.user.id,
      req.params.id,
      req.body
    );
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error, 400);
  }
};

export const deleteHospitalUnit = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await deleteHospitalUnitService(req.user.id, req.params.id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error, 400);
  }
};

export const getHospitalStaff = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await getHospitalStaffService(req.user.id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error, 400);
  }
};

export const createHospitalStaff = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await createHospitalStaffService(
      req.user.id,
      req.body as unknown as Parameters<typeof createHospitalStaffService>[1]
    );
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return sendError(res, error, 400);
  }
};

export const updateHospitalStaff = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await updateHospitalStaffService(
      req.user.id,
      req.params.id,
      req.body
    );
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error, 400);
  }
};

export const deleteHospitalStaff = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await deleteHospitalStaffService(req.user.id, req.params.id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error, 400);
  }
};

export const updateHospitalDoctorFee = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await updateHospitalDoctorFeeService(
      req.user.id,
      req.params.id,
      {
        consultation_fee: req.body?.consultation_fee,
        video_consultation_fee: req.body?.video_consultation_fee,
      }
    );
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error, 400);
  }
};

export const getHospitalBilling = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await getHospitalBillingService(req.user.id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error, 400);
  }
};

/* ── Departments ── */
export const listHospitalDepartments = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await listHospitalDepartmentsService(req.user.id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error, 400);
  }
};

export const createHospitalDepartment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await createHospitalDepartmentService(req.user.id, req.body);
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return sendError(res, error, 400);
  }
};

export const updateHospitalDepartment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await updateHospitalDepartmentService(
      req.user.id,
      req.params.deptId,
      req.body
    );
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error, 400);
  }
};

export const deleteHospitalDepartment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await deleteHospitalDepartmentService(
      req.user.id,
      req.params.deptId
    );
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error, 400);
  }
};

export const attachHospitalDepartment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await attachHospitalDepartmentService(req.user.id, req.params.deptId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error, 400);
  }
};

export const detachHospitalDepartment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await detachHospitalDepartmentService(req.user.id, req.params.deptId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error, 400);
  }
};

/* ── Patients ── */
export const listHospitalPatients = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await listHospitalPatientsService(req.user.id, req.query.search);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error, 400);
  }
};
