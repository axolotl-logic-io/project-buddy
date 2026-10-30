// The search_blender_manual tool: keyword search over the Blender Reference Manual.
// Its output is saved with the reply and sent to the model again on every
// later turn, so it holds a few sections, each cut to an excerpt.
import { tool } from "ai";
import { searchManual } from "@/skills/blender-manual/search-manual.ts";
import {
  SEARCH_BLENDER_MANUAL_DESCRIPTION,
  SEARCH_BLENDER_MANUAL_INPUT,
  SEARCH_BLENDER_MANUAL_OUTPUT,
  SECTIONS_PER_SEARCH,
  type SearchBlenderManualInput,
  type SearchBlenderManualOutput,
} from "@/skills/blender-manual/search-tool-contract.ts";

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
}: SearchBlenderManualInput): Promise<SearchBlenderManualOutput> {
  const sections = await searchManual(query, SECTIONS_PER_SEARCH);
  return {
    sections: sections.map(({ label, url, text }) => ({
      label,
      url,
      excerpt: excerptOf(text),
    })),
  };
}

// Described by its default; tools/index.ts gives each request the
// buddy's description.
const searchBlenderManualTool = tool({
  description: SEARCH_BLENDER_MANUAL_DESCRIPTION,
  inputSchema: SEARCH_BLENDER_MANUAL_INPUT,
  outputSchema: SEARCH_BLENDER_MANUAL_OUTPUT,
  execute: searchManualSections,
});

export { searchBlenderManualTool };
