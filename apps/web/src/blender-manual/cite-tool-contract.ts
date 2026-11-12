// What the cite_blender_manual tool takes and returns. The browser imports this too,
// to show the citations under a reply, so it imports nothing from the
// server.

import { z } from "zod";
import {
  CAST_LOOKUP_SPELL_FIRST,
  MANUAL_URL,
  SEARCH_BLENDER_MANUAL_TOOL,
} from "@/blender-manual/search-tool-contract.ts";

const CITE_BLENDER_MANUAL_TOOL = "cite_blender_manual";

// The tool's description.
const CITE_BLENDER_MANUAL_DESCRIPTION = `Attach links to the manual sections your reply uses, once you know which ${SEARCH_BLENDER_MANUAL_TOOL} results it uses. The app shows them under your reply's text; they don't replace it, so write your answer after this call, and never write manual links or a list of sources in your text. URLs no search returned are dropped. ${CAST_LOOKUP_SPELL_FIRST}`;

const CITE_BLENDER_MANUAL_INPUT = z.object({
  urls: z
    .array(z.string())
    .describe(
      `The URLs of the manual sections the reply used, exactly as ${SEARCH_BLENDER_MANUAL_TOOL} returned them, most important first.`,
    ),
});

// The cited sections the construct read, in the order it named them, each with
// the label its search returned. A URL that no search in the conversation
// returned is left out.
const CITE_BLENDER_MANUAL_OUTPUT = z.object({
  citations: z.array(z.object({ label: z.string(), url: MANUAL_URL })),
});

type CiteBlenderManualInput = z.infer<typeof CITE_BLENDER_MANUAL_INPUT>;
type CiteBlenderManualOutput = z.infer<typeof CITE_BLENDER_MANUAL_OUTPUT>;

export type { CiteBlenderManualInput, CiteBlenderManualOutput };
export {
  CITE_BLENDER_MANUAL_DESCRIPTION,
  CITE_BLENDER_MANUAL_INPUT,
  CITE_BLENDER_MANUAL_OUTPUT,
  CITE_BLENDER_MANUAL_TOOL,
};
