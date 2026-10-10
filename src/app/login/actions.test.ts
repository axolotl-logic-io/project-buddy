// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearFailedLogins,
  readFailedLogins,
  recordFailedLogin,
} from "@/auth/failed-logins";
import {
  isValidSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from "@/auth/session-token";
import { login } from "./actions";

const cookieStore = { set: vi.fn() };
const redirect = vi.fn();
const fakeDb = { fake: "db" };

vi.mock("next/headers", () => ({
  cookies: async () => cookieStore,
  headers: async () => new Headers({ "x-forwarded-for": "203.0.113.7" }),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirect(url),
}));
vi.mock("@/db/client", () => ({ getDb: () => fakeDb }));
vi.mock("@/auth/failed-logins", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/auth/failed-logins")>()),
  readFailedLogins: vi.fn(),
  recordFailedLogin: vi.fn(),
  clearFailedLogins: vi.fn(),
}));

function form(passphrase: string) {
  const formData = new FormData();
  formData.set("passphrase", passphrase);
  return formData;
}

describe("login", () => {
  beforeEach(() => {
    vi.stubEnv("SITE_PASSPHRASE", "correct horse");
    vi.stubEnv("SESSION_SECRET", "test-session-secret");
    vi.mocked(readFailedLogins).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("sets a signed HTTP-only session cookie and redirects home on the right passphrase", async () => {
    await login({}, form("correct horse"));

    expect(cookieStore.set).toHaveBeenCalledWith(
      SESSION_COOKIE_NAME,
      expect.any(String),
      {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: SESSION_MAX_AGE_SECONDS,
      },
    );
    const [firstCall] = cookieStore.set.mock.calls;
    const [, token] = firstCall ?? [];
    expect(isValidSessionToken(token, "test-session-secret", new Date())).toBe(
      true,
    );
    expect(clearFailedLogins).toHaveBeenCalledWith(fakeDb, "203.0.113.7");
    expect(redirect).toHaveBeenCalledWith("/");
  });

  it("counts a wrong passphrase against the client and sets no cookie", async () => {
    const state = await login({}, form("wrong"));

    expect(state).toEqual({ error: "Wrong passphrase." });
    expect(recordFailedLogin).toHaveBeenCalledWith(
      fakeDb,
      "203.0.113.7",
      expect.any(Date),
    );
    expect(cookieStore.set).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("refuses even the right passphrase while the client is locked out", async () => {
    vi.mocked(readFailedLogins).mockResolvedValue({
      failures: 5,
      windowStartedAt: new Date(),
    });

    const state = await login({}, form("correct horse"));

    expect(state).toEqual({
      error: "Too many failed attempts. Try again later.",
    });
    expect(recordFailedLogin).not.toHaveBeenCalled();
    expect(cookieStore.set).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });
});
