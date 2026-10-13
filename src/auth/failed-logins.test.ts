// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { checkInviteCode, MAX_FAILED_LOGINS } from "@/auth/failed-logins.ts";
import {
  FAKE_DATABASE_URL,
  type FakeNeonHttp,
  fakeNeonHttp,
  type NeonHttpAnswer,
} from "@/db/fake-neon-http.ts";
import { AppError } from "@/errors/app-error.ts";
import { spyOnErrorLog } from "@/errors/error-log-spy.ts";

const INVITE_CODE = "open sesame";
const CLIENT_KEY = "203.0.113.7";
const NOW = new Date("2026-10-10T12:00:00Z");
const MINUTE_AGO = "2026-10-10T11:59:00.000Z";
const FIFTEEN_MINUTES_AGO = "2026-10-10T11:45:00.000Z";
const NO_ROWS: NeonHttpAnswer = { kind: "rows", columns: [], rows: [] };

// The client's failed-login count, in a window that started at windowStart.
function failures(count: number, windowStart = MINUTE_AGO): NeonHttpAnswer {
  return {
    kind: "rows",
    columns: [
      { name: "failures", type: "int4" },
      { name: "window_started_at", type: "timestamptz" },
    ],
    rows: [[String(count), windowStart]],
  };
}

function database(...answers: readonly NeonHttpAnswer[]): FakeNeonHttp {
  const [first = NO_ROWS, ...later] = answers;
  const neonHttp = fakeNeonHttp(first, ...later);
  vi.stubGlobal("fetch", neonHttp.fetch);
  return neonHttp;
}

beforeEach(() => {
  vi.stubEnv("DATABASE_URL", FAKE_DATABASE_URL);
  vi.stubEnv("INVITE_CODE", INVITE_CODE);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("checkInviteCode answering", () => {
  test("takes the right code, clearing the client's count", async () => {
    const neonHttp = database(NO_ROWS, NO_ROWS);

    expect(await checkInviteCode(INVITE_CODE, CLIENT_KEY, NOW)).toBe("right");
    expect(neonHttp.queries[0]?.query).toContain('from "failed_logins"');
    expect(neonHttp.queries[1]?.query).toContain('delete from "failed_logins"');
    expect(neonHttp.queries[1]?.params).toEqual([CLIENT_KEY]);
  });

  test("refuses a wrong code, counting it against the client", async () => {
    const neonHttp = database(failures(1), NO_ROWS);

    expect(await checkInviteCode("guess", CLIENT_KEY, NOW)).toBe("wrong");
    const [, counting] = neonHttp.queries;
    expect(counting?.query).toContain('insert into "failed_logins"');
    expect(counting?.query).toContain('on conflict ("client_key") do update');
    expect(counting?.query).toContain('"failures" + 1');
    expect(counting?.params).toContain(CLIENT_KEY);
    expect(counting?.params).toContain(NOW.toISOString());
    expect(counting?.params).toContain(FIFTEEN_MINUTES_AGO);
  });

  test("refuses even the right code from a locked-out client, saving nothing", async () => {
    const neonHttp = database(failures(MAX_FAILED_LOGINS));

    expect(await checkInviteCode(INVITE_CODE, CLIENT_KEY, NOW)).toBe(
      "locked-out",
    );
    expect(neonHttp.queries).toHaveLength(1);
  });

  test("takes the right code from a client just below the limit", async () => {
    database(failures(MAX_FAILED_LOGINS - 1), NO_ROWS);

    expect(await checkInviteCode(INVITE_CODE, CLIENT_KEY, NOW)).toBe("right");
  });

  test("takes the right code again once the lockout's window has passed", async () => {
    database(failures(MAX_FAILED_LOGINS, FIFTEEN_MINUTES_AGO), NO_ROWS);

    expect(await checkInviteCode(INVITE_CODE, CLIENT_KEY, NOW)).toBe("right");
  });
});

describe("checkInviteCode when the database is unreachable", () => {
  test("rejects with a logged AppError", async () => {
    const log = spyOnErrorLog();
    database({ kind: "unreachable" });

    const error = await checkInviteCode(INVITE_CODE, CLIENT_KEY, NOW).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(AppError);
    expect(error).toHaveProperty("errorCase", "database-unreachable");
    expect(log).toHaveBeenCalledWith(
      "[app-error] database-unreachable in readFailedLogins",
      expect.any(String),
    );
  });
});
