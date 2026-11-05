// What the search_blender_manual tool takes and returns, and the id of the
// spell that says how to look things up. The browser imports this too, to
// show a search in the chat, so it imports nothing from the server.
import { z } from "zod";
import { isManualUrl } from "@/blender-manual/manual-source.ts";
import { CAST_SPELL_TOOL } from "@/spells/cast-spell-contract.ts";

const SEARCH_BLENDER_MANUAL_TOOL = "search_blender_manual";

// The built-in spell that holds the Blender manual lookup's instructions.
const BLENDER_MANUAL_LOOKUP_SPELL = "blender-manual-lookup";

// The line in each lookup tool's description that sends the construct to the
// spell, or to the user's own version of it, until this chat has cast it.
// A chat whose searches came before the spell existed has none cast yet.
const CAST_LOOKUP_SPELL_FIRST = `If you haven't cast the Blender manual lookup spell (\`${BLENDER_MANUAL_LOOKUP_SPELL}\`, or the user's own version of it) in this chat, cast it with \`${CAST_SPELL_TOOL}\` before you look anything up, and follow its instructions.`;

// How many sections one search returns.
const SECTIONS_PER_SEARCH = 5;

// The tool's description.
const SEARCH_BLENDER_MANUAL_DESCRIPTION = `Search the Blender Reference Manual for the current Blender release. Returns up to ${SECTIONS_PER_SEARCH} sections, best match first, each with its label (page › heading), URL and the start of its text. Search again with other keywords when the results miss. Blender steps, menu paths, shortcuts and settings come only from this tool's results, never from memory. ${CAST_LOOKUP_SPELL_FIRST}`;

const SEARCH_BLENDER_MANUAL_INPUT = z.object({
  query: z
    .string()
    .min(1)
    .describe(
      'Keywords, in web-search syntax: every word must match, "quoted phrases" match in order, `or` offers alternatives and a leading `-` excludes a word.',
    ),
});

// A link into the Blender manual; anything else is not a manual section.
const MANUAL_URL = z.string().refine(isManualUrl);

// The best-matching manual sections, best first, each named by the label the
// manual module gives it, such as "Bevel › Options". Each excerpt is the
// start of its section's text, cut short and ended with "…" when the section
// is long.
const SEARCH_BLENDER_MANUAL_OUTPUT = z.object({
  sections: z.array(
    z.object({
      label: z.string(),
      url: MANUAL_URL,
      excerpt: z.string(),
    }),
  ),
});

type SearchBlenderManualInput = z.infer<typeof SEARCH_BLENDER_MANUAL_INPUT>;
type SearchBlenderManualOutput = z.infer<typeof SEARCH_BLENDER_MANUAL_OUTPUT>;

export type { SearchBlenderManualInput, SearchBlenderManualOutput };
export {
  BLENDER_MANUAL_LOOKUP_SPELL,
  CAST_LOOKUP_SPELL_FIRST,
  MANUAL_URL,
  SEARCH_BLENDER_MANUAL_DESCRIPTION,
  SEARCH_BLENDER_MANUAL_INPUT,
  SEARCH_BLENDER_MANUAL_OUTPUT,
  SEARCH_BLENDER_MANUAL_TOOL,
  SECTIONS_PER_SEARCH,
};
