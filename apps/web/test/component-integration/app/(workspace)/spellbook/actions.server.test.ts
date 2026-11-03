// Her spells, from the Spellbook pages' forms, in the test database:
// customizing a built-in spell makes a copy of her own, which she edits
// within its limits, clones, resets and deletes; the built-in spells and
// other users' spells are never changed.
import { describe, expect, test, vi } from "vitest";
import type { User } from "@/accounts/users-store.ts";
import {
  cloneSpellAction,
  deleteSpellAction,
  editBuiltInSpellAction,
  resetSpellPartAction,
  saveSpellAction,
} from "@/app/(workspace)/spellbook/actions.ts";
import { getSpell } from "@/spells/index.ts";
import { SPELL_PART_KEYS } from "@/spells/part-defaults.ts";
import {
  SPELL_NAME_MAX,
  SPELL_PART_MAX,
  type SpellParts,
} from "@/spells/spell.ts";
import {
  getOwnSpell,
  listOwnSpells,
  type OwnSpell,
} from "@/spells/spell-store.ts";
import { testUser } from "../../../../support/test-database/user-test-kit.ts";
import { formOf } from "../../../test-database/chat-test-kit.ts";
import {
  expectNotFound,
  expectRedirect,
} from "../../../test-database/navigation-test-kit.ts";
import { signIn } from "../../../test-database/session-test-kit.ts";

vi.mock("next/cache", () => ({ refresh: vi.fn(), revalidatePath: vi.fn() }));

const ASK_ONE_QUESTION = getSpell("ask-one-question");

// The spell page's form: the spell's id, its name and every part.
function spellForm(spellId: string, name: string, parts: SpellParts): FormData {
  const data = formOf({ spellId, name });
  for (const key of SPELL_PART_KEYS) {
    data.set(key, parts[key]);
  }
  return data;
}

// A new user, signed in.
async function signedInUser(): Promise<User> {
  const user = await testUser();
  await signIn(user);
  return user;
}

// Her spell with this id, as stored.
async function stored(user: User, spellId: string): Promise<OwnSpell> {
  const spell = await getOwnSpell(user.id, spellId);
  if (spell === undefined) {
    throw new Error(`${spellId} is not hers`);
  }
  return spell;
}

// Customizes Ask one question at a time, as its Customize button does, and
// returns her new copy.
async function customize(user: User): Promise<OwnSpell> {
  const customizing = editBuiltInSpellAction(
    formOf({ spellId: "ask-one-question" }),
  );
  await Promise.allSettled([customizing]);
  const [copy] = await listOwnSpells(user.id);
  if (copy === undefined) {
    throw new Error("Customizing made no spell");
  }
  await expectRedirect(() => customizing, `/spellbook/${copy.id}`);
  return copy;
}

describe("use_case_customize_spell", () => {
  test("her copy of a built-in spell is hers to edit, clone, reset and delete", async () => {
    const user = await signedInUser();
    const copy = await customize(user);
    expect(copy).toMatchObject({
      name: `${ASK_ONE_QUESTION.name} (clone)`,
      parts: ASK_ONE_QUESTION.parts,
    });

    const edited: SpellParts = {
      whenToUse: "When she plans a render.",
      instructions: "Ask about the lights first.\r\nThen the camera.",
    };
    await expectRedirect(
      () => saveSpellAction(spellForm(copy.id, "Render plan", edited)),
      `/spellbook/${copy.id}`,
    );
    expect(await stored(user, copy.id)).toMatchObject({
      name: "Render plan",
      parts: {
        ...edited,
        instructions: "Ask about the lights first.\nThen the camera.",
      },
    });

    await expectRedirect(
      () => cloneSpellAction(formOf({ sourceId: copy.id })),
      "/spellbook",
    );
    const clone = (await listOwnSpells(user.id)).at(-1);
    expect(clone).toMatchObject({ name: "Render plan (clone)" });

    await expectRedirect(
      () =>
        resetSpellPartAction(formOf({ spellId: copy.id, part: "whenToUse" })),
      `/spellbook/${copy.id}`,
    );
    expect((await stored(user, copy.id)).parts).toEqual({
      whenToUse: ASK_ONE_QUESTION.parts.whenToUse,
      instructions: "Ask about the lights first.\nThen the camera.",
    });

    await expectRedirect(
      () => deleteSpellAction(formOf({ spellId: copy.id })),
      "/spellbook",
    );
    expect((await listOwnSpells(user.id)).map(({ id }) => id)).toEqual([
      clone?.id,
    ]);
    expect(getSpell("ask-one-question")).toEqual(ASK_ONE_QUESTION);
  });

  test("a name or part longer than its limit saves nothing", async () => {
    const user = await signedInUser();
    const copy = await customize(user);
    const longest: SpellParts = {
      whenToUse: "w".repeat(SPELL_PART_MAX.whenToUse),
      instructions: "i".repeat(SPELL_PART_MAX.instructions),
    };

    // Refused saves write nothing, so they can run together.
    const tooLong = [
      spellForm(copy.id, "n".repeat(SPELL_NAME_MAX + 1), copy.parts),
      ...SPELL_PART_KEYS.map((key) =>
        spellForm(copy.id, copy.name, {
          ...longest,
          [key]: `${longest[key]}x`,
        }),
      ),
    ];
    await Promise.all(
      tooLong.map((form) => expectNotFound(() => saveSpellAction(form))),
    );
    expect(await stored(user, copy.id)).toEqual(copy);

    const name = "n".repeat(SPELL_NAME_MAX);
    await expectRedirect(
      () => saveSpellAction(spellForm(copy.id, name, longest)),
      `/spellbook/${copy.id}`,
    );
    expect(await stored(user, copy.id)).toMatchObject({ name, parts: longest });
  });

  test("another user's spell, or one that isn't built in, is not found", async () => {
    const owner = await signedInUser();
    const copy = await customize(owner);

    await signedInUser();
    await expectNotFound(() =>
      saveSpellAction(spellForm(copy.id, "Taken", copy.parts)),
    );
    await expectNotFound(() =>
      resetSpellPartAction(formOf({ spellId: copy.id, part: "whenToUse" })),
    );
    await expectNotFound(() =>
      editBuiltInSpellAction(formOf({ spellId: copy.id })),
    );
    await expectRedirect(
      () => deleteSpellAction(formOf({ spellId: copy.id })),
      "/spellbook",
    );
    expect(await stored(owner, copy.id)).toEqual(copy);
  });
});
