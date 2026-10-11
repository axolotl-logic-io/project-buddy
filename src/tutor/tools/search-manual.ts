// The search_manual tool: keyword search over the Blender Reference Manual.
// Its output is saved with the reply and sent to the model again on every
// later turn, so it holds a few sections, each cut to an excerpt.
import { tool } from "ai";
import { searchManual } from "@/manual/search-manual.ts";
import {
  SEARCH_MANUAL_INPUT,
  SEARCH_MANUAL_OUTPUT,
  type SearchManualInput,
  type SearchManualOutput,
} from "@/tutor/tools/search-manual-contract.ts";

const SECTIONS_PER_SEARCH = 5;
// About 375 tokens per section, so a search adds about 2,000 tokens.
const EXCERPT_LENGTH = 1500;
const ELLIPSIS = "…";

// text, or its start cut after the last whole word that fits, with an
// ellipsis, so the result is at most EXCERPT_LENGTH characters.
function excerptOf(text: string): string {
  if (text.length <= EXCERPT_LENGTH) {
    return text;
  }
  const room = text.slice(0, EXCERPT_LENGTH - ELLIPSIS.length + 1);
  const lastSpace = room.lastIndexOf(" ");
  let kept = room.slice(0, -1);
  if (lastSpace > 0) {
    kept = room.slice(0, lastSpace);
  }
  return `${kept}${ELLIPSIS}`;
}

async function searchManualSections({
  query,
}: SearchManualInput): Promise<SearchManualOutput> {
  const sections = await searchManual(query, SECTIONS_PER_SEARCH);
  return {
    sections: sections.map(({ label, url, text }) => ({
      label,
      url,
      excerpt: excerptOf(text),
    })),
  };
}

const searchManualTool = tool({
  description: `Search the Blender Reference Manual for the current Blender release. Returns up to ${SECTIONS_PER_SEARCH} sections, best match first, each with its label (page › heading), URL and the start of its text. Search again with other keywords when the results miss.`,
  inputSchema: SEARCH_MANUAL_INPUT,
  outputSchema: SEARCH_MANUAL_OUTPUT,
  execute: searchManualSections,
});

export { searchManualTool };
