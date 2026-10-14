// What the cite_manual tool takes and returns. The browser imports this too,
// to show the citations under a reply, so it imports nothing from the
// server.
import { z } from "zod";
import {
  MANUAL_URL,
  SEARCH_MANUAL_TOOL,
} from "@/tutor/tools/search-manual-contract.ts";

const CITE_MANUAL_TOOL = "cite_manual";

// The citeManualTool part's default: the tool's description.
const CITE_MANUAL_DESCRIPTION = `Attach links to the manual sections your reply uses, once you know which ${SEARCH_MANUAL_TOOL} results it uses. The app shows them under your reply's text; they don't replace it, so write your answer after this call. URLs no search returned are dropped.`;

const CITE_MANUAL_INPUT = z.object({
  urls: z
    .array(z.string())
    .describe(
      `The URLs of the manual sections the reply used, exactly as ${SEARCH_MANUAL_TOOL} returned them, most important first.`,
    ),
});

// The cited sections the tutor read, in the order it named them, each with
// the label its search returned. A URL that no search in the conversation
// returned is left out.
const CITE_MANUAL_OUTPUT = z.object({
  citations: z.array(z.object({ label: z.string(), url: MANUAL_URL })),
});

type CiteManualInput = z.infer<typeof CITE_MANUAL_INPUT>;
type CiteManualOutput = z.infer<typeof CITE_MANUAL_OUTPUT>;

export type { CiteManualInput, CiteManualOutput };
export {
  CITE_MANUAL_DESCRIPTION,
  CITE_MANUAL_INPUT,
  CITE_MANUAL_OUTPUT,
  CITE_MANUAL_TOOL,
};
