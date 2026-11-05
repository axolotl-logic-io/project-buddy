// Built-in constructs, activities and spells said "buddy" where they now say
// "construct". A copy saved from one before the rename, or by the build still
// live during a release, holds the old text and still counts as that
// built-in one: it keeps its prepared openings and can't be listed.
import { expect, test } from "vitest";
import { getActivity, listActivities } from "@/activities/index.ts";
import { preparedOpening } from "@/activities/prepared-openings.ts";
import { getConstruct, listConstructs } from "@/constructs/index.ts";
import {
  matchingBuiltInActivity,
  matchingBuiltInConstruct,
  matchingBuiltInSpell,
} from "@/prompts/matching-built-in.ts";
import { listSpells } from "@/spells/index.ts";

const CONSTRUCT_WORD = /construct/gu;
const CONSTRUCT_TITLE = /Construct/gu;

function asSavedBeforeRename(text: string): string {
  return text
    .replace(CONSTRUCT_TITLE, "Buddy")
    .replace(CONSTRUCT_WORD, "buddy");
}

test("a copy of a built-in construct saved before the rename still matches it", () => {
  const hippy = getConstruct("hippy");
  const saved = { prompt: asSavedBeforeRename(hippy.definition.prompt) };

  expect(saved.prompt.startsWith("# Buddy: Hippy\n")).toBe(true);
  expect(matchingBuiltInConstruct(saved)?.id).toBe("hippy");
  for (const construct of listConstructs()) {
    expect(matchingBuiltInConstruct(construct.definition)?.id).toBe(
      construct.id,
    );
    expect(
      matchingBuiltInConstruct({
        prompt: asSavedBeforeRename(construct.definition.prompt),
      })?.id,
    ).toBe(construct.id);
  }
});

test("built-in activities and spells match as saved before the rename and now", () => {
  for (const activity of listActivities()) {
    const { prompt, openingRequest } = activity.definition;
    expect(matchingBuiltInActivity(activity.definition)?.id).toBe(activity.id);
    expect(
      matchingBuiltInActivity({
        prompt: asSavedBeforeRename(prompt),
        openingRequest: asSavedBeforeRename(openingRequest),
      })?.id,
    ).toBe(activity.id);
  }
  for (const spell of listSpells()) {
    const { prompt, whenToUse } = spell.definition;
    expect(matchingBuiltInSpell(spell.definition)?.id).toBe(spell.id);
    expect(
      matchingBuiltInSpell({
        prompt: asSavedBeforeRename(prompt),
        whenToUse: asSavedBeforeRename(whenToUse),
      })?.id,
    ).toBe(spell.id);
  }
});

test("an unchanged copy saved before the rename keeps its prepared opening", () => {
  const hippy = getConstruct("hippy");
  const breakdown = getActivity("project-breakdown");
  const current = preparedOpening(hippy.definition, breakdown.definition);

  expect(current).toBeDefined();
  expect(
    preparedOpening(
      { prompt: asSavedBeforeRename(hippy.definition.prompt) },
      breakdown.definition,
    ),
  ).toBe(current);
});

test("an edited copy matches no built-in one", () => {
  const hippy = getConstruct("hippy");

  expect(
    matchingBuiltInConstruct({
      prompt: `${hippy.definition.prompt}\n- Extra.`,
    }),
  ).toBeUndefined();
});
