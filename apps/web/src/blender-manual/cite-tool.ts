// The cite_blender_manual tool: the buddy names the manual sections its reply used,
// and the chat shows them as links under the reply. Only sections that a
// search_blender_manual call in the conversation returned are kept, so every link is
// a real section the buddy read. The model reads the result with a reminder
// that its answer still comes after the call.
import { type ModelMessage, type ToolResultPart, tool } from "ai";
import {
  CITE_BLENDER_MANUAL_DESCRIPTION,
  CITE_BLENDER_MANUAL_INPUT,
  CITE_BLENDER_MANUAL_OUTPUT,
  type CiteBlenderManualInput,
  type CiteBlenderManualOutput,
} from "@/blender-manual/cite-tool-contract.ts";
import {
  SEARCH_BLENDER_MANUAL_OUTPUT,
  SEARCH_BLENDER_MANUAL_TOOL,
  type SearchBlenderManualOutput,
} from "@/blender-manual/search-tool-contract.ts";

// The sections a search_blender_manual call in messages returned, in any order.
function sectionsRead(
  messages: readonly ModelMessage[],
): SearchBlenderManualOutput["sections"] {
  return messages.flatMap((message) => {
    if (message.role !== "tool") {
      return [];
    }
    return message.content.flatMap((part) => {
      if (
        part.type !== "tool-result" ||
        part.toolName !== SEARCH_BLENDER_MANUAL_TOOL ||
        part.output.type !== "json"
      ) {
        return [];
      }
      return (
        SEARCH_BLENDER_MANUAL_OUTPUT.safeParse(part.output.value).data
          ?.sections ?? []
      );
    });
  });
}

function citeSectionsRead(
  { urls }: CiteBlenderManualInput,
  { messages }: { messages: ModelMessage[] },
): CiteBlenderManualOutput {
  const labels = new Map(
    sectionsRead(messages).map(({ url, label }) => [url, label]),
  );
  return {
    citations: [...new Set(urls)].flatMap((url) => {
      const label = labels.get(url);
      if (label === undefined) {
        return [];
      }
      return [{ label, url }];
    }),
  };
}

// What the model reads beside the citations. Claude has ended its reply
// with no text straight after this tool, as if the links were the reply, so
// the result says the answer is still to write. Claude may have written it
// before the call, so the reminder allows for that.
const CITE_BLENDER_MANUAL_REMINDER =
  "The app will show these links under your reply. The links alone don't answer the user: unless you have already written your answer above, write it now, after this call, from the sections you read.";

// Described by its default; tools/index.ts gives each request the
// buddy's description.
const citeBlenderManualTool = tool({
  description: CITE_BLENDER_MANUAL_DESCRIPTION,
  inputSchema: CITE_BLENDER_MANUAL_INPUT,
  outputSchema: CITE_BLENDER_MANUAL_OUTPUT,
  execute: citeSectionsRead,
  // The model's copy only: the saved output and the chat's citations part
  // stay the citations alone. A saved chat's output was never checked
  // against the schema, so a malformed one reads as no citations.
  toModelOutput: ({
    output,
  }: {
    output: unknown;
  }): ToolResultPart["output"] => ({
    type: "json",
    value: {
      citations:
        CITE_BLENDER_MANUAL_OUTPUT.safeParse(output).data?.citations ?? [],
      reminder: CITE_BLENDER_MANUAL_REMINDER,
    },
  }),
});

export { CITE_BLENDER_MANUAL_REMINDER, citeBlenderManualTool };
