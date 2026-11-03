// The Blender manual lookup as a built-in spell: the lookup tools, which
// every chat has, send the buddy to the spell before its first lookup, so
// a chat pays for the lookup instructions only once it needs them.
import { describe, expect, test } from "vitest";
import { CITE_BLENDER_MANUAL_DESCRIPTION } from "@/blender-manual/cite-tool-contract.ts";
import {
  BLENDER_MANUAL_LOOKUP_SPELL,
  SEARCH_BLENDER_MANUAL_DESCRIPTION,
} from "@/blender-manual/search-tool-contract.ts";
import { CAST_SPELL_TOOL } from "@/spells/cast-spell-contract.ts";
import { isSpellId, listSpells } from "@/spells/index.ts";

describe("the Blender manual lookup spell", () => {
  test("is one of the built-in spells", () => {
    expect(isSpellId(BLENDER_MANUAL_LOOKUP_SPELL)).toBe(true);
    expect(listSpells().map(({ id }) => id)).toContain(
      BLENDER_MANUAL_LOOKUP_SPELL,
    );
  });

  test.each([
    ["search_blender_manual", SEARCH_BLENDER_MANUAL_DESCRIPTION],
    ["cite_blender_manual", CITE_BLENDER_MANUAL_DESCRIPTION],
  ])("%s's description says to cast it", (_tool, description) => {
    expect(description).toContain(`\`${BLENDER_MANUAL_LOOKUP_SPELL}\``);
    expect(description).toContain(`\`${CAST_SPELL_TOOL}\``);
  });
});
