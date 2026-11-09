import { expect, test } from "vitest";
import { ACTIVITY_IDS } from "@/activities/activity.ts";
import {
  activityResetPrompt,
  starterActivityDefinition,
} from "@/activities/default-prompt.ts";
import {
  constructResetPrompt,
  starterConstructDefinition,
} from "@/constructs/default-prompt.ts";
import { listConstructs } from "@/constructs/index.ts";
import {
  spellResetPrompt,
  starterSpellDefinition,
} from "@/spells/default-prompt.ts";
import { listSpells } from "@/spells/index.ts";

const CHARACTER_HEADING = /^# Character Sheet\n/u;

test("construct starters and every reset source use a Character Sheet", () => {
  expect(
    starterConstructDefinition().prompt.startsWith("# Character Sheet\n"),
  ).toBe(true);
  for (const construct of listConstructs()) {
    expect(constructResetPrompt(construct.id).prompt).toMatch(
      CHARACTER_HEADING,
    );
  }
});
test("activity starters and every reset source use an Activity Sheet", () => {
  expect(
    starterActivityDefinition().prompt.startsWith("# Activity Sheet\n"),
  ).toBe(true);
  for (const id of ACTIVITY_IDS) {
    expect(
      activityResetPrompt(id).prompt.startsWith("# Activity Sheet\n"),
    ).toBe(true);
  }
});
test("spell starters and every reset source use a Spell Sheet", () => {
  expect(starterSpellDefinition().prompt.startsWith("# Spell Sheet\n")).toBe(
    true,
  );
  expect(spellResetPrompt(undefined).prompt.startsWith("# Spell Sheet\n")).toBe(
    true,
  );
  for (const spell of listSpells()) {
    expect(
      spellResetPrompt(spell.id).prompt.startsWith("# Spell Sheet\n"),
    ).toBe(true);
  }
});
