// What the search_manual tool takes and returns. The browser imports this
// too, to show a search in the chat, so it imports nothing from the server.
import { z } from "zod";

const SEARCH_MANUAL_TOOL = "search_manual";

const SEARCH_MANUAL_INPUT = z.object({
  query: z
    .string()
    .min(1)
    .describe(
      'Keywords, in web-search syntax: every word must match, "quoted phrases" match in order, `or` offers alternatives and a leading `-` excludes a word.',
    ),
});

// The best-matching manual sections, best first. Each excerpt is the start
// of its section's text, cut short and ended with "…" when the section is
// long.
const SEARCH_MANUAL_OUTPUT = z.object({
  sections: z.array(
    z.object({
      title: z.string(),
      url: z.string(),
      excerpt: z.string(),
    }),
  ),
});

type SearchManualInput = z.infer<typeof SEARCH_MANUAL_INPUT>;
type SearchManualOutput = z.infer<typeof SEARCH_MANUAL_OUTPUT>;

export type { SearchManualInput, SearchManualOutput };
export { SEARCH_MANUAL_INPUT, SEARCH_MANUAL_OUTPUT, SEARCH_MANUAL_TOOL };
