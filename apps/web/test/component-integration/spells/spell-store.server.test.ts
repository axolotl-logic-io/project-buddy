// The spell store against the test database: her spells are hers alone, in
// the own prompt store beside her buddies and activities, and every write
// keeps to the spell limits. Another user's spell, or a prompt of another
// kind, is found nowhere and changes nowhere.
import { describe, expect, test } from "vitest";
import { cloneActivity } from "@/activities/activity-store.ts";
import { cloneBuddy, listBuddies } from "@/buddies/buddy-store.ts";
import type { UserId } from "@/ids.ts";
import { getSpell } from "@/spells/index.ts";
import {
  SPELL_NAME_MAX,
  SPELL_TEXT_MAX,
  type SpellDefinition,
} from "@/spells/spell.ts";
import {
  cloneSpell,
  createSpell,
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
      definition: ASK_ONE_QUESTION.definition,
      clonedFrom: "ask-one-question",
    });

    const parts = { whenToUse: "When she asks.", prompt: "Do it." };
    const edited = await updateSpell(owner, copy.id, {
      name: "Mine",
      definition: parts,
    });
    expect(edited).toMatchObject({ name: "Mine", definition: parts });
    const clone = await cloneSpell(owner, copy.id);
    expect(clone).toMatchObject({ name: "Mine (clone)", definition: parts });
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
      cloneBuddy(owner, "vellum"),
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

  test("every write refuses a name or part beyond its limit, saving nothing", async () => {
    const { owner, copy } = await herCopy();
    const tooLongName = "n".repeat(SPELL_NAME_MAX + 1);
    const tooLongParts: readonly SpellDefinition[] = [
      {
        ...copy.definition,
        whenToUse: "w".repeat(SPELL_TEXT_MAX.whenToUse + 1),
      },
      {
        ...copy.definition,
        prompt: "i".repeat(SPELL_TEXT_MAX.prompt + 1),
      },
    ];

    await expect(
      createSpell(owner, { name: tooLongName, definition: copy.definition }),
    ).rejects.toThrow();
    await expect(
      updateSpell(owner, copy.id, { name: tooLongName }),
    ).rejects.toThrow();
    await Promise.all(
      tooLongParts.map(async (parts) => {
        await expect(
          createSpell(owner, { name: copy.name, definition: parts }),
        ).rejects.toThrow();
        await expect(
          updateSpell(owner, copy.id, { definition: parts }),
        ).rejects.toThrow();
      }),
    );

    expect(await listOwnSpells(owner)).toEqual([copy]);
  });

  test("a clone of a spell whose name is at its limit gets a name within it", async () => {
    const { owner, copy } = await herCopy();
    const longest = "Long spell name ".repeat(10).slice(0, SPELL_NAME_MAX);
    await updateSpell(owner, copy.id, { name: longest });

    const clone = await cloneSpell(owner, copy.id);

    // The source's name, cut where " (clone)" still fits.
    const kept = longest.slice(0, SPELL_NAME_MAX - " (clone)".length);
    expect(clone?.name).toBe(`${kept} (clone)`);
  });
});
