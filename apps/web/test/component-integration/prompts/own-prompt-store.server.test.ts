// Own crafted prompts, against the test database: a new
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
  createConstruct,
  getOwnConstruct,
  listConstructs,
} from "@/constructs/construct-store.ts";
import { type ConstructDefinition, getConstruct } from "@/constructs/index.ts";
import type { NamedDefinition } from "@/prompts/prompt.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";

const SCRATCH_CONSTRUCT: NamedDefinition<ConstructDefinition> = {
  name: "Scratch construct",
  definition: getConstruct("vellum").definition,
};

const SCRATCH_ACTIVITY: NamedDefinition<ActivityDefinition> = {
  name: "Scratch activity",
  definition: getActivity("brainstorming").definition,
};

test("a crafted prompt has its name and parts and no source", async () => {
  const { id: owner } = await testUser();

  const construct = await createConstruct(owner, SCRATCH_CONSTRUCT);
  const activity = await createActivity(owner, SCRATCH_ACTIVITY);

  expect(construct).toMatchObject({
    ...SCRATCH_CONSTRUCT,
    clonedFrom: undefined,
  });
  expect(activity).toMatchObject({
    ...SCRATCH_ACTIVITY,
    clonedFrom: undefined,
  });
  expect(await getOwnConstruct(owner, construct.id)).toEqual(construct);
  expect(await getOwnActivity(owner, activity.id)).toEqual(activity);
});

test("a crafted prompt is its owner's alone", async () => {
  const [her, other] = await Promise.all([testUser(), testUser()]);

  const construct = await createConstruct(her.id, SCRATCH_CONSTRUCT);

  const [herConstructs, otherConstruct, otherConstructs] = await Promise.all([
    listConstructs(her.id),
    getOwnConstruct(other.id, construct.id),
    listConstructs(other.id),
  ]);
  expect(herConstructs).toEqual([construct]);
  expect(otherConstruct).toBeUndefined();
  expect(otherConstructs).toEqual([]);
});

test("a crafted prompt is found only as its own kind", async () => {
  const { id: owner } = await testUser();

  const [construct, activity] = await Promise.all([
    createConstruct(owner, SCRATCH_CONSTRUCT),
    createActivity(owner, SCRATCH_ACTIVITY),
  ]);

  const [asActivity, activities, asConstruct, constructs] = await Promise.all([
    getOwnActivity(owner, construct.id),
    listOwnActivities(owner),
    getOwnConstruct(owner, activity.id),
    listConstructs(owner),
  ]);
  expect(asActivity).toBeUndefined();
  expect(activities).toEqual([activity]);
  expect(asConstruct).toBeUndefined();
  expect(constructs).toEqual([construct]);
});
