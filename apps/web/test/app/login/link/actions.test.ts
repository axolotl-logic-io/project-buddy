import { beforeEach, describe, expect, test, vi } from "vitest";
import type { readLoginLinkUser } from "@/accounts/login-links.ts";
import { continueSignInAction } from "@/app/login/link/actions.ts";
import { readSessionToken, type SessionCookie } from "@/auth/session-token.ts";
import { AppError } from "@/errors/app-error.ts";
import type { seedHiddenFlags } from "@/flags/seed-hidden-flags.ts";
import { userIdFixture } from "../../../id-fixtures.ts";

const SECRET = "test-session-secret-at-least-32-characters";
const TOKEN = "Ab3_-Ab3_-Ab3_-Ab3_-Ab3_-Ab3_-Ab3_-Ab3_-Ab3";
const USER = {
  id: userIdFixture("5b1f0c3e-8a2d-4c6b-9e7f-0a1b2c3d4e5f"),
  sessionEpoch: 2,
};
const HIDDEN_EXTRAS = ["tool-lines"];

const loginLinks = vi.hoisted(() => ({
  readLoginLinkUser: vi.fn<typeof readLoginLinkUser>(),
}));
vi.mock("@/accounts/login-links.ts", () => loginLinks);

const seed = vi.hoisted(() => ({
  seedHiddenFlags: vi.fn<typeof seedHiddenFlags>(),
}));
vi.mock("@/flags/seed-hidden-flags.ts", () => seed);

const cookieJar = vi.hoisted(() => ({
  set: vi.fn<(cookie: SessionCookie) => void>(),
}));
vi.mock("next/headers", () => ({
  cookies: (): Promise<typeof cookieJar> => Promise.resolve(cookieJar),
}));

const navigation = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
}));
vi.mock("next/navigation", () => navigation);

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    data.set(key, value);
  }
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("SESSION_SECRET", SECRET);
  loginLinks.readLoginLinkUser.mockResolvedValue({
    user: USER,
    hiddenExtras: HIDDEN_EXTRAS,
  });
  seed.seedHiddenFlags.mockResolvedValue();
});

describe("continueSignInAction", () => {
  test("signs the browser in as the link's user for 30 days, then shows the home page", async () => {
    await expect(continueSignInAction(form({ token: TOKEN }))).rejects.toThrow(
      "NEXT_REDIRECT /",
    );

    expect(loginLinks.readLoginLinkUser).toHaveBeenCalledWith(
      TOKEN,
      expect.any(Date),
    );
    const [cookie] = cookieJar.set.mock.lastCall ?? [];
    expect(cookie).toMatchObject({
      name: "session",
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 2_592_000,
    });
    expect(await readSessionToken(cookie?.value, SECRET, new Date())).toEqual(
      USER,
    );
  });

  test("shows the link's page again, which says it expired, for a link that no longer works", async () => {
    loginLinks.readLoginLinkUser.mockResolvedValue(undefined);

    await expect(continueSignInAction(form({ token: TOKEN }))).rejects.toThrow(
      `NEXT_REDIRECT /login/link?token=${TOKEN}`,
    );
    expect(cookieJar.set).not.toHaveBeenCalled();
  });

  test("reads a missing token as an empty one", async () => {
    loginLinks.readLoginLinkUser.mockResolvedValue(undefined);

    await expect(continueSignInAction(form({}))).rejects.toThrow(
      "NEXT_REDIRECT /login/link?token=",
    );
    expect(loginLinks.readLoginLinkUser).toHaveBeenCalledWith(
      "",
      expect.any(Date),
    );
  });

  test("signs no one in when the link can't be read", async () => {
    loginLinks.readLoginLinkUser.mockRejectedValue(
      new AppError("database-unreachable", new Error("down")),
    );

    await expect(
      continueSignInAction(form({ token: TOKEN })),
    ).rejects.toBeInstanceOf(AppError);
    expect(cookieJar.set).not.toHaveBeenCalled();
  });
});

describe("continueSignInAction and her hidden extras", () => {
  test("copies her account's hidden extras into this browser before showing the home page", async () => {
    await expect(continueSignInAction(form({ token: TOKEN }))).rejects.toThrow(
      "NEXT_REDIRECT /",
    );

    expect(seed.seedHiddenFlags).toHaveBeenCalledWith(HIDDEN_EXTRAS);
    const [seeded] = seed.seedHiddenFlags.mock.invocationCallOrder;
    const [signedIn] = cookieJar.set.mock.invocationCallOrder;
    const [redirected] = navigation.redirect.mock.invocationCallOrder;
    expect(seeded).toBeLessThan(signedIn ?? 0);
    expect(seeded).toBeLessThan(redirected ?? 0);
  });

  test("copies nothing for a link that no longer works", async () => {
    loginLinks.readLoginLinkUser.mockResolvedValue(undefined);

    await expect(continueSignInAction(form({ token: TOKEN }))).rejects.toThrow(
      `NEXT_REDIRECT /login/link?token=${TOKEN}`,
    );
    expect(seed.seedHiddenFlags).not.toHaveBeenCalled();
  });
});
