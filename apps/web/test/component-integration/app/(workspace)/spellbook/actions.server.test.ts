// Her spells, from the Spellbook pages' forms, in the test database:
// customizing a built-in spell makes a copy of her own, and New spell writes
// one from scratch, which she edits within its limits, clones, resets,
// deletes and has the buddy cast; the built-in spells and other users'
// spells are never changed.
import { getToolName, isToolUIPart } from "ai";
import { describe, expect, test, vi } from "vitest";
import type { User } from "@/accounts/users-store.ts";
import {
  cloneSpellAction,
  deleteSpellAction,
  editBuiltInSpellAction,
  newSpellAction,
  resetSpellPromptAction,
  saveSpellAction,
} from "@/app/(workspace)/spellbook/actions.ts";
import { createStandaloneChat } from "@/chats/standalone-chat.ts";
import {
  CAST_SPELL_OUTPUT,
  CAST_SPELL_TOOL,
} from "@/spells/cast-spell-contract.ts";
import { spellResetPrompt } from "@/spells/default-prompt.ts";
import { getSpell } from "@/spells/index.ts";
import {
  SPELL_NAME_MAX,
  SPELL_TEXT_MAX,
  type SpellDefinition,
} from "@/spells/spell.ts";
import {
  getOwnSpell,
  listOwnSpells,
  type OwnSpell,
} from "@/spells/spell-store.ts";
import { SPELLBOOK_COPY } from "@/ui/copy/spells.ts";
import { testUser } from "../../../../support/test-database/user-test-kit.ts";
import {
  buddyPrompt,
  buddyReply,
  formOf,
} from "../../../test-database/chat-test-kit.ts";
import {
  expectNotFound,
  expectRedirect,
} from "../../../test-database/navigation-test-kit.ts";
import { signIn } from "../../../test-database/session-test-kit.ts";

vi.mock("next/cache", () => ({ refresh: vi.fn(), revalidatePath: vi.fn() }));

const ASK_ONE_QUESTION = getSpell("ask-one-question");

// The spell page's form: the spell's id, its name and every part.
function spellForm(
  spellId: string,
  name: string,
  parts: SpellDefinition,
): FormData {
  const data = formOf({ spellId, name });
  for (const key of ["prompt", "whenToUse"] as const) {
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

// Writes a new spell, as the New spell button does, and returns it: her
// newest spell.
async function writeNew(user: User): Promise<OwnSpell> {
  const writing = newSpellAction();
  await Promise.allSettled([writing]);
  const spell = (await listOwnSpells(user.id)).at(-1);
  if (spell === undefined) {
    throw new Error("New spell made no spell");
  }
  await expectRedirect(() => writing, `/spellbook/${spell.id}`);
  return spell;
}

// Resets the part of her spell with this id, as its Reset button does.
async function resetPrompt(spellId: string): Promise<void> {
  await expectRedirect(
    () => resetSpellPromptAction(formOf({ spellId })),
    `/spellbook/${spellId}`,
  );
}

describe("use_case_customize_spell", () => {
  test("her copy of a built-in spell is hers to edit, clone, reset and delete", async () => {
    const user = await signedInUser();
    const copy = await customize(user);
    expect(copy).toMatchObject({
      name: `${ASK_ONE_QUESTION.name} (clone)`,
      definition: ASK_ONE_QUESTION.definition,
    });

    const edited: SpellDefinition = {
      whenToUse: "When she plans a render.",
      prompt: "Ask about the lights first.\r\nThen the camera.",
    };
    await expectRedirect(
      () => saveSpellAction(spellForm(copy.id, "Render plan", edited)),
      `/spellbook/${copy.id}`,
    );
    expect(await stored(user, copy.id)).toMatchObject({
      name: "Render plan",
      definition: {
        ...edited,
        prompt: "Ask about the lights first.\nThen the camera.",
      },
    });

    await expectRedirect(
      () => cloneSpellAction(formOf({ sourceId: copy.id })),
      "/spellbook",
    );
    const clone = (await listOwnSpells(user.id)).at(-1);
    expect(clone).toMatchObject({ name: "Render plan (clone)" });

    await resetPrompt(copy.id);
    expect((await stored(user, copy.id)).definition).toEqual({
      whenToUse: "When she plans a render.",
      prompt: ASK_ONE_QUESTION.definition.prompt,
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
    const longest: SpellDefinition = {
      whenToUse: "w".repeat(SPELL_TEXT_MAX.whenToUse),
      prompt: "i".repeat(SPELL_TEXT_MAX.prompt),
    };

    // Refused saves write nothing, so they can run together.
    const tooLong = [
      spellForm(copy.id, "n".repeat(SPELL_NAME_MAX + 1), copy.definition),
      ...(["prompt", "whenToUse"] as const).map((key) =>
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
    expect(await stored(user, copy.id)).toMatchObject({
      name,
      definition: longest,
    });
  });

  test("a clone of a spell with the longest name saves as it is", async () => {
    const user = await signedInUser();
    const copy = await customize(user);
    const longest = "n".repeat(SPELL_NAME_MAX);
    await saveSpellAction(spellForm(copy.id, longest, copy.definition)).catch(
      () => undefined,
    );

    await expectRedirect(
      () => cloneSpellAction(formOf({ sourceId: copy.id })),
      "/spellbook",
    );
    const clone = (await listOwnSpells(user.id)).at(-1);
    if (clone === undefined || clone.id === copy.id) {
      throw new Error("Cloning made no spell");
    }

    await expectRedirect(
      () => saveSpellAction(spellForm(clone.id, clone.name, clone.definition)),
      `/spellbook/${clone.id}`,
    );
    expect(clone.name.length).toBeLessThanOrEqual(SPELL_NAME_MAX);
    expect(clone.name.endsWith(" (clone)")).toBe(true);
  });

  test("another user's spell, or one that isn't built in, is not found", async () => {
    const owner = await signedInUser();
    const copy = await customize(owner);

    await signedInUser();
    await expectNotFound(() =>
      saveSpellAction(spellForm(copy.id, "Taken", copy.definition)),
    );
    await expectNotFound(() =>
      resetSpellPromptAction(formOf({ spellId: copy.id, part: "whenToUse" })),
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

describe("use_case_new_spell", () => {
  test("a new spell starts with default instructions, and each New spell makes another", async () => {
    const user = await signedInUser();

    const spell = await writeNew(user);
    expect(spell).toMatchObject({
      name: SPELLBOOK_COPY.newSpellName,
      definition: {
        whenToUse: "Never: this spell has no when-to-use line yet.",
        prompt: spellResetPrompt(undefined).prompt,
      },
      clonedFrom: undefined,
    });

    await saveSpellAction(
      spellForm(spell.id, spell.name, {
        whenToUse: "Edited.",
        prompt: "Edited too.",
      }),
    ).catch(() => undefined);
    await resetPrompt(spell.id);
    expect((await stored(user, spell.id)).definition).toEqual({
      ...spell.definition,
      whenToUse: "Edited.",
    });

    await writeNew(user);
    expect((await listOwnSpells(user.id)).map(({ name }) => name)).toEqual([
      SPELLBOOK_COPY.newSpellName,
      SPELLBOOK_COPY.newSpellName,
    ]);
  });

  test("her new spell is listed to the buddy, cast in a chat, and hers alone", async () => {
    const user = await signedInUser();
    const spell = await writeNew(user);
    const parts: SpellDefinition = {
      whenToUse: "When the user plans a picnic.",
      prompt: "Ask where, then when, then who comes.",
    };
    await expectRedirect(
      () => saveSpellAction(spellForm(spell.id, "Picnic plan", parts)),
      `/spellbook/${spell.id}`,
    );

    const chat = await createStandaloneChat(user.id);
    expect(await buddyPrompt(chat.id)).toContain(
      `\`${spell.id}\`: Picnic plan. ${parts.whenToUse}`,
    );
    const reply = await buddyReply(chat.id, `/mock-cast ${spell.id}`);
    const cast = reply.parts.find(
      (part) => isToolUIPart(part) && getToolName(part) === CAST_SPELL_TOOL,
    );
    if (cast === undefined || !("output" in cast)) {
      throw new Error("The buddy didn't call cast_spell");
    }
    expect(CAST_SPELL_OUTPUT.parse(cast.output)).toEqual({
      status: "cast",
      spellId: spell.id,
      name: "Picnic plan",
      instructions: parts.prompt,
    });

    const other = await signedInUser();
    await expectNotFound(() =>
      saveSpellAction(spellForm(spell.id, "Taken", parts)),
    );
    expect(await listOwnSpells(other.id)).toEqual([]);
    expect((await stored(user, spell.id)).name).toBe("Picnic plan");
  });
});
