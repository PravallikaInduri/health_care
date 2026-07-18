import request from "supertest";
import OpenAPIResponseValidator from "openapi-response-validator";

import app from "../../src/app";

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
} as const;

const validate = (
  path: keyof typeof apiSpec.paths,
  method: string,
  status: number,
  body: unknown
) => {
  const responses = (apiSpec.paths[path] as Record<string, any>)[method].responses;
  const validator = new OpenAPIResponseValidator({ responses });
  const result = validator.validateResponse(status, body);
  expect(result).toBeUndefined();
};

describe("OpenAPI response contracts", () => {
  it("validates the health endpoint response", async () => {
    const response = await request(app).get("/").expect(200);
    validate("/", "get", response.status, response.body);
  });

  it("validates the unauthorized patient profile response", async () => {
    const response = await request(app)
      .get("/api/healthcare/patients/me")
      .expect(401);
    validate("/api/healthcare/patients/me", "get", response.status, response.body);
  });
});
