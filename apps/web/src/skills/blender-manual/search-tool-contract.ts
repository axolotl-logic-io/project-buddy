// What the search_blender_manual tool takes and returns. The browser imports this
// too, to show a search in the chat, so it imports nothing from the server.
import { z } from "zod";
import { isManualUrl } from "@/skills/blender-manual/manual-source.ts";

const SEARCH_BLENDER_MANUAL_TOOL = "search_blender_manual";

// How many sections one search returns.
const SECTIONS_PER_SEARCH = 5;

// The searchManualTool part's default: the tool's description.
const SEARCH_BLENDER_MANUAL_DESCRIPTION = `Search the Blender Reference Manual for the current Blender release. Returns up to ${SECTIONS_PER_SEARCH} sections, best match first, each with its label (page › heading), URL and the start of its text. Search again with other keywords when the results miss.`;

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
  MANUAL_URL,
  SEARCH_BLENDER_MANUAL_DESCRIPTION,
  SEARCH_BLENDER_MANUAL_INPUT,
  SEARCH_BLENDER_MANUAL_OUTPUT,
  SEARCH_BLENDER_MANUAL_TOOL,
  SECTIONS_PER_SEARCH,
};
