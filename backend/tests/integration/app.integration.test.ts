import jwt from "jsonwebtoken";
import request from "supertest";

jest.mock("../../src/services/patientService", () => ({
  getPatientProfile: jest.fn(),
  updatePatientProfile: jest.fn(),
  addEmergencyContact: jest.fn(),
  addDependent: jest.fn(),
  addInsurance: jest.fn(),
  getPatientEncounters: jest.fn(),
  getPatientEncounterById: jest.fn(),
  getPatientLabs: jest.fn(),
  getPatientLabOrderById: jest.fn(),
  uploadLabResultService: jest.fn(),
  getPatientLabResultFileService: jest.fn(),
  getPatientInsurance: jest.fn(),
  updatePatientInsurance: jest.fn(),
  deletePatientInsurance: jest.fn(),
  getDependents: jest.fn(),
  getEmergencyContacts: jest.fn(),
}));

import app from "../../src/app";
import { getPatientProfile } from "../../src/services/patientService";

const patientToken = () =>
  jwt.sign({ id: "user-1", role: "PATIENT" }, process.env.JWT_SECRET!);

describe("HTTP integration smoke", () => {
  it("returns the public API health response", async () => {
    await request(app)
      .get("/")
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual({ message: "Healthcare API Running" });
      });
  });

  it("rejects authenticated patient endpoints without a token", async () => {
    await request(app)
      .get("/api/healthcare/patients/me")
      .expect(401)
      .expect(({ body }) => {
        expect(body.success).toBe(false);
        expect(body.message).toBe("Token missing");
      });
  });

  it("returns the patient profile for an authorized patient", async () => {
    jest.mocked(getPatientProfile).mockResolvedValueOnce({
      id: "patient-1",
      user_id: "user-1",
      first_name: "Asha",
      last_name: "Rao",
      mrn: "MRN-1",
    });

    await request(app)
      .get("/api/healthcare/patients/me")
      .set("Authorization", `Bearer ${patientToken()}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.success).toBe(true);
        expect(body.data.first_name).toBe("Asha");
      });
  });
});
