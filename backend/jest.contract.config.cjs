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
  testMatch: ["**/contract/**/*.test.ts"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup/jest.setup.ts"],
  moduleFileExtensions: ["ts", "js", "json"],
  testTimeout: 30000,
};
