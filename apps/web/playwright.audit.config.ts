import { defineConfig, type PlaywrightTestConfig } from "@playwright/test";
import system from "./playwright.config.ts";

const server: PlaywrightTestConfig["webServer"] = system.webServer;
if (server === undefined || Array.isArray(server)) {
  throw new Error("The audit needs the system test web server.");
}

export default defineConfig({
  ...system,
  testDir: "./test/audit",
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 5000 },
  use: { ...system.use, trace: "off" },
  reporter: [["dot"], ["./test/audit/reporter.ts"]],
  webServer: {
    ...server,
    command: `npm run test-db:reset && ${server.command} --audit`,
  },
});
