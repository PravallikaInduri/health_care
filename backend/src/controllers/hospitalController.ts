import { Request, Response } from "express";

import {
  listHospitalsService,
  getHospitalByIdService,
  getHospitalDepartmentsService,
  getHospitalDepartmentDoctorsService,
  getDepartmentByIdService,
} from "../services/hospitalService";
import { errorMessage, pickId } from "../utils/controllerHelpers";

export const listHospitals = async (
  req: Request,
  res: Response
) => {
  try {
    const result = await listHospitalsService({
      search:
        typeof req.query.search === "string"
          ? req.query.search
          : undefined,
      city:
        typeof req.query.city === "string"
          ? req.query.city
          : undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });
    return res.status(200).json({ success: true, ...result });
  } catch (e) {
    return res
      .status(500)
      .json({ success: false, message: errorMessage(e) });
  }
};

export const getHospitalById = async (
  req: Request,
  res: Response
) => {
  try {
    const data = await getHospitalByIdService(pickId(req.params.id));
    return res.status(200).json({ success: true, data });
  } catch (e) {
    const status = errorMessage(e) === "Hospital not found" ? 404 : 500;
    return res
      .status(status)
      .json({ success: false, message: errorMessage(e) });
  }
};

export const getHospitalDepartments = async (
  req: Request,
  res: Response
) => {
  try {
    const data = await getHospitalDepartmentsService(
      pickId(req.params.id)
    );
    return res.status(200).json({ success: true, data });
  } catch (e) {
    return res
      .status(500)
      .json({ success: false, message: errorMessage(e) });
  }
};

export const getHospitalDepartmentDoctors = async (
  req: Request,
  res: Response
) => {
  try {
    const result = await getHospitalDepartmentDoctorsService(
      pickId(req.params.id),
      pickId(req.params.deptId),
      {
        search:
          typeof req.query.search === "string"
            ? req.query.search
            : undefined,
        page: req.query.page
          ? Number(req.query.page)
          : undefined,
        limit: req.query.limit
          ? Number(req.query.limit)
          : undefined,
      }
    );

    /* Also return the hospital + department headers for breadcrumbs */
    const [hospital, department] = await Promise.all([
      getHospitalByIdService(pickId(req.params.id)).catch(
        () => null
      ),
      getDepartmentByIdService(pickId(req.params.deptId)).catch(
        () => null
      ),
    ]);

    return res.status(200).json({
      success: true,
      hospital,
      department,
      ...result,
    });
  } catch (e) {
    return res
      .status(500)
      .json({ success: false, message: errorMessage(e) });
  }
};
