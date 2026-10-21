// @vitest-environment node
// countLoginLinkRequest when the database can't be reached. What it counts
// and allows is rate-limits.server.test.ts's.
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { countLoginLinkRequest } from "@/accounts/rate-limits.ts";
import { AppError } from "@/errors/app-error.ts";
import { FAKE_DATABASE_URL, fakeNeonHttp } from "../db/fake-neon-http.ts";
import { spyOnErrorLog } from "../errors/error-log-spy.ts";

const NOW = new Date("2026-10-12T12:00:00.000Z");

beforeEach(() => {
  vi.stubEnv("DATABASE_URL", FAKE_DATABASE_URL);
  vi.stubEnv("SESSION_SECRET", "test-session-secret-at-least-32-characters");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test("countLoginLinkRequest throws the storage case when the database is unreachable", async () => {
  spyOnErrorLog();
  vi.stubGlobal("fetch", fakeNeonHttp({ kind: "unreachable" }).fetch);

  await expect(
    countLoginLinkRequest("mabel@example.test", "203.0.113.7", NOW),
  ).rejects.toBeInstanceOf(AppError);
});
