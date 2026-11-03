// Own prompts written from scratch, against the test database: a new
// prompt has the name and parts it was written with and no source, is its
// owner's alone, and is found only as its own kind.
import { expect, test } from "vitest";
import type { ActivityParts } from "@/activities/activity.ts";
import {
  createActivity,
  getOwnActivity,
  listOwnActivities,
} from "@/activities/activity-store.ts";
import { getActivity } from "@/activities/index.ts";
import {
  createBuddy,
  getOwnBuddy,
  listBuddies,
} from "@/buddies/buddy-store.ts";
import { type BuddyParts, getBuddy } from "@/buddies/index.ts";
import type { PromptSnapshot } from "@/prompts/prompt.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";

const SCRATCH_BUDDY: PromptSnapshot<BuddyParts> = {
  name: "Scratch buddy",
  parts: getBuddy("hippy").parts,
};

const SCRATCH_ACTIVITY: PromptSnapshot<ActivityParts> = {
  name: "Scratch activity",
  parts: getActivity("brainstorming").parts,
};

test("a prompt written from scratch has its name and parts and no source", async () => {
  const { id: owner } = await testUser();

  const buddy = await createBuddy(owner, SCRATCH_BUDDY);
  const activity = await createActivity(owner, SCRATCH_ACTIVITY);

  expect(buddy).toMatchObject({ ...SCRATCH_BUDDY, clonedFrom: undefined });
  expect(activity).toMatchObject({
    ...SCRATCH_ACTIVITY,
    clonedFrom: undefined,
  });
  expect(await getOwnBuddy(owner, buddy.id)).toEqual(buddy);
  expect(await getOwnActivity(owner, activity.id)).toEqual(activity);
});

test("a prompt written from scratch is its owner's alone", async () => {
  const [her, other] = await Promise.all([testUser(), testUser()]);

  const buddy = await createBuddy(her.id, SCRATCH_BUDDY);

  const [herBuddies, otherBuddy, otherBuddies] = await Promise.all([
    listBuddies(her.id),
    getOwnBuddy(other.id, buddy.id),
    listBuddies(other.id),
  ]);
  expect(herBuddies).toEqual([buddy]);
  expect(otherBuddy).toBeUndefined();
  expect(otherBuddies).toEqual([]);
});

test("a prompt written from scratch is found only as its own kind", async () => {
  const { id: owner } = await testUser();

  const buddy = await createBuddy(owner, SCRATCH_BUDDY);

  const [asActivity, activities] = await Promise.all([
    getOwnActivity(owner, buddy.id),
    listOwnActivities(owner),
  ]);
  expect(asActivity).toBeUndefined();
  expect(activities).toEqual([]);
});
