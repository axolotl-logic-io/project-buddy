import { expect, test } from "vitest";
import {
  parseActivityDefinition,
  storedActivityPrompt,
} from "@/activities/activity-definition.ts";
import {
  parseBuddyDefinition,
  storedBuddyPrompt,
} from "@/buddies/buddy-definition.ts";
import {
  parseSpellDefinition,
  storedSpellPrompt,
} from "@/spells/spell-definition.ts";

test("legacy buddy text retains rendering and placeholders through a live-build-compatible write", () => {
  const old = { voice: "# Voice\nHello {{name}}.", habits: "- Ask first." };
  const text = parseBuddyDefinition(old);
  expect(text).toEqual({
    prompt: "# Voice\nHello {{name}}.\n\n## Habits\n\n- Ask first.",
  });
  if (text === undefined) {
    throw new Error("Missing definition");
  }
  expect(storedBuddyPrompt(text)).toEqual({ voice: text.prompt, habits: "" });
  expect(parseBuddyDefinition(storedBuddyPrompt(text))).toEqual(text);
  expect(parseBuddyDefinition({ voice: "Voice", habits: "" })).toEqual({
    prompt: "Voice",
  });
  expect(parseBuddyDefinition({ voice: 42, habits: "" })).toBeUndefined();
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
