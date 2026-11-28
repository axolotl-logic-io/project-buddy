import { defineConfig } from "@playwright/test";
import system, { testWebServers } from "./playwright.config.ts";
import { auditRun } from "./test/audit/run-options.ts";

const { action, page, performance } = auditRun();
const testMatch: string[] = [];
if (action === undefined) {
  testMatch.push("**/lighthouse.spec.ts");
}
if (performance && page === undefined) {
  testMatch.push("**/actions.spec.ts");
}

export default defineConfig({
  ...system,
  testDir: "./test/audit",
  testMatch,
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 5000 },
  use: { ...system.use, trace: "off" },
  reporter: [["dot"], ["./test/audit/reporter.ts"]],
  webServer: testWebServers(true),
});
