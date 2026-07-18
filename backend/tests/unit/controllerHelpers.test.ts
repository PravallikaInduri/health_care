import type { Response } from "express";

import {
  errorMessage,
  errorStatus,
  pickId,
  sendError,
} from "../../src/utils/controllerHelpers";

describe("controllerHelpers", () => {
  it("normalizes route params that may arrive as arrays", () => {
    expect(pickId(["abc"])).toBe("abc");
    expect(pickId("def")).toBe("def");
    expect(pickId(undefined)).toBe("");
  });

  it("maps common service errors to HTTP status codes", () => {
    expect(errorStatus(new Error("Forbidden"))).toBe(403);
    expect(errorStatus(new Error("Patient not found"))).toBe(404);
    expect(errorStatus(new Error("already exists"))).toBe(409);
    expect(errorStatus(new Error("amount must be greater than zero"))).toBe(400);
    expect(errorStatus(new Error("unexpected"), 418)).toBe(418);
  });

  it("normalizes unknown errors and sends JSON error responses", () => {
    expect(errorMessage("plain failure")).toBe("Internal Server Error");

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as unknown as Response & { status: jest.Mock; json: jest.Mock };

    sendError(res, new Error("Record not found"));

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Record not found",
    });
  });
});
