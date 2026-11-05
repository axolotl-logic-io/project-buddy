import { expect, test } from "vitest";
import {
  parseActivityDefinition,
  storedActivityPrompt,
} from "@/activities/activity-definition.ts";
import {
  parseConstructDefinition,
  storedConstructPrompt,
} from "@/constructs/construct-definition.ts";
import {
  parseSpellDefinition,
  storedSpellPrompt,
} from "@/spells/spell-definition.ts";

test("legacy construct text retains rendering and placeholders through a live-build-compatible write", () => {
  const old = { voice: "# Voice\nHello {{name}}.", habits: "- Ask first." };
  const text = parseConstructDefinition(old);
  expect(text).toEqual({
    prompt: "# Voice\nHello {{name}}.\n\n## Habits\n\n- Ask first.",
  });
  if (text === undefined) {
    throw new Error("Missing definition");
  }
  expect(storedConstructPrompt(text)).toEqual({
    voice: text.prompt,
    habits: "",
  });
  expect(parseConstructDefinition(storedConstructPrompt(text))).toEqual(text);
  expect(parseConstructDefinition({ voice: "Voice", habits: "" })).toEqual({
    prompt: "Voice",
  });
  expect(parseConstructDefinition({ voice: 42, habits: "" })).toBeUndefined();
});
test("activity opening requests and spell selection metadata stay separate from prompts", () => {
  const activity = {
    prompt: "Guide {{name}}",
    openingRequest: "Ask what to do",
  };
  expect(storedActivityPrompt(activity)).toEqual({
    instructions: activity.prompt,
    openingKickoff: activity.openingRequest,
  });
  expect(parseActivityDefinition(storedActivityPrompt(activity))).toEqual(
    activity,
  );
  const spell = { prompt: "Ask first", whenToUse: "When planning" };
  expect(storedSpellPrompt(spell)).toEqual({
    instructions: spell.prompt,
    whenToUse: spell.whenToUse,
  });
  expect(parseSpellDefinition(storedSpellPrompt(spell))).toEqual(spell);
  expect(
    parseActivityDefinition({ instructions: "Lost opening" }),
  ).toBeUndefined();
  expect(
    parseSpellDefinition({ instructions: "Lost metadata" }),
  ).toBeUndefined();
});
