import { beforeEach, describe, expect, test, vi } from "vitest";
import { cloneBuddyAction } from "@/app/(workspace)/buddies/actions.ts";
import type { cloneBuddy, UserBuddy } from "@/buddies/buddy-store.ts";
import { getBuddy } from "@/buddies/index.ts";
import { AppError } from "@/errors/app-error.ts";
import {
  SIGNED_IN_USER,
  SIGNED_OUT_REDIRECT,
  signInAs,
  signOut,
} from "../../../auth/current-user-test-kit.ts";
import { userBuddyIdFixture } from "../../../id-fixtures.ts";

vi.mock(
  "@/auth/current-user.ts",
  () => import("../../../auth/current-user-test-kit.ts"),
);

const store = vi.hoisted(() => ({
  cloneBuddy: vi.fn<typeof cloneBuddy>(),
}));
vi.mock("@/buddies/buddy-store.ts", () => store);

const navigation = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
}));
vi.mock("next/navigation", () => navigation);

const CLONE: UserBuddy = {
  id: userBuddyIdFixture(),
  name: "Hippy (clone)",
  parts: getBuddy("hippy").parts,
  clonedFrom: "hippy",
  createdAt: new Date("2026-10-13T09:00:00Z"),
  updatedAt: new Date("2026-10-13T09:00:00Z"),
};

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    data.set(key, value);
  }
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  signInAs(SIGNED_IN_USER);
  store.cloneBuddy.mockResolvedValue(CLONE);
});

describe("cloneBuddyAction cloning", () => {
  test("clones the buddy for her, then shows her buddies", async () => {
    await expect(cloneBuddyAction(form({ sourceId: "hippy" }))).rejects.toThrow(
      "NEXT_REDIRECT /buddies",
    );

    expect(store.cloneBuddy).toHaveBeenCalledWith(SIGNED_IN_USER.id, "hippy");
    const [cloned] = store.cloneBuddy.mock.invocationCallOrder;
    const [redirected] = navigation.redirect.mock.invocationCallOrder;
    expect(cloned).toBeLessThan(redirected ?? 0);
  });

  test("shows her buddies when the source is unknown or another user's", async () => {
    store.cloneBuddy.mockResolvedValue(undefined);

    await expect(
      cloneBuddyAction(form({ sourceId: CLONE.id })),
    ).rejects.toThrow("NEXT_REDIRECT /buddies");

    expect(store.cloneBuddy).toHaveBeenCalledWith(SIGNED_IN_USER.id, CLONE.id);
  });
});

describe("cloneBuddyAction refusing", () => {
  test("clones nothing when the form names no source, or a file", async () => {
    const withFile = new FormData();
    withFile.set("sourceId", new File(["hippy"], "hippy.txt"));

    await expect(cloneBuddyAction(form({}))).rejects.toThrow(
      "NEXT_REDIRECT /buddies",
    );
    await expect(cloneBuddyAction(withFile)).rejects.toThrow(
      "NEXT_REDIRECT /buddies",
    );

    expect(store.cloneBuddy).not.toHaveBeenCalled();
  });

  test("clones nothing for a signed-out request", async () => {
    signOut();

    await expect(cloneBuddyAction(form({ sourceId: "hippy" }))).rejects.toThrow(
      SIGNED_OUT_REDIRECT,
    );

    expect(store.cloneBuddy).not.toHaveBeenCalled();
  });

  test("throws a storage failure on to the error boundary", async () => {
    const failure = new AppError("database-unreachable", new Error("x"));
    store.cloneBuddy.mockRejectedValue(failure);

    await expect(cloneBuddyAction(form({ sourceId: "hippy" }))).rejects.toBe(
      failure,
    );
    expect(navigation.redirect).not.toHaveBeenCalled();
  });
});
