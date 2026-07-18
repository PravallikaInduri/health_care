"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authMiddleware_1 = require("../../src/middleware/authMiddleware");
const mockResponse = () => {
    const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
    };
    return res;
};
describe("authMiddleware", () => {
    it("rejects requests without a bearer token", () => {
        const req = { headers: {} };
        const res = mockResponse();
        const next = jest.fn();
        (0, authMiddleware_1.authenticate)(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: "Token missing",
        });
        expect(next).not.toHaveBeenCalled();
    });
    it("attaches valid access token payloads", () => {
        const token = jsonwebtoken_1.default.sign({ id: "user-1", role: "PATIENT" }, process.env.JWT_SECRET);
        const req = {
            headers: { authorization: `Bearer ${token}` },
        };
        const res = mockResponse();
        const next = jest.fn();
        (0, authMiddleware_1.authenticate)(req, res, next);
        expect(req.user).toEqual(expect.objectContaining({ id: "user-1", role: "PATIENT" }));
        expect(next).toHaveBeenCalledTimes(1);
    });
    it("enforces role boundaries", () => {
        const req = { user: { id: "u", role: "PATIENT" } };
        const res = mockResponse();
        const next = jest.fn();
        (0, authMiddleware_1.authorize)("ADMIN")(req, res, next);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });
});
