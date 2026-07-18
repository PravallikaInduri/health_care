"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const controllerHelpers_1 = require("../../src/utils/controllerHelpers");
describe("controllerHelpers", () => {
    it("normalizes route params that may arrive as arrays", () => {
        expect((0, controllerHelpers_1.pickId)(["abc"])).toBe("abc");
        expect((0, controllerHelpers_1.pickId)("def")).toBe("def");
        expect((0, controllerHelpers_1.pickId)(undefined)).toBe("");
    });
    it("maps common service errors to HTTP status codes", () => {
        expect((0, controllerHelpers_1.errorStatus)(new Error("Forbidden"))).toBe(403);
        expect((0, controllerHelpers_1.errorStatus)(new Error("Patient not found"))).toBe(404);
        expect((0, controllerHelpers_1.errorStatus)(new Error("already exists"))).toBe(409);
        expect((0, controllerHelpers_1.errorStatus)(new Error("amount must be greater than zero"))).toBe(400);
        expect((0, controllerHelpers_1.errorStatus)(new Error("unexpected"), 418)).toBe(418);
    });
});
