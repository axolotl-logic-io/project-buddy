// The Blender manual lookup as a built-in spell: the lookup tools, which
// every chat has, send the construct to the spell before its first lookup, so
// a chat pays for the lookup instructions only once it needs them.
import { describe, expect, test } from "vitest";
import { CITE_BLENDER_MANUAL_DESCRIPTION } from "@/blender-manual/cite-tool-contract.ts";
import {
  BLENDER_MANUAL_LOOKUP_SPELL,
  SEARCH_BLENDER_MANUAL_DESCRIPTION,
} from "@/blender-manual/search-tool-contract.ts";
import { CAST_SPELL_TOOL } from "@/spells/cast-spell-contract.ts";

describe("the Blender manual lookup spell", () => {
  // Past chats' casts and own spells' cloned_from store the id, so it
  // never changes.
  test("keeps its id", () => {
    expect(BLENDER_MANUAL_LOOKUP_SPELL).toBe("blender-manual-lookup");
  });

  test.each([
    ["search_blender_manual", SEARCH_BLENDER_MANUAL_DESCRIPTION],
    ["cite_blender_manual", CITE_BLENDER_MANUAL_DESCRIPTION],
  ])("%s's description says to cast it", (_tool, description) => {
    expect(description).toContain(`\`${BLENDER_MANUAL_LOOKUP_SPELL}\``);
    expect(description).toContain(`\`${CAST_SPELL_TOOL}\``);
  });
});
