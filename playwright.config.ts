import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 120_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: { baseURL: "http://localhost:5181", trace: "retain-on-failure", launchOptions: { args: ["--use-angle=metal"] } },
  webServer: { command: "VITE_TEST_HOOK=1 npm run build && npx vite preview --port 5181 --strictPort", url: "http://localhost:5181/", reuseExistingServer: true, timeout: 180_000 },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1512, height: 945 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
