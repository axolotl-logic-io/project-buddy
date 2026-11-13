// Own crafted prompts, against the test database: a new
// prompt has the name and parts it was written with and no source, is its
// owner's alone, and is found only as its own kind.

import { expect, test } from "vitest";
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

test("a crafted prompt has its name and parts and no source", async () => {
  const { id: owner } = await testUser();

  const construct = await createConstruct(owner, SCRATCH_CONSTRUCT);

  expect(construct).toMatchObject({
    ...SCRATCH_CONSTRUCT,
    clonedFrom: undefined,
  });

  expect(await getOwnConstruct(owner, construct.id)).toEqual(construct);
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
