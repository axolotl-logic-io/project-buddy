// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { FAKE_DATABASE_URL } from "@/db/fake-neon-http.ts";
import { hiddenFlagsCookie } from "@/flags/flag-choice.ts";
import {
  seedHiddenFlags,
  writeHiddenFlagsCookie,
} from "@/flags/seed-hidden-flags.ts";

const cookieJar = vi.hoisted(() => ({
  set: vi.fn<(cookie: ReturnType<typeof hiddenFlagsCookie>) => void>(),
}));
vi.mock("next/headers", () => ({
  cookies: (): Promise<typeof cookieJar> => Promise.resolve(cookieJar),
}));

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

describe("writeHiddenFlagsCookie", () => {
  test("sets the hidden-extras cookie for this browser", async () => {
    await writeHiddenFlagsCookie(["chat-names"]);

    expect(cookieJar.set).toHaveBeenCalledWith(
      hiddenFlagsCookie(["chat-names"]),
    );
  });
});

describe("seedHiddenFlags", () => {
  test("copies the known flags her account switched into this browser's cookie", async () => {
    await seedHiddenFlags(["tool-lines", "retired-flag", "working-notes"]);

    expect(cookieJar.set).toHaveBeenCalledWith(
      hiddenFlagsCookie(["working-notes", "tool-lines", "persona-mechanics"]),
    );
    expect(cookieJar.set).toHaveBeenCalledWith(
      expect.objectContaining({ value: "working-notes.tool-lines" }),
    );
  });

  test("replaces another choice with the defaults, persona mechanics hidden, when her account switched none", async () => {
    await seedHiddenFlags([]);

    expect(cookieJar.set).toHaveBeenCalledWith(
      hiddenFlagsCookie(["persona-mechanics"]),
    );
    expect(cookieJar.set).toHaveBeenCalledWith(
      expect.objectContaining({ value: "" }),
    );
  });

  test("shows the persona mechanics when her account switched them on", async () => {
    await seedHiddenFlags(["persona-mechanics"]);

    expect(cookieJar.set).toHaveBeenCalledWith(
      expect.objectContaining({ value: "persona-mechanics" }),
    );
  });

  test("reads nothing from the database, since sign-in has just read her extras", async () => {
    await seedHiddenFlags(["tool-lines"]);

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
