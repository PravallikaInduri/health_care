import { Request, Response } from "express";

import {
  getAdminStatsService,
  getPendingDoctorsService,
  getDoctorByIdService,
  approveDoctorService,
  rejectDoctorService,
  getDoctorDocumentService,
  getPendingHospitalsService,
  approveHospitalService,
  rejectHospitalService,
  getHospitalDocumentService,
  listDoctorsService,
  listPatientsService,
  getPatientFullProfileService,
  getDoctorScheduleService,
  listFacilitiesService,
  getFacilityByIdService,
  getFacilityWithProvidersService,
  getAssignableProvidersForFacilityService,
  createFacilityService,
  updateFacilityService,
  deleteFacilityService,
  listProviderFacilitiesAdminService,
  assignFacilityToProviderService,
  removeFacilityFromProviderService,
  listDepartmentsService,
  getDepartmentByIdAdminService,
  createDepartmentService,
  updateDepartmentService,
  deleteDepartmentService,
  listFacilityDepartmentsAdminService,
  listDepartmentFacilitiesAdminService,
  attachDepartmentToFacilityService,
  detachDepartmentFromFacilityService,
  listProviderDepartmentsAdminService,
  attachDepartmentToProviderService,
  detachDepartmentFromProviderService
} from "../services/adminService";
import { getAuditLogsService } from "../services/auditService";
import { getAuditContext } from "../utils/auditContext";
import { errorMessage, errorStatus, pickId } from "../utils/controllerHelpers";

const safeFileName = (value: unknown, fallback: string) =>
  String(value || fallback).replace(/[\\r\\n"]/g, "_");

const streamVerificationDocument = (
  res: Response,
  document: Record<string, unknown>,
  fallbackName: string
) => {
  const fileData = document.file_data as Buffer | Uint8Array | null | undefined;
  if (!fileData) {
    return res.status(404).json({
      success: false,
      message: "Document not found."
    });
  }

  const mimeType =
    typeof document.mime_type === "string"
      ? document.mime_type
      : "application/octet-stream";
  res.setHeader("Content-Type", mimeType);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="${safeFileName(document.file_name, fallbackName)}"`
  );
  res.setHeader("Cache-Control", "private, max-age=60");
  return res.send(fileData);
};


export const getAdminStats = async (
  req: Request,
  res: Response
) => {
  try {

    const stats = await getAdminStatsService();

    return res.status(200).json({
      success: true,
      data: stats
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: errorMessage(error)
    });

  }
};


export const getAuditLogs = async (
  req: Request,
  res: Response
) => {
  try {

    const {
      actorId,
      patientId,
      action,
      from,
      to,
      page,
      limit
    } = req.query;

    const result = await getAuditLogsService({
      actorId: actorId as string,
      patientId: patientId as string,
      action: action as string,
      from: from as string,
      to: to as string,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined
    });

    return res.status(200).json({
      success: true,
      ...result
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: errorMessage(error)
    });

  }
};


export const getPendingDoctors = async (
  req: Request,
  res: Response
) => {
  try {

    const doctors =
      await getPendingDoctorsService();

    return res.status(200).json({
      success: true,
      count: doctors.length,
      data: doctors
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: errorMessage(error)
    });

  }
};


export const getDoctorById = async (
  req: Request,
  res: Response
) => {
  try {

    const id = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Doctor id is required"
      });
    }

    const doctor = await getDoctorByIdService(id);

    return res.status(200).json({
      success: true,
      data: doctor
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: errorMessage(error)
    });

  }
};


export const approveDoctor = async (
  req: Request,
  res: Response
) => {
  try {

    const id = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Doctor id is required"
      });
    }

    const result = await approveDoctorService(
      id,
      getAuditContext(req)
    );

    return res.status(200).json({
      success: true,
      message:
        "Doctor approved successfully",
      data: result
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: errorMessage(error)
    });

  }
};


export const rejectDoctor = async (
  req: Request,
  res: Response
) => {
  try {

    const { reason } = req.body;

    const id = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Doctor id is required"
      });
    }

    if (!reason) {
      return res.status(400).json({
        success: false,
        message:
          "Rejection reason is required"
      });
    }

    const result = await rejectDoctorService(
      id,
      reason,
      getAuditContext(req)
    );

    return res.status(200).json({
      success: true,
      message:
        "Doctor rejected successfully",
      data: result
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: errorMessage(error)
    });

  }
};


export const getDoctorDocument = async (
  req: Request,
  res: Response
) => {
  try {

    const id = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Doctor id is required"
      });
    }

    const document = await getDoctorDocumentService(id);

    return streamVerificationDocument(
      res,
      document,
      "doctor-verification-document"
    );

  } catch (error) {

    return res.status(errorStatus(error, 404)).json({
      success: false,
      message: errorMessage(error)
    });

  }
};


/* ----------------------------------------------------------------
   SPRINT 9 — Hospital registration verification handlers
-----------------------------------------------------------------*/

export const getPendingHospitals = async (
  _req: Request,
  res: Response
) => {
  try {
    const data = await getPendingHospitalsService();
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: errorMessage(error)
    });
  }
};

export const approveHospital = async (
  req: Request,
  res: Response
) => {
  try {
    const id = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Hospital id is required"
      });
    }

    const result = await approveHospitalService(
      id,
      getAuditContext(req)
    );

    return res.status(200).json({
      success: true,
      message: "Hospital approved successfully",
      data: result
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: errorMessage(error)
    });
  }
};

export const rejectHospital = async (
  req: Request,
  res: Response
) => {
  try {
    const { reason } = req.body;

    const id = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Hospital id is required"
      });
    }

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required"
      });
    }

    const result = await rejectHospitalService(
      id,
      reason,
      getAuditContext(req)
    );

    return res.status(200).json({
      success: true,
      message: "Hospital rejected successfully",
      data: result
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: errorMessage(error)
    });
  }
};

export const getHospitalDocument = async (
  req: Request,
  res: Response
) => {
  try {
    const id = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Hospital id is required"
      });
    }

    const document = await getHospitalDocumentService(id);

    return streamVerificationDocument(
      res,
      document,
      "hospital-verification-document"
    );
  } catch (error) {
    return res.status(errorStatus(error, 404)).json({
      success: false,
      message: errorMessage(error)
    });
  }
};


/* ----------------------------------------------------------------
   SPRINT 2 — Admin directory & detail handlers
-----------------------------------------------------------------*/

export const listDoctors = async (
  req: Request,
  res: Response
) => {
  try {

    const {
      search,
      status,
      specialty,
      page,
      limit,
      sortBy,
      sortDir
    } = req.query;

    const result = await listDoctorsService(
      {
        search: search as string | undefined,
        status: status as string | undefined,
        specialty: specialty as string | undefined,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        sortBy: sortBy as string | undefined,
        sortDir: sortDir as string | undefined
      },
      getAuditContext(req)
    );

    return res.status(200).json({
      success: true,
      ...result
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: errorMessage(error)
    });

  }
};

export const listPatients = async (
  req: Request,
  res: Response
) => {
  try {

    const {
      search,
      page,
      limit,
      sortBy,
      sortDir
    } = req.query;

    const result = await listPatientsService(
      {
        search: search as string | undefined,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        sortBy: sortBy as string | undefined,
        sortDir: sortDir as string | undefined
      },
      getAuditContext(req)
    );

    return res.status(200).json({
      success: true,
      ...result
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: errorMessage(error)
    });

  }
};

export const getPatientFullProfile = async (
  req: Request,
  res: Response
) => {
  try {

    const id = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Patient id is required"
      });
    }

    const result = await getPatientFullProfileService(
      id,
      getAuditContext(req)
    );

    return res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {

    const status =
      errorMessage(error) === "Patient not found" ? 404 : 500;

    return res.status(status).json({
      success: false,
      message: errorMessage(error)
    });

  }
};

export const getDoctorSchedule = async (
  req: Request,
  res: Response
) => {
  try {

    const id = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Doctor id is required"
      });
    }

    const result = await getDoctorScheduleService(
      id,
      getAuditContext(req)
    );

    return res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {

    const status =
      errorMessage(error) === "Doctor not found" ? 404 : 500;

    return res.status(status).json({
      success: false,
      message: errorMessage(error)
    });

  }
};


/* ----------------------------------------------------------------
   SPRINT 3 — Facility & provider-assignment handlers
-----------------------------------------------------------------*/

export const listFacilities = async (
  req: Request,
  res: Response
) => {
  try {

    const {
      search,
      type,
      page,
      limit,
      sortBy,
      sortDir
    } = req.query;

    const result = await listFacilitiesService(
      {
        search: search as string | undefined,
        type: type as string | undefined,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        sortBy: sortBy as string | undefined,
        sortDir: sortDir as string | undefined
      },
      getAuditContext(req)
    );

    return res.status(200).json({
      success: true,
      ...result
    });

  } catch (error) {

    const status = /Invalid facility type/i.test(errorMessage(error))
      ? 400
      : 500;

    return res.status(status).json({
      success: false,
      message: errorMessage(error)
    });

  }
};

export const getFacilityById = async (
  req: Request,
  res: Response
) => {
  try {

    const id = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Facility id is required"
      });
    }

    const facility = await getFacilityByIdService(id);

    return res.status(200).json({
      success: true,
      data: facility
    });

  } catch (error) {

    const status =
      errorMessage(error) === "Facility not found" ? 404 : 500;

    return res.status(status).json({
      success: false,
      message: errorMessage(error)
    });

  }
};

export const getFacilityWithProviders = async (
  req: Request,
  res: Response
) => {
  try {

    const id = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Facility id is required"
      });
    }

    const data = await getFacilityWithProvidersService(
      id,
      getAuditContext(req)
    );

    return res.status(200).json({
      success: true,
      data
    });

  } catch (error) {

    const status =
      errorMessage(error) === "Facility not found" ? 404 : 500;

    return res.status(status).json({
      success: false,
      message: errorMessage(error)
    });

  }
};

export const getAssignableProvidersForFacility = async (
  req: Request,
  res: Response
) => {
  try {

    const id = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Facility id is required"
      });
    }

    const data =
      await getAssignableProvidersForFacilityService(id);

    return res.status(200).json({
      success: true,
      data
    });

  } catch (error) {

    const status =
      errorMessage(error) === "Facility not found" ? 404 : 500;

    return res.status(status).json({
      success: false,
      message: errorMessage(error)
    });

  }
};

export const createFacility = async (
  req: Request,
  res: Response
) => {
  try {

    const facility = await createFacilityService(
      req.body ?? {},
      getAuditContext(req)
    );

    return res.status(201).json({
      success: true,
      data: facility
    });

  } catch (error) {

    return res.status(400).json({
      success: false,
      message: errorMessage(error)
    });

  }
};

export const updateFacility = async (
  req: Request,
  res: Response
) => {
  try {

    const id = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Facility id is required"
      });
    }

    const facility = await updateFacilityService(
      id,
      req.body ?? {},
      getAuditContext(req)
    );

    return res.status(200).json({
      success: true,
      data: facility
    });

  } catch (error) {

    const status =
      errorMessage(error) === "Facility not found"
        ? 404
        : 400;

    return res.status(status).json({
      success: false,
      message: errorMessage(error)
    });

  }
};

export const deleteFacility = async (
  req: Request,
  res: Response
) => {
  try {

    const id = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Facility id is required"
      });
    }

    await deleteFacilityService(
      id,
      getAuditContext(req)
    );

    return res.status(200).json({
      success: true,
      message: "Facility deleted"
    });

  } catch (error) {

    const status =
      errorMessage(error) === "Facility not found"
        ? 404
        : /active appointments/i.test(errorMessage(error))
          ? 409
          : 500;

    return res.status(status).json({
      success: false,
      message: errorMessage(error)
    });

  }
};

export const listProviderFacilitiesAdmin = async (
  req: Request,
  res: Response
) => {
  try {

    const providerId = Array.isArray(req.params.providerId)
      ? req.params.providerId[0]
      : req.params.providerId;

    if (!providerId) {
      return res.status(400).json({
        success: false,
        message: "Doctor id is required"
      });
    }

    const data = await listProviderFacilitiesAdminService(
      providerId
    );

    return res.status(200).json({
      success: true,
      count: data.length,
      data
    });

  } catch (error) {

    const status =
      errorMessage(error) === "Doctor not found" ? 404 : 500;

    return res.status(status).json({
      success: false,
      message: errorMessage(error)
    });

  }
};

export const assignFacilityToProvider = async (
  req: Request,
  res: Response
) => {
  try {

    const providerId = Array.isArray(req.params.providerId)
      ? req.params.providerId[0]
      : req.params.providerId;

    const { facility_id } = req.body ?? {};

    if (!providerId) {
      return res.status(400).json({
        success: false,
        message: "Doctor id is required"
      });
    }

    await assignFacilityToProviderService(
      providerId,
      facility_id,
      getAuditContext(req)
    );

    return res.status(201).json({
      success: true,
      message: "Facility assigned"
    });

  } catch (error) {

    const status =
      errorMessage(error) === "Doctor not found" ||
      errorMessage(error) === "Facility not found"
        ? 404
        : /already assigned/i.test(errorMessage(error))
          ? 409
          : 400;

    return res.status(status).json({
      success: false,
      message: errorMessage(error)
    });

  }
};

export const removeFacilityFromProvider = async (
  req: Request,
  res: Response
) => {
  try {

    const providerId = Array.isArray(req.params.providerId)
      ? req.params.providerId[0]
      : req.params.providerId;

    const facilityId = Array.isArray(req.params.facilityId)
      ? req.params.facilityId[0]
      : req.params.facilityId;

    if (!providerId || !facilityId) {
      return res.status(400).json({
        success: false,
        message: "Doctor id and facility id are required"
      });
    }

    await removeFacilityFromProviderService(
      providerId,
      facilityId,
      getAuditContext(req)
    );

    return res.status(200).json({
      success: true,
      message: "Facility unassigned"
    });

  } catch (error) {

    const status = /not assigned/i.test(errorMessage(error))
      ? 404
      : 500;

    return res.status(status).json({
      success: false,
      message: errorMessage(error)
    });

  }
};

/* ================================================================
   DEPARTMENT CRUD (Sprint 7)
=================================================================*/

export const listDepartments = async (
  req: Request,
  res: Response
) => {
  try {
    const data = await listDepartmentsService(
      typeof req.query.search === "string"
        ? req.query.search
        : undefined
    );
    return res.status(200).json({ success: true, data });
  } catch (e) {
    return res
      .status(500)
      .json({ success: false, message: errorMessage(e) });
  }
};

export const getDepartmentById = async (
  req: Request,
  res: Response
) => {
  try {
    const data = await getDepartmentByIdAdminService(
      pickId(req.params.id)
    );
    return res.status(200).json({ success: true, data });
  } catch (e) {
    const status = errorMessage(e) === "Department not found" ? 404 : 500;
    return res
      .status(status)
      .json({ success: false, message: errorMessage(e) });
  }
};

export const createDepartment = async (
  req: Request,
  res: Response
) => {
  try {
    const result = await createDepartmentService(
      req.body ?? {},
      getAuditContext(req)
    );
    return res
      .status(201)
      .json({ success: true, data: result });
  } catch (e) {
    const status = /already exists/.test(errorMessage(e))
      ? 409
      : 400;
    return res
      .status(status)
      .json({ success: false, message: errorMessage(e) });
  }
};

export const updateDepartment = async (
  req: Request,
  res: Response
) => {
  try {
    const result = await updateDepartmentService(
      pickId(req.params.id),
      req.body ?? {},
      getAuditContext(req)
    );
    return res.status(200).json({ ...result, success: true });
  } catch (e) {
    const status =
      errorMessage(e) === "Department not found"
        ? 404
        : /already uses/.test(errorMessage(e))
          ? 409
          : 400;
    return res
      .status(status)
      .json({ success: false, message: errorMessage(e) });
  }
};

export const deleteDepartment = async (
  req: Request,
  res: Response
) => {
  try {
    const result = await deleteDepartmentService(
      pickId(req.params.id),
      getAuditContext(req)
    );
    return res
      .status(200)
      .json({ ...result, success: true, message: "Department deleted" });
  } catch (e) {
    const status = errorMessage(e) === "Department not found" ? 404 : 500;
    return res
      .status(status)
      .json({ success: false, message: errorMessage(e) });
  }
};

/* ============ FACILITY ↔ DEPARTMENT ============ */

export const listDepartmentFacilities = async (
  req: Request,
  res: Response
) => {
  try {
    const data = await listDepartmentFacilitiesAdminService(
      pickId(req.params.id)
    );
    return res.status(200).json({ success: true, data });
  } catch (e) {
    return res
      .status(500)
      .json({ success: false, message: errorMessage(e) });
  }
};

export const listFacilityDepartmentsAdmin = async (
  req: Request,
  res: Response
) => {
  try {
    const data = await listFacilityDepartmentsAdminService(
      pickId(req.params.id)
    );
    return res.status(200).json({ success: true, data });
  } catch (e) {
    return res
      .status(500)
      .json({ success: false, message: errorMessage(e) });
  }
};

export const attachDepartmentToFacility = async (
  req: Request,
  res: Response
) => {
  try {
    const departmentId =
      pickId(req.params.deptId) ||
      String(req.body?.department_id || "");
    if (!departmentId) {
      return res.status(400).json({
        success: false,
        message: "department_id is required",
      });
    }
    const result = await attachDepartmentToFacilityService(
      pickId(req.params.id),
      departmentId,
      getAuditContext(req)
    );
    return res
      .status(201)
      .json({ ...result, success: true, message: "Department attached" });
  } catch (e) {
    const status =
      /not found/.test(errorMessage(e)) ? 404 : 400;
    return res
      .status(status)
      .json({ success: false, message: errorMessage(e) });
  }
};

export const detachDepartmentFromFacility = async (
  req: Request,
  res: Response
) => {
  try {
    const result = await detachDepartmentFromFacilityService(
      pickId(req.params.id),
      pickId(req.params.deptId),
      getAuditContext(req)
    );
    return res
      .status(200)
      .json({ ...result, success: true, message: "Department detached" });
  } catch (e) {
    const status = /not attached/.test(errorMessage(e)) ? 404 : 500;
    return res
      .status(status)
      .json({ success: false, message: errorMessage(e) });
  }
};

/* ============ PROVIDER ↔ DEPARTMENT ============ */

export const listProviderDepartmentsAdmin = async (
  req: Request,
  res: Response
) => {
  try {
    const data = await listProviderDepartmentsAdminService(
      pickId(req.params.providerId)
    );
    return res.status(200).json({ success: true, data });
  } catch (e) {
    return res
      .status(500)
      .json({ success: false, message: errorMessage(e) });
  }
};

export const attachDepartmentToProvider = async (
  req: Request,
  res: Response
) => {
  try {
    const departmentId =
      pickId(req.params.deptId) ||
      String(req.body?.department_id || "");
    if (!departmentId) {
      return res.status(400).json({
        success: false,
        message: "department_id is required",
      });
    }
    const result = await attachDepartmentToProviderService(
      pickId(req.params.providerId),
      departmentId,
      getAuditContext(req)
    );
    return res
      .status(201)
      .json({ ...result, success: true, message: "Department attached" });
  } catch (e) {
    const status =
      /not found/.test(errorMessage(e)) ? 404 : 400;
    return res
      .status(status)
      .json({ success: false, message: errorMessage(e) });
  }
};

export const detachDepartmentFromProvider = async (
  req: Request,
  res: Response
) => {
  try {
    const result = await detachDepartmentFromProviderService(
      pickId(req.params.providerId),
      pickId(req.params.deptId),
      getAuditContext(req)
    );
    return res
      .status(200)
      .json({ ...result, success: true, message: "Department detached" });
  } catch (e) {
    const status = /not attached/.test(errorMessage(e)) ? 404 : 500;
    return res
      .status(status)
      .json({ success: false, message: errorMessage(e) });
  }
};