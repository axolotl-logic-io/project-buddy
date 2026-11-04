// Own prompts written from scratch, against the test database: a new
// prompt has the name and parts it was written with and no source, is its
// owner's alone, and is found only as its own kind.
import { expect, test } from "vitest";
import type { ActivityDefinition } from "@/activities/activity.ts";
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
import { type BuddyDefinition, getBuddy } from "@/buddies/index.ts";
import type { NamedDefinition } from "@/prompts/prompt.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";

const SCRATCH_BUDDY: NamedDefinition<BuddyDefinition> = {
  name: "Scratch buddy",
  definition: getBuddy("hippy").definition,
};

const SCRATCH_ACTIVITY: NamedDefinition<ActivityDefinition> = {
  name: "Scratch activity",
  definition: getActivity("brainstorming").definition,
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

  const [buddy, activity] = await Promise.all([
    createBuddy(owner, SCRATCH_BUDDY),
    createActivity(owner, SCRATCH_ACTIVITY),
  ]);

  const [asActivity, activities, asBuddy, buddies] = await Promise.all([
    getOwnActivity(owner, buddy.id),
    listOwnActivities(owner),
    getOwnBuddy(owner, activity.id),
    listBuddies(owner),
  ]);
  expect(asActivity).toBeUndefined();
  expect(activities).toEqual([activity]);
  expect(asBuddy).toBeUndefined();
  expect(buddies).toEqual([buddy]);
});
