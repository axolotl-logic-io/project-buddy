import { beforeEach, describe, expect, test, vi } from "vitest";
import { SIGNED_IN_USER, signInAs } from "@/auth/current-user-test-kit.ts";
import type { listBuddies, UserBuddy } from "@/buddies/buddy-store.ts";
import { getBuddy } from "@/buddies/index.ts";
import { userBuddyIdFixture } from "@/id-fixtures.ts";
import { ownBuddyChoices } from "./own-buddy-choices.ts";

vi.mock(
  "@/auth/current-user.ts",
  () => import("@/auth/current-user-test-kit.ts"),
);

const store = vi.hoisted(() => ({
  listBuddies: vi.fn<typeof listBuddies>(),
}));
vi.mock("@/buddies/buddy-store.ts", () => store);

const OWN_BUDDY: UserBuddy = {
  id: userBuddyIdFixture(),
  name: "Mr. Tee (clone)",
  parts: getBuddy("mr-tee").parts,
  clonedFrom: "mr-tee",
  createdAt: new Date("2026-10-12T09:00:00Z"),
  updatedAt: new Date("2026-10-12T09:00:00Z"),
};

beforeEach(() => {
  vi.clearAllMocks();
  signInAs(SIGNED_IN_USER);
  store.listBuddies.mockResolvedValue([OWN_BUDDY]);
});

describe("ownBuddyChoices", () => {
  test("lists her own buddies by id and name alone, leaving their parts behind", async () => {
    expect(await ownBuddyChoices()).toEqual([
      { id: OWN_BUDDY.id, name: OWN_BUDDY.name },
    ]);
    expect(store.listBuddies).toHaveBeenCalledWith(SIGNED_IN_USER.id);
  });
});
