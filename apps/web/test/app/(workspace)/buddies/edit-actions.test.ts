import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  editBuiltInBuddyAction,
  resetBuddyPartAction,
  saveBuddyAction,
} from "@/app/(workspace)/buddies/actions.ts";
import type {
  cloneBuddy,
  getUserBuddy,
  UserBuddy,
  updateBuddy,
} from "@/buddies/buddy-store.ts";
import { type BuddyParts, getBuddy } from "@/buddies/index.ts";
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
  getUserBuddy: vi.fn<typeof getUserBuddy>(),
  updateBuddy: vi.fn<typeof updateBuddy>(),
}));
vi.mock("@/buddies/buddy-store.ts", () => store);

const navigation = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));
vi.mock("next/navigation", () => navigation);

const MR_TEE: BuddyParts = getBuddy("mr-tee").parts;

// Her clone of Mr. Tee, with its voice and citation rules edited.
const BUDDY: UserBuddy = {
  id: userBuddyIdFixture(),
  name: "Mr. Tee (clone)",
  parts: { ...MR_TEE, voice: "Pity the fool.", citation: "Cite nothing." },
  clonedFrom: "mr-tee",
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

function saveForm(parts: BuddyParts): FormData {
  return form({ buddyId: BUDDY.id, name: " Mr. Tee, edited ", ...parts });
}

beforeEach(() => {
  vi.clearAllMocks();
  signInAs(SIGNED_IN_USER);
  store.cloneBuddy.mockResolvedValue(BUDDY);
  store.getUserBuddy.mockResolvedValue(BUDDY);
  store.updateBuddy.mockResolvedValue(BUDDY);
});

describe("saveBuddyAction", () => {
  test("saves nothing without a name or a part, or signed out", async () => {
    const { answerNow: _missing, ...partial } = MR_TEE;

    await expect(
      saveBuddyAction(form({ buddyId: BUDDY.id, name: "X", ...partial })),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(
      saveBuddyAction(form({ buddyId: BUDDY.id, name: " ", ...MR_TEE })),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    signOut();
    await expect(saveBuddyAction(saveForm(MR_TEE))).rejects.toThrow(
      SIGNED_OUT_REDIRECT,
    );

    expect(store.updateBuddy).not.toHaveBeenCalled();
  });
});

describe("resetBuddyPartAction", () => {
  test("changes nothing for an unknown or foreign buddy, or no part", async () => {
    await expect(
      resetBuddyPartAction(form({ buddyId: BUDDY.id, part: "toString" })),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    store.getUserBuddy.mockResolvedValue(undefined);
    await expect(
      resetBuddyPartAction(form({ buddyId: "hippy", part: "voice" })),
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(store.updateBuddy).not.toHaveBeenCalled();
  });
});

describe("editBuiltInBuddyAction", () => {
  test("clones nothing for an id that is not a built-in buddy's", async () => {
    await expect(
      editBuiltInBuddyAction(form({ buddyId: BUDDY.id })),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(
      editBuiltInBuddyAction(form({ buddyId: "nobody" })),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(editBuiltInBuddyAction(form({}))).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );

    expect(store.cloneBuddy).not.toHaveBeenCalled();
  });
});
