// The spell store against the test database: her spells are hers alone, in
// the own prompt store beside her buddies and activities. Another user's
// spell, or a prompt of another kind, is found nowhere and changes nowhere.
import { describe, expect, test } from "vitest";
import { cloneActivity } from "@/activities/activity-store.ts";
import { cloneBuddy, listBuddies } from "@/buddies/buddy-store.ts";
import type { UserId } from "@/ids.ts";
import { getSpell } from "@/spells/index.ts";
import {
  cloneSpell,
  deleteSpell,
  getOwnSpell,
  listOwnSpells,
  type OwnSpell,
  updateSpell,
} from "@/spells/spell-store.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";

const ASK_ONE_QUESTION = getSpell("ask-one-question");

// A new user's copy of Ask one question at a time.
async function herCopy(): Promise<{
  readonly owner: UserId;
  readonly copy: OwnSpell;
}> {
  const { id: owner } = await testUser();
  const copy = await cloneSpell(owner, "ask-one-question");
  if (copy === undefined) {
    throw new Error("Ask one question at a time could not be cloned");
  }
  return { owner, copy };
}

describe("the spell store", () => {
  test("her copy of a built-in spell is hers to list, edit, clone and delete", async () => {
    const { owner, copy } = await herCopy();
    expect(copy).toMatchObject({
      name: `${ASK_ONE_QUESTION.name} (clone)`,
      parts: ASK_ONE_QUESTION.parts,
      clonedFrom: "ask-one-question",
    });

    const parts = { whenToUse: "When she asks.", instructions: "Do it." };
    const edited = await updateSpell(owner, copy.id, { name: "Mine", parts });
    expect(edited).toMatchObject({ name: "Mine", parts });
    const clone = await cloneSpell(owner, copy.id);
    expect(clone).toMatchObject({ name: "Mine (clone)", parts });
    expect((await listOwnSpells(owner)).map(({ id }) => id)).toEqual([
      copy.id,
      clone?.id,
    ]);

    expect(await deleteSpell(owner, copy.id)).toBe(true);
    expect(await deleteSpell(owner, copy.id)).toBe(false);
    expect(await getOwnSpell(owner, copy.id)).toBeUndefined();
    expect(getSpell("ask-one-question")).toEqual(ASK_ONE_QUESTION);
  });

  test("another user's spell is found nowhere and changes nowhere", async () => {
    const { owner, copy } = await herCopy();
    const { id: other } = await testUser();

    const [found, listed, edited, cloned, deleted] = await Promise.all([
      getOwnSpell(other, copy.id),
      listOwnSpells(other),
      updateSpell(other, copy.id, { name: "Taken" }),
      cloneSpell(other, copy.id),
      deleteSpell(other, copy.id),
    ]);

    expect(found).toBeUndefined();
    expect(listed).toEqual([]);
    expect(edited).toBeUndefined();
    expect(cloned).toBeUndefined();
    expect(deleted).toBe(false);
    expect(await getOwnSpell(owner, copy.id)).toEqual(copy);
  });

  test("her buddies and activities are not spells, nor her spells buddies", async () => {
    const { owner, copy } = await herCopy();
    const [buddy, activity] = await Promise.all([
      cloneBuddy(owner, "hippy"),
      cloneActivity(owner, "brainstorming"),
    ]);
    if (buddy === undefined || activity === undefined) {
      throw new Error("Her buddy or activity was not cloned");
    }

    expect(await listOwnSpells(owner)).toEqual([copy]);
    expect(await getOwnSpell(owner, buddy.id)).toBeUndefined();
    expect(await deleteSpell(owner, activity.id)).toBe(false);
    expect(await listBuddies(owner)).toEqual([buddy]);
  });
});
