import jwt from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";

import { authenticate, authorize } from "../../src/middleware/authMiddleware";

const mockResponse = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res as unknown as Response & {
    status: jest.Mock;
    json: jest.Mock;
  };
};

describe("authMiddleware", () => {
  it("rejects requests without a bearer token", () => {
    const req = { headers: {} } as Request;
    const res = mockResponse();
    const next = jest.fn() as NextFunction;

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Token missing",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("attaches valid access token payloads", () => {
    const token = jwt.sign(
      { id: "user-1", role: "PATIENT" },
      process.env.JWT_SECRET!
    );
    const req = {
      headers: { authorization: `Bearer ${token}` },
    } as Request;
    const res = mockResponse();
    const next = jest.fn() as NextFunction;

    authenticate(req, res, next);

    expect(req.user).toEqual(
      expect.objectContaining({ id: "user-1", role: "PATIENT" })
    );
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("rejects malformed access token payloads", () => {
    const token = jwt.sign({ sub: "missing-id-role" }, process.env.JWT_SECRET!);
    const req = {
      headers: { authorization: `Bearer ${token}` },
    } as Request;
    const res = mockResponse();
    const next = jest.fn() as NextFunction;

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Invalid token",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("enforces role boundaries", () => {
    const req = { user: { id: "u", role: "PATIENT" } } as Request;
    const res = mockResponse();
    const next = jest.fn() as NextFunction;

    authorize("ADMIN")(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("allows configured roles", () => {
    const req = { user: { id: "u", role: "ADMIN" } } as Request;
    const res = mockResponse();
    const next = jest.fn() as NextFunction;

    authorize("ADMIN")(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});
