import { Request, Response } from "express";

import {
  bookAppointmentService,
  rescheduleAppointmentService,
  cancelAppointmentService,
  getMyAppointmentsService,
  getAvailabilityService,
  getAvailabilityForFacilityService,
  getBookableProvidersService,
  getProviderFacilitiesService
} from "../services/appointmentService";
import type { AuthenticatedRequest } from "../types/auth";
import { errorMessage } from "../utils/controllerHelpers";

/*
BOOK APPOINTMENT
POST /api/healthcare/appointments
*/
export const bookAppointment = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {

    const result =
      await bookAppointmentService(
        req.user.id,
        req.body
      );

    res.status(201).json(result);

  } catch (error) {

    const message = errorMessage(error);

    const status =
      message === "Patient not found" ||
      message === "Doctor not found"
        ? 404
        : /already booked/i.test(message)
          ? 409
          : /not associated|outside the provider|select a facility/i.test(
              message
            )
            ? 400
            : 500;

    res.status(status).json({
      message
    });

  }
};

/*
RESCHEDULE APPOINTMENT
PATCH /api/healthcare/appointments/:id
*/
export const rescheduleAppointment = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {

    const result =
      await rescheduleAppointmentService(
        req.user.id,
        req.params.id,
        req.body
      );

    res.json(result);

  } catch (error) {

    res.status(500).json({
      message: errorMessage(error)
    });

  }
};

/*
CANCEL APPOINTMENT
DELETE /api/healthcare/appointments/:id
*/
export const cancelAppointment = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {

    const result =
      await cancelAppointmentService(
        req.user.id,
        req.params.id
      );

    res.json(result);

  } catch (error) {

    res.status(500).json({
      message: errorMessage(error)
    });

  }
};
export const getMyAppointments = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {

    const result =
      await getMyAppointmentsService(
        req.user.id
      );

    res.status(200).json(result);

  } catch (error) {

    const status =
      errorMessage(error) === "Patient not found" ? 404 : 500;

    res.status(status).json({
      message: errorMessage(error)
    });

  }
};

/*
GET AVAILABILITY
GET /api/healthcare/appointments/availability/:providerId/:date
*/
export const getAvailability = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {

    const result =
      await getAvailabilityService(
        req.params.providerId,
        req.params.date
      );

    res.status(200).json(result);

  } catch (error) {

    res.status(500).json({
      message: errorMessage(error)
    });

  }
};

/*
GET FACILITY-AWARE AVAILABILITY (Sprint 7)
GET /api/healthcare/appointments/availability/:providerId/:facilityId/:date
*/
export const getAvailabilityForFacility = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const result = await getAvailabilityForFacilityService(
      req.params.providerId,
      req.params.facilityId,
      req.params.date
    );
    res.status(200).json(result);
  } catch (error) {
    const status =
      errorMessage(error) === "Doctor not found"
        ? 404
        : /does not practice/.test(errorMessage(error))
          ? 400
          : 500;
    res.status(status).json({ message: errorMessage(error) });
  }
};

/*
GET BOOKABLE PROVIDERS
GET /api/healthcare/appointments/providers
*/
export const getBookableProviders = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {

    const result =
      await getBookableProvidersService();

    res.status(200).json(result);

  } catch (error) {

    res.status(500).json({
      message: errorMessage(error)
    });

  }
};

/*
GET PROVIDER FACILITIES
GET /api/healthcare/appointments/providers/:providerId/facilities
*/
export const getProviderFacilities = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {

    const result =
      await getProviderFacilitiesService(
        req.params.providerId
      );

    res.status(200).json(result);

  } catch (error) {

    res.status(500).json({
      message: errorMessage(error)
    });

  }
};
