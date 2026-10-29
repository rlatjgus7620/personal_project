// Jest 설정. next/jest가 TypeScript·JSX 변환과 .env 읽기를 대신 해줍니다.
import nextJest from "next/jest.js";

const createJestConfig = nextJest({ dir: "./" });

/** @type {import('jest').Config} */
const config = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/backend/", "<rootDir>/.next/"],
};

export default createJestConfig(config);
