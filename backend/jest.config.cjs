/** @type {import('jest').Config} */
module.exports = {
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
      tsconfig: {
        types: ["jest", "node"],
      },
      },
    ],
  },
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/unit/**/*.test.ts"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup/jest.setup.ts"],
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/server.ts",
    "!src/config/db.ts",
    "!src/config/socket.ts",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "json-summary", "cobertura"],
  coverageThreshold: {
    global: {
      lines: 85,
      branches: 80,
    },
  },
  moduleFileExtensions: ["ts", "js", "json"],
  testTimeout: 30000,
};
