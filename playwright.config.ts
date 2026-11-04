// 화면 흐름 테스트(Playwright) 설정 (v2.7). 실행: npm run test:e2e
// 테스트 전용 서버(8100)와 화면(3100)을 새로 켜고, 실제 브라우저로 로그인부터 체크인까지 눌러 봅니다.
// 개발용 서버(8000)·화면(3000)·dev.db는 건드리지 않습니다.
import { defineConfig, devices } from "@playwright/test";
import { API_PORT, E2E_PASSWORD, WEB_PORT } from "./e2e/constants";

export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      // 서버: 빈 DB를 만들고 마이그레이션 후 켬 (backend/scripts/e2e_server.py)
      command: "uv run python -m scripts.e2e_server",
      cwd: "backend",
      url: `http://127.0.0.1:${API_PORT}/health`,
      reuseExistingServer: false,
      timeout: 180_000,
      env: {
        E2E_API_PORT: String(API_PORT),
        ADMIN_PASSWORD: E2E_PASSWORD,
        AUTH_SECRET: "e2e-test-secret",
        CORS_ORIGINS: `http://localhost:${WEB_PORT}`,
        DISABLE_SQLALCHEMY_CEXT_RUNTIME: "1",
      },
    },
    {
      // 화면: 테스트 서버 주소로 연결
      command: `npm run dev -- --port ${WEB_PORT}`,
      url: `http://localhost:${WEB_PORT}`,
      reuseExistingServer: false,
      timeout: 180_000,
      env: { NEXT_PUBLIC_API_URL: `http://127.0.0.1:${API_PORT}` },
    },
  ],
});
