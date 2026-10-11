// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { MAX_FAILED_LOGINS } from "@/auth/failed-logins.ts";
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
import { type LoginState, login } from "./actions.ts";

const NOW = new Date("2026-10-10T12:00:00Z");
const PASSPHRASE = "correct horse";
const SESSION_SECRET = "test-session-secret";
const IDLE: LoginState = { kind: "idle" };

const INSERT_INTO_FAILED_LOGINS = /insert into "failed_logins"/u;
const DELETE_FROM_FAILED_LOGINS = /delete from "failed_logins"/u;

const cookieStore = vi.hoisted(() => ({ set: vi.fn() }));
vi.mock("next/headers", () => ({
  cookies: async (): Promise<typeof cookieStore> => cookieStore,
  headers: async (): Promise<Headers> =>
    new Headers({ "x-forwarded-for": "203.0.113.7" }),
}));

const navigation = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
}));
vi.mock("next/navigation", () => navigation);

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

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    data.set(key, value);
  }
  return data;
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
  vi.clearAllMocks();
});

describe("login with the right passphrase", () => {
  test("sets the HTTP-only session cookie, clears failed logins and redirects home", async () => {
    const neonHttp = failedLoginsAnswering(NO_FAILED_LOGINS);

    await expect(login(IDLE, form({ passphrase: PASSPHRASE }))).rejects.toThrow(
      "NEXT_REDIRECT /",
    );

    expect(cookieStore.set).toHaveBeenCalledWith({
      name: SESSION_COOKIE_NAME,
      value: await createSessionToken(SESSION_SECRET, NOW),
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    expect(neonHttp.queries.at(-1)?.query).toMatch(DELETE_FROM_FAILED_LOGINS);
  });
});

describe("login refusals", () => {
  test("says the passphrase is wrong, counts it and sets no cookie", async () => {
    const neonHttp = failedLoginsAnswering(NO_FAILED_LOGINS);

    expect(await login(IDLE, form({ passphrase: "wrong" }))).toEqual({
      kind: "error",
      message: "Wrong passphrase.",
    });
    expect(neonHttp.queries.at(-1)?.query).toMatch(INSERT_INTO_FAILED_LOGINS);
    expect(cookieStore.set).not.toHaveBeenCalled();
    expect(navigation.redirect).not.toHaveBeenCalled();
  });

  test("counts a form without a passphrase as a wrong passphrase", async () => {
    const neonHttp = failedLoginsAnswering(NO_FAILED_LOGINS);

    expect(await login(IDLE, form({}))).toEqual({
      kind: "error",
      message: "Wrong passphrase.",
    });
    expect(neonHttp.queries.at(-1)?.query).toMatch(INSERT_INTO_FAILED_LOGINS);
  });

  test("refuses even the right passphrase while the client is locked out", async () => {
    failedLoginsAnswering(LOCKED_OUT);

    expect(await login(IDLE, form({ passphrase: PASSPHRASE }))).toEqual({
      kind: "error",
      message: "Too many failed attempts. Try again later.",
    });
    expect(cookieStore.set).not.toHaveBeenCalled();
    expect(navigation.redirect).not.toHaveBeenCalled();
  });
});
