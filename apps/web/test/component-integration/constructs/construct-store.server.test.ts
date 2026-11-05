// The construct store against the test database: her own construct is found by its
// id in any case, keeps its name through an edit to its parts alone, and is
// gone once deleted. private-data-constructs.server.test.ts checks another
// user's construct is found nowhere.
import { expect, test } from "vitest";
import {
  cloneConstruct,
  deleteConstruct,
  getOwnConstruct,
  listConstructs,
  type OwnConstruct,
  updateConstruct,
} from "@/constructs/construct-store.ts";
import { getConstruct } from "@/constructs/index.ts";
import type { UserId } from "@/ids.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";

// A new user's clone of Lumen.
async function herClone(): Promise<{
  readonly owner: UserId;
  readonly clone: OwnConstruct;
}> {
  const { id: owner } = await testUser();
  const clone = await cloneConstruct(owner, "lumen");
  if (clone === undefined) {
    throw new Error("Lumen could not be cloned");
  }
  return { owner, clone };
}

test("her construct is found by its id in capitals", async () => {
  const { owner, clone } = await herClone();

  expect(await getOwnConstruct(owner, clone.id.toUpperCase())).toEqual(clone);
});

test("an edit to a construct's parts alone keeps its name", async () => {
  const { owner, clone } = await herClone();
  const { definition: parts } = getConstruct("vellum");

  await updateConstruct(owner, clone.id, { definition: parts });

  expect(await getOwnConstruct(owner, clone.id)).toMatchObject({
    name: clone.name,
    definition: parts,
  });
});

test("her deleted construct is found nowhere", async () => {
  const { owner, clone } = await herClone();

  expect(await deleteConstruct(owner, clone.id)).toBe(true);

  expect(await getOwnConstruct(owner, clone.id)).toBeUndefined();
  expect(await listConstructs(owner)).toEqual([]);
});
