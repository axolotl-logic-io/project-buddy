// @vitest-environment node
import { describe, expect, test } from "vitest";
import serverConfig from "./vitest.server.config.mts";

// Vitest's own limits for a test and a hook in Node, which the server tests'
// database work can pass on a busy machine
// (https://vitest.dev/config/testtimeout, https://vitest.dev/config/hooktimeout).
const VITEST_TEST_TIMEOUT_MS = 5000;
const VITEST_HOOK_TIMEOUT_MS = 10_000;

describe("server test timeouts", () => {
  test("a server test may run longer than Vitest's default", () => {
    expect(serverConfig.test?.testTimeout).toBeGreaterThan(
      VITEST_TEST_TIMEOUT_MS,
    );
  });

  test("a server test's hooks may run longer than Vitest's default", () => {
    expect(serverConfig.test?.hookTimeout).toBeGreaterThan(
      VITEST_HOOK_TIMEOUT_MS,
    );
  });
});
