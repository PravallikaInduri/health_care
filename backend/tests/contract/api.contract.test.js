"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const openapi_response_validator_1 = __importDefault(require("openapi-response-validator"));
const app_1 = __importDefault(require("../../src/app"));
const apiSpec = {
    openapi: "3.0.0",
    info: { title: "Healthcare API", version: "1.0.0" },
    paths: {
        "/": {
            get: {
                responses: {
                    "200": {
                        description: "API health response",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    required: ["message"],
                                    properties: {
                                        message: { type: "string" },
                                    },
                                    additionalProperties: false,
                                },
                            },
                        },
                    },
                },
            },
        },
        "/api/healthcare/patients/me": {
            get: {
                responses: {
                    "401": {
                        description: "Missing or invalid token",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    required: ["success", "message"],
                                    properties: {
                                        success: { type: "boolean" },
                                        message: { type: "string" },
                                    },
                                    additionalProperties: false,
                                },
                            },
                        },
                    },
                },
            },
        },
    },
};
const validate = (path, method, status, body) => {
    const responses = apiSpec.paths[path][method].responses;
    const validator = new openapi_response_validator_1.default({ responses });
    const result = validator.validateResponse(status, body);
    expect(result).toBeUndefined();
};
describe("OpenAPI response contracts", () => {
    it("validates the health endpoint response", async () => {
        const response = await (0, supertest_1.default)(app_1.default).get("/").expect(200);
        validate("/", "get", response.status, response.body);
    });
    it("validates the unauthorized patient profile response", async () => {
        const response = await (0, supertest_1.default)(app_1.default)
            .get("/api/healthcare/patients/me")
            .expect(401);
        validate("/api/healthcare/patients/me", "get", response.status, response.body);
    });
});
