// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { saveThemeChoiceAction } from "@/themes/save-theme-choice-action.ts";
import { themeChoiceSetCookie } from "@/themes/theme-choice.ts";
import { signOut } from "../auth/current-user-test-kit.ts";
import { FAKE_DATABASE_URL } from "../db/fake-neon-http.ts";

vi.mock(
  "@/auth/current-user.ts",
  () => import("../auth/current-user-test-kit.ts"),
);

const cookieJar = vi.hoisted(() => ({
  set: vi.fn<(cookie: ReturnType<typeof themeChoiceSetCookie>) => void>(),
}));
vi.mock("next/headers", () => ({
  cookies: (): Promise<typeof cookieJar> => Promise.resolve(cookieJar),
}));

// 365 days, in seconds.
const ONE_YEAR_S = 31_536_000;

// Any database query would go through fetch.
const fetchSpy = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("DATABASE_URL", FAKE_DATABASE_URL);
  vi.stubGlobal("fetch", fetchSpy);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("saveThemeChoiceAction", () => {
  test("saves the choice to this browser's cookie for a year", async () => {
    await saveThemeChoiceAction({ theme: "ay-liens", mode: "dark" });

    expect(cookieJar.set).toHaveBeenCalledWith({
      name: "theme",
      value: "ay-liens.dark",
      path: "/",
      sameSite: "lax",
      maxAge: ONE_YEAR_S,
    });
  });

  test.each([
    {
      raw: { theme: "no-such-theme", mode: "dark" },
      saved: { theme: "gravy-falls", mode: "dark" },
    },
    {
      raw: { theme: "ay-liens", mode: "dim" },
      saved: { theme: "ay-liens", mode: "system" },
    },
    { raw: null, saved: { theme: "gravy-falls", mode: "system" } },
    { raw: "x", saved: { theme: "gravy-falls", mode: "system" } },
  ] as const)(
    "saves the default for a bad part of $raw",
    async ({ raw, saved }) => {
      await expect(saveThemeChoiceAction(raw)).resolves.toBeUndefined();

      expect(cookieJar.set).toHaveBeenCalledWith(themeChoiceSetCookie(saved));
    },
  );

  test("saves the choice with nobody signed in", async () => {
    signOut();

    await expect(
      saveThemeChoiceAction({ theme: "ay-liens", mode: "light" }),
    ).resolves.toBeUndefined();

    expect(cookieJar.set).toHaveBeenCalledWith(
      themeChoiceSetCookie({ theme: "ay-liens", mode: "light" }),
    );
  });

  test("touches no database, since the theme belongs to the browser", async () => {
    await saveThemeChoiceAction({ theme: "ay-liens", mode: "dark" });

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
