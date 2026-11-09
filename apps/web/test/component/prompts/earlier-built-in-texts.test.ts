// Own copies of built-in constructs, activities and spells are stored in the
// texts the build before the rename from buddies gives them, and read back in
// today's. The expected earlier texts are recorded fixtures from that build,
// not derived from today's texts. That build knows a copy of a built-in one
// only by exact equality with its own text: this is its whole check.
import { expect, test } from "vitest";
import type { ActivityDefinition } from "@/activities/activity.ts";
import {
  parseActivityDefinition,
  storedActivityPrompt,
} from "@/activities/activity-definition.ts";
import { getActivity } from "@/activities/index.ts";
import { preparedOpening } from "@/activities/prepared-openings.ts";
import type { ConstructDefinition } from "@/constructs/construct.ts";
import {
  parseConstructDefinition,
  storedConstructPrompt,
} from "@/constructs/construct-definition.ts";
import { getConstruct, listConstructs } from "@/constructs/index.ts";
import {
  currentActivityText,
  currentConstructText,
  currentSpellText,
  earlierActivityText,
  earlierConstructText,
  earlierSpellText,
} from "@/prompts/earlier-built-in-texts.ts";
import { EARLIER_BUILT_INS } from "@/prompts/earlier-built-ins.ts";
import {
  matchingBuiltInActivity,
  matchingBuiltInConstruct,
  matchingBuiltInSpell,
} from "@/prompts/matching-built-in.ts";
import { NAMED_SHEET_BUILT_INS } from "@/prompts/named-sheet-built-ins.ts";
import { getSpell, listSpells } from "@/spells/index.ts";
import type { SpellDefinition } from "@/spells/spell.ts";
import {
  parseSpellDefinition,
  storedSpellPrompt,
} from "@/spells/spell-definition.ts";
import {
  EARLIER_BLENDER_MANUAL_LOOKUP,
  EARLIER_BRAINSTORMING,
  EARLIER_INTERVIEW,
  EARLIER_LUMEN_PROMPT,
  EARLIER_OPEN_CHAT,
  EARLIER_VELLUM_PROMPT,
} from "../../support/earlier-built-in-fixtures.ts";

// How the stores write and read a construct's parts.
function writeConstruct(text: ConstructDefinition): unknown {
  return storedConstructPrompt(earlierConstructText(text));
}
function readConstruct(stored: unknown): ConstructDefinition | undefined {
  const text = parseConstructDefinition(stored);
  if (text === undefined) {
    return;
  }
  return currentConstructText(text);
}
function writeActivity(text: ActivityDefinition): unknown {
  return storedActivityPrompt(earlierActivityText(text));
}
function readActivity(stored: unknown): ActivityDefinition | undefined {
  const text = parseActivityDefinition(stored);
  if (text === undefined) {
    return;
  }
  return currentActivityText(text);
}
function writeSpell(text: SpellDefinition): unknown {
  return storedSpellPrompt(earlierSpellText(text));
}
function readSpell(stored: unknown): SpellDefinition | undefined {
  const text = parseSpellDefinition(stored);
  if (text === undefined) {
    return;
  }
  return currentSpellText(text);
}

test("the earlier Vellum fixture is the authentic one: Buddy in its heading, construct already in its text", () => {
  expect(EARLIER_VELLUM_PROMPT.startsWith("# Buddy: Vellum\n")).toBe(true);
  expect(EARLIER_VELLUM_PROMPT).toContain("a small brass construct");
  expect(getConstruct("vellum").definition.prompt).toBe(
    EARLIER_VELLUM_PROMPT.replace("# Buddy: Vellum\n", "# Character Sheet\n"),
  );
});

test("the recorded texts preserve the built-ins available before discovery was added", () => {
  expect(new Set(Object.keys(EARLIER_BUILT_INS.constructs))).toEqual(
    new Set(listConstructs().map((construct) => construct.id)),
  );
  expect(new Set(Object.keys(EARLIER_BUILT_INS.activities))).toEqual(
    new Set(["open-chat", "interview", "brainstorming", "project-breakdown"]),
  );
  expect(new Set(Object.keys(EARLIER_BUILT_INS.spells))).toEqual(
    new Set(listSpells().map((spell) => spell.id)),
  );
  const { vellum, lumen } = EARLIER_BUILT_INS.constructs;
  const { interview, brainstorming } = EARLIER_BUILT_INS.activities;
  expect(vellum).toEqual({ prompt: EARLIER_VELLUM_PROMPT });
  expect(lumen).toEqual({ prompt: EARLIER_LUMEN_PROMPT });
  expect(interview).toEqual(EARLIER_INTERVIEW);
  expect(brainstorming).toEqual(EARLIER_BRAINSTORMING);
  expect(EARLIER_BUILT_INS.spells["blender-manual-lookup"]).toEqual(
    EARLIER_BLENDER_MANUAL_LOOKUP,
  );
});

test.each([
  ["vellum", EARLIER_VELLUM_PROMPT],
  ["lumen", EARLIER_LUMEN_PROMPT],
] as const)(
  "an unchanged copy of %s is written in the earlier build's text, and read back in today's",
  (id, earlier) => {
    const current = getConstruct(id).definition;
    const stored = writeConstruct(current);

    expect(stored).toEqual({
      voice: earlier,
      habits: "",
      visual: current.visual,
    });
    // The earlier build reads the voice as the prompt and compares it exactly.
    expect(parseConstructDefinition(stored)?.prompt === earlier).toBe(true);
    expect(readConstruct(stored)).toEqual(current);
    expect(readConstruct({ voice: earlier, habits: "" })).toEqual({
      prompt: current.prompt,
      visual: undefined,
    });
    expect(matchingBuiltInConstruct(readConstruct(stored) ?? current)?.id).toBe(
      id,
    );
  },
);

test.each([
  ["open-chat", EARLIER_OPEN_CHAT],
  ["interview", EARLIER_INTERVIEW],
  ["brainstorming", EARLIER_BRAINSTORMING],
] as const)(
  "an unchanged copy of the %s activity is written in the earlier build's text, and read back in today's",
  (id, earlier) => {
    const current = getActivity(id).definition;
    const stored = writeActivity(current);

    expect(stored).toEqual({
      instructions: earlier.prompt,
      openingKickoff: earlier.openingRequest,
    });
    expect(readActivity(stored)).toEqual(current);
    expect(matchingBuiltInActivity(readActivity(stored) ?? current)?.id).toBe(
      id,
    );
  },
);

test("an unchanged copy of the Blender manual spell is written in the earlier build's text, and read back in today's", () => {
  const current = getSpell("blender-manual-lookup").definition;
  const stored = writeSpell(current);

  expect(stored).toEqual({
    whenToUse: EARLIER_BLENDER_MANUAL_LOOKUP.whenToUse,
    instructions: EARLIER_BLENDER_MANUAL_LOOKUP.prompt,
  });
  expect(readSpell(stored)).toEqual(current);
  expect(matchingBuiltInSpell(readSpell(stored) ?? current)?.id).toBe(
    "blender-manual-lookup",
  );
});

test("the one-question spell is stored with its historical heading", () => {
  const askOne = getSpell("ask-one-question").definition;

  expect(writeSpell(askOne)).toEqual(
    storedSpellPrompt(EARLIER_BUILT_INS.spells["ask-one-question"]),
  );
});

test("a copy saved in an earlier text keeps its prepared openings", () => {
  const vellum = readConstruct({ voice: EARLIER_VELLUM_PROMPT, habits: "" });
  const interview = readActivity({
    instructions: EARLIER_INTERVIEW.prompt,
    openingKickoff: EARLIER_INTERVIEW.openingRequest,
  });
  if (vellum === undefined || interview === undefined) {
    throw new Error("The earlier texts did not parse");
  }

  expect(preparedOpening(vellum, interview)).toBe(
    preparedOpening(
      getConstruct("vellum").definition,
      getActivity("interview").definition,
    ),
  );
  expect(preparedOpening(vellum, interview)).toBeDefined();
});

test("an edited copy is stored and read exactly as written, in either wording, and matches no built-in one", () => {
  const edited = {
    prompt: `${getConstruct("vellum").definition.prompt}\n- Extra.`,
  };
  const editedEarlier = { prompt: `${EARLIER_VELLUM_PROMPT}\n- Extra.` };
  const editedActivity = {
    ...getActivity("interview").definition,
    openingRequest: "Ask me about birdhouses.",
  };
  const editedEarlierActivity = {
    ...EARLIER_INTERVIEW,
    openingRequest: "Ask me about birdhouses.",
  };

  expect(writeConstruct(edited)).toEqual({ voice: edited.prompt, habits: "" });
  expect(readConstruct({ voice: editedEarlier.prompt, habits: "" })).toEqual(
    editedEarlier,
  );
  expect(matchingBuiltInConstruct(edited)).toBeUndefined();
  expect(matchingBuiltInConstruct(editedEarlier)).toBeUndefined();
  expect(writeActivity(editedActivity)).toEqual(
    storedActivityPrompt(editedActivity),
  );
  expect(readActivity(storedActivityPrompt(editedEarlierActivity))).toEqual(
    editedEarlierActivity,
  );
  expect(matchingBuiltInActivity(editedEarlierActivity)).toBeUndefined();
});

test("a discovery copy round-trips without a fabricated earlier definition and keeps its opening", () => {
  const discovery = getActivity("find-something-to-make").definition;
  expect(writeActivity(discovery)).toEqual(
    storedActivityPrompt(
      NAMED_SHEET_BUILT_INS.activities["find-something-to-make"],
    ),
  );
  const read = readActivity(writeActivity(discovery));
  expect(read).toEqual(discovery);
  expect(matchingBuiltInActivity(read ?? discovery)?.id).toBe(
    "find-something-to-make",
  );
  expect(
    preparedOpening(getConstruct("vellum").definition, read ?? discovery),
  ).toBeTruthy();
});

for (const [id, named] of Object.entries(NAMED_SHEET_BUILT_INS.constructs)) {
  test(`the named ${id} construct reads as a sheet without losing identity or visual metadata`, () => {
    const read = currentConstructText(named);
    expect(read.prompt).toBe(
      `# Character Sheet${named.prompt.slice(named.prompt.indexOf("\n"))}`,
    );
    expect(read.visual).toEqual(named.visual);
    expect(matchingBuiltInConstruct(read)?.id).toBe(id);
    const edited = { ...named, prompt: `${named.prompt}\nMy instructions.` };
    expect(currentConstructText(edited)).toEqual(edited);
    expect(earlierConstructText(edited)).toEqual(edited);
  });
}
for (const [id, named] of Object.entries(NAMED_SHEET_BUILT_INS.activities)) {
  test(`the named ${id} activity reads as a sheet and retains its opening`, () => {
    const read = currentActivityText(named);
    expect(read.prompt).toBe(
      `# Activity Sheet${named.prompt.slice(named.prompt.indexOf("\n"))}`,
    );
    expect(read.openingRequest).toBe(named.openingRequest);
    expect(matchingBuiltInActivity(read)?.id).toBe(id);
    const edited = { ...named, openingRequest: "My opening." };
    expect(currentActivityText(edited)).toEqual(edited);
    expect(earlierActivityText(edited)).toEqual(edited);
    expect(
      preparedOpening(getConstruct("vellum").definition, read),
    ).toBeDefined();
  });
}
for (const [id, named] of Object.entries(NAMED_SHEET_BUILT_INS.spells)) {
  test(`the named ${id} spell reads as a sheet without changing selection metadata`, () => {
    const read = currentSpellText(named);
    expect(read.prompt).toBe(
      `# Spell Sheet${named.prompt.slice(named.prompt.indexOf("\n"))}`,
    );
    expect(read.whenToUse).toBe(named.whenToUse);
    expect(matchingBuiltInSpell(read)?.id).toBe(id);
    const edited = { ...named, whenToUse: "My selection rule." };
    expect(currentSpellText(edited)).toEqual(edited);
    expect(earlierSpellText(edited)).toEqual(edited);
  });
}
