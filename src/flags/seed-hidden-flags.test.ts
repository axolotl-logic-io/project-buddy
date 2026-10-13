import { beforeEach, describe, expect, test, vi } from "vitest";
import type { readSessionUser } from "@/accounts/users-store.ts";
import { hiddenFlagsCookie } from "@/flags/flag-choice.ts";
import {
  seedHiddenFlags,
  writeHiddenFlagsCookie,
} from "@/flags/seed-hidden-flags.ts";
import { userIdFixture } from "@/id-fixtures.ts";

const SESSION_USER = {
  id: userIdFixture("5b1f0c3e-8a2d-4c6b-9e7f-0a1b2c3d4e5f"),
  sessionEpoch: 2,
};

const usersStore = vi.hoisted(() => ({
  readSessionUser: vi.fn<typeof readSessionUser>(),
}));
vi.mock("@/accounts/users-store.ts", () => usersStore);

const cookieJar = vi.hoisted(() => ({
  set: vi.fn<(cookie: ReturnType<typeof hiddenFlagsCookie>) => void>(),
}));
vi.mock("next/headers", () => ({
  cookies: (): Promise<typeof cookieJar> => Promise.resolve(cookieJar),
}));

beforeEach(() => {
  vi.clearAllMocks();
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
  test("copies the known flags her account hides into this browser's cookie", async () => {
    usersStore.readSessionUser.mockResolvedValue({
      ...SESSION_USER,
      email: "mabel@example.test",
      hiddenExtras: ["tool-lines", "retired-flag", "working-notes"],
    });

    await seedHiddenFlags(SESSION_USER);

    expect(usersStore.readSessionUser).toHaveBeenCalledWith(
      SESSION_USER.id,
      SESSION_USER.sessionEpoch,
    );
    expect(cookieJar.set).toHaveBeenCalledWith(
      hiddenFlagsCookie(["working-notes", "tool-lines"]),
    );
  });

  test("replaces another choice with every extra shown when her account hides none", async () => {
    usersStore.readSessionUser.mockResolvedValue({
      ...SESSION_USER,
      email: "mabel@example.test",
      hiddenExtras: [],
    });

    await seedHiddenFlags(SESSION_USER);

    expect(cookieJar.set).toHaveBeenCalledWith(hiddenFlagsCookie([]));
  });

  test("copies nothing for a user who is gone", async () => {
    usersStore.readSessionUser.mockResolvedValue(undefined);

    await seedHiddenFlags(SESSION_USER);

    expect(cookieJar.set).not.toHaveBeenCalled();
  });
});
