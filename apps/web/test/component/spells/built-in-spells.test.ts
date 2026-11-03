// Every built-in spell keeps to the limits an own spell must: a customized
// copy of it can be saved as it is, and its when-to-use line is one line in
// the buddy's list of spells.
import { describe, expect, test } from "vitest";
import { listSpells } from "@/spells/index.ts";
import { SPELL_NAME_MAX } from "@/spells/spell.ts";
import { SPELL_PARTS_EDIT } from "@/spells/spell-parts-schema.ts";

// Any line break.
const LINE_BREAK = /[\r\n\u2028\u2029]/u;

describe("the built-in spells", () => {
  test.each(listSpells())("$id keeps to the spell limits", (spell) => {
    expect(spell.name.length).toBeLessThanOrEqual(SPELL_NAME_MAX);
    expect(SPELL_PARTS_EDIT.safeParse(spell.parts).success).toBe(true);
    expect(spell.parts.whenToUse).not.toMatch(LINE_BREAK);
  });
});
