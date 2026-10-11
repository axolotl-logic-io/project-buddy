// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { MAX_FAILED_LOGINS } from "@/auth/failed-logins.ts";
import { attemptLogin } from "@/auth/login.ts";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from "@/auth/session-token.ts";
import {
  FAKE_DATABASE_URL,
  type FakeNeonHttp,
  fakeNeonHttp,
  type NeonHttpAnswer,
} from "@/db/fake-neon-http.ts";

const NOW = new Date("2026-10-10T12:00:00Z");
const PASSPHRASE = "correct horse";
const SESSION_SECRET = "test-session-secret";
const CLIENT_KEY = "203.0.113.7";

const SELECT_FROM_FAILED_LOGINS = /from "failed_logins"/u;
const INSERT_INTO_FAILED_LOGINS = /insert into "failed_logins"/u;
const DELETE_FROM_FAILED_LOGINS = /delete from "failed_logins"/u;

const NO_FAILED_LOGINS: NeonHttpAnswer = {
  kind: "rows",
  columns: [],
  rows: [],
};
const LOCKED_OUT: NeonHttpAnswer = {
  kind: "rows",
  columns: [
    { name: "failures", type: "int4" },
    { name: "window_started_at", type: "timestamptz" },
  ],
  rows: [[String(MAX_FAILED_LOGINS), NOW.toISOString()]],
};

// The Neon endpoint, faked, answering every failed-login query alike.
function failedLoginsAnswering(answer: NeonHttpAnswer): FakeNeonHttp {
  const neonHttp = fakeNeonHttp(answer);
  vi.stubGlobal("fetch", neonHttp.fetch);
  return neonHttp;
}

function attemptFromClient(
  passphrase: string,
): ReturnType<typeof attemptLogin> {
  return attemptLogin({
    passphrase,
    requestHeaders: new Headers({ "x-forwarded-for": CLIENT_KEY }),
  });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  vi.stubEnv("DATABASE_URL", FAKE_DATABASE_URL);
  vi.stubEnv("SITE_PASSPHRASE", PASSPHRASE);
  vi.stubEnv("SESSION_SECRET", SESSION_SECRET);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("attemptLogin with the right passphrase", () => {
  test("signs in with an HTTP-only session cookie and clears the client's failed logins", async () => {
    const neonHttp = failedLoginsAnswering(NO_FAILED_LOGINS);

    expect(await attemptFromClient(PASSPHRASE)).toEqual({
      kind: "signed-in",
      sessionCookie: {
        name: SESSION_COOKIE_NAME,
        value: await createSessionToken(SESSION_SECRET, NOW),
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: SESSION_MAX_AGE_SECONDS,
      },
    });
    expect(neonHttp.queries).toEqual([
      {
        query: expect.stringMatching(SELECT_FROM_FAILED_LOGINS),
        params: [CLIENT_KEY],
      },
      {
        query: expect.stringMatching(DELETE_FROM_FAILED_LOGINS),
        params: [CLIENT_KEY],
      },
    ]);
  });
});

describe("attemptLogin refusals", () => {
  test("counts a wrong passphrase against the client", async () => {
    const neonHttp = failedLoginsAnswering(NO_FAILED_LOGINS);

    expect(await attemptFromClient("wrong")).toEqual({
      kind: "wrong-passphrase",
    });
    expect(neonHttp.queries).toEqual([
      {
        query: expect.stringMatching(SELECT_FROM_FAILED_LOGINS),
        params: [CLIENT_KEY],
      },
      {
        query: expect.stringMatching(INSERT_INTO_FAILED_LOGINS),
        params: expect.arrayContaining([CLIENT_KEY]),
      },
    ]);
  });

  test("refuses even the right passphrase while the client is locked out, without counting it", async () => {
    const neonHttp = failedLoginsAnswering(LOCKED_OUT);

    expect(await attemptFromClient(PASSPHRASE)).toEqual({
      kind: "locked-out",
    });
    expect(neonHttp.queries).toEqual([
      {
        query: expect.stringMatching(SELECT_FROM_FAILED_LOGINS),
        params: [CLIENT_KEY],
      },
    ]);
  });
});
