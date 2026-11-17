import { and, eq } from "drizzle-orm";
import { describe, expect, test, vi } from "vitest";
import {
  deleteRetiredDefinitionAction,
  restoreDefinitionAction,
} from "@/app/(workspace)/retirement/actions.ts";
import { retireSpellAction } from "@/app/(workspace)/spellbook/actions.ts";
import { getDb } from "@/db/client.ts";
import { ownPrompts } from "@/db/tables/own-prompts.ts";
import {
  deleteRetiredDefinition,
  getRetiredDefinition,
  listRetiredDefinitions,
  restoreDefinition,
  retireDefinition,
} from "@/retirement/retirement-store.ts";
import {
  cloneSpell,
  getOwnSpell,
  listOwnSpells,
  updateSpell,
} from "@/spells/own-spell-store.ts";
import { cloneConstruct } from "../../support/test-database/historical-construct-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import {
  expectNotFound,
  expectRedirect,
} from "../test-database/navigation-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
function form(id: string): FormData {
  const data = new FormData();
  data.set("promptId", id);
  data.set("spellId", id);
  return data;
}
async function setup(): Promise<{
  owner: Awaited<ReturnType<typeof testUser>>;
  copy: NonNullable<Awaited<ReturnType<typeof cloneSpell>>>;
}> {
  const owner = await testUser();
  const copy = await cloneSpell(owner.id, "brainstorm");
  if (copy === undefined) {
    throw new Error("No spell copy");
  }
  await signIn(owner);
  return { owner, copy };
}

describe("use_case_retire_definitions", () => {
  test("retiring an own spell blocks stale edits, copies and active reads", async () => {
    const { owner, copy } = await setup();
    expect(await deleteRetiredDefinition(owner.id, copy.id)).toBe(false);
    await expectRedirect(
      () => retireSpellAction(form(copy.id)),
      "/spellbook?retired=1",
    );
    const retired = await getRetiredDefinition(owner.id, copy.id);
    expect(retired).toMatchObject({
      id: copy.id,
      name: copy.name,
      kind: "spell",
    });
    expect(retired?.texts.map((field) => field.name)).toEqual([
      "destination",
      "castReply",
      "savedReply",
      "stopReply",
      "invalidReply",
    ]);
    expect(await getOwnSpell(owner.id, copy.id)).toBeUndefined();
    expect(await listOwnSpells(owner.id)).toEqual([]);
    expect(await cloneSpell(owner.id, copy.id)).toBeUndefined();
    expect(
      await updateSpell(owner.id, copy.id, {
        name: "Stale",
        definition: copy.definition,
      }),
    ).toBeUndefined();
    expect(await retireDefinition(owner.id, "spell", copy.id)).toBe(false);
    expect((await getRetiredDefinition(owner.id, copy.id))?.retiredAt).toEqual(
      retired?.retiredAt,
    );
  });
});
describe("use_case_restore_retired_definition", () => {
  test("restoring a spell keeps its identity, destination, replies and source", async () => {
    const { owner, copy } = await setup();
    await retireDefinition(owner.id, "spell", copy.id);
    await expectRedirect(
      () => restoreDefinitionAction(form(copy.id)),
      "/retirement?restored=1",
    );
    expect(await getOwnSpell(owner.id, copy.id)).toEqual(copy);
    expect(await listRetiredDefinitions(owner.id)).toEqual([]);
    expect(await restoreDefinition(owner.id, copy.id)).toBe(false);
  });
});
describe("use_case_delete_retired_definition", () => {
  test("deletion requires retirement and refuses a stale confirmation after restore", async () => {
    const { owner, copy } = await setup();
    expect(await deleteRetiredDefinition(owner.id, copy.id)).toBe(false);
    await retireDefinition(owner.id, "spell", copy.id);
    await restoreDefinition(owner.id, copy.id);
    await expectNotFound(() => deleteRetiredDefinitionAction(form(copy.id)));
    expect(await getOwnSpell(owner.id, copy.id)).toEqual(copy);
    await retireDefinition(owner.id, "spell", copy.id);
    await expectRedirect(
      () => deleteRetiredDefinitionAction(form(copy.id)),
      "/retirement?deleted=1",
    );
    expect(await getRetiredDefinition(owner.id, copy.id)).toBeUndefined();
    expect(await deleteRetiredDefinition(owner.id, copy.id)).toBe(false);
  });
});
test("foreign spells cannot be read or changed through Graveyard", async () => {
  const { owner, copy } = await setup();
  const other = await testUser();
  expect(await retireDefinition(other.id, "spell", copy.id)).toBe(false);
  await retireDefinition(owner.id, "spell", copy.id);
  expect(await listRetiredDefinitions(other.id)).toEqual([]);
  expect(await getRetiredDefinition(other.id, copy.id)).toBeUndefined();
  expect(await restoreDefinition(other.id, copy.id)).toBe(false);
  expect(await deleteRetiredDefinition(other.id, copy.id)).toBe(false);
  await signIn(other);
  await expectNotFound(() => restoreDefinitionAction(form(copy.id)));
  await expectNotFound(() => deleteRetiredDefinitionAction(form(copy.id)));
  expect(await getRetiredDefinition(owner.id, copy.id)).toBeDefined();
});
test("historical custom constructs stay stored and cannot be retired, restored or deleted", async () => {
  const { owner, copy: spell } = await setup();
  const construct = await cloneConstruct(owner.id, "lumen");
  if (construct === undefined) {
    throw new Error("No historical construct");
  }
  expect(await retireDefinition(owner.id, "spell", construct.id)).toBe(false);
  await getDb()
    .update(ownPrompts)
    .set({ retiredAt: new Date() })
    .where(
      and(eq(ownPrompts.userId, owner.id), eq(ownPrompts.id, construct.id)),
    );
  const [before] = await getDb()
    .select()
    .from(ownPrompts)
    .where(eq(ownPrompts.id, construct.id));
  await retireDefinition(owner.id, "spell", spell.id);
  expect(
    (await listRetiredDefinitions(owner.id)).map((entry) => entry.id),
  ).toEqual([spell.id]);
  expect(await getRetiredDefinition(owner.id, construct.id)).toBeUndefined();
  expect(await restoreDefinition(owner.id, construct.id)).toBe(false);
  expect(await deleteRetiredDefinition(owner.id, construct.id)).toBe(false);
  await expectNotFound(() => restoreDefinitionAction(form(construct.id)));
  await expectNotFound(() => deleteRetiredDefinitionAction(form(construct.id)));
  const [after] = await getDb()
    .select()
    .from(ownPrompts)
    .where(eq(ownPrompts.id, construct.id));
  expect(after).toEqual(before);
});
