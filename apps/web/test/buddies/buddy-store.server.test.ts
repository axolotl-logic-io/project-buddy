// The buddy store against the test database: her own buddy is found by its
// id in any case, keeps its name through an edit to its parts alone, and is
// gone once deleted. private-data-buddies.server.test.ts checks another
// user's buddy is found nowhere.
import { expect, test } from "vitest";
import {
  cloneBuddy,
  deleteBuddy,
  getUserBuddy,
  listBuddies,
  type UserBuddy,
  updateBuddy,
} from "@/buddies/buddy-store.ts";
import { getBuddy } from "@/buddies/index.ts";
import type { UserId } from "@/ids.ts";
import { testUser } from "../test-database/user-test-kit.ts";

// A new user's clone of Mr. Tee.
async function herClone(): Promise<{
  readonly owner: UserId;
  readonly clone: UserBuddy;
}> {
  const { id: owner } = await testUser();
  const clone = await cloneBuddy(owner, "mr-tee");
  if (clone === undefined) {
    throw new Error("Mr. Tee could not be cloned");
  }
  return { owner, clone };
}

test("her buddy is found by its id in capitals", async () => {
  const { owner, clone } = await herClone();

  expect(await getUserBuddy(owner, clone.id.toUpperCase())).toEqual(clone);
});

test("an edit to a buddy's parts alone keeps its name", async () => {
  const { owner, clone } = await herClone();
  const { parts } = getBuddy("hippy");

  await updateBuddy(owner, clone.id, { parts });

  expect(await getUserBuddy(owner, clone.id)).toMatchObject({
    name: clone.name,
    parts,
  });
});

test("her deleted buddy is found nowhere", async () => {
  const { owner, clone } = await herClone();

  expect(await deleteBuddy(owner, clone.id)).toBe(true);

  expect(await getUserBuddy(owner, clone.id)).toBeUndefined();
  expect(await listBuddies(owner)).toEqual([]);
});
