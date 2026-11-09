import { expect, test } from "vitest";
import {
  spellResetPrompt,
  starterSpellDefinition,
} from "@/spells/default-prompt.ts";
import { listSpells } from "@/spells/index.ts";

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
