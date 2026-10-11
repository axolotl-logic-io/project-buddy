// The cite_manual tool: the tutor names the manual sections its reply used,
// and the chat shows them as links under the reply. Only sections that a
// search_manual call in the conversation returned are kept, so every link is
// a real section the tutor read.
import { type ModelMessage, tool } from "ai";
import {
  CITE_MANUAL_INPUT,
  CITE_MANUAL_OUTPUT,
  type CiteManualInput,
  type CiteManualOutput,
} from "@/tutor/tools/cite-manual-contract.ts";
import {
  SEARCH_MANUAL_OUTPUT,
  SEARCH_MANUAL_TOOL,
  type SearchManualOutput,
} from "@/tutor/tools/search-manual-contract.ts";

// The sections a search_manual call in messages returned, in any order.
function sectionsRead(
  messages: readonly ModelMessage[],
): SearchManualOutput["sections"] {
  return messages.flatMap((message) => {
    if (message.role !== "tool") {
      return [];
    }
    return message.content.flatMap((part) => {
      if (
        part.type !== "tool-result" ||
        part.toolName !== SEARCH_MANUAL_TOOL ||
        part.output.type !== "json"
      ) {
        return [];
      }
      return (
        SEARCH_MANUAL_OUTPUT.safeParse(part.output.value).data?.sections ?? []
      );
    });
  });
}

function citeSectionsRead(
  { urls }: CiteManualInput,
  { messages }: { messages: ModelMessage[] },
): CiteManualOutput {
  const titles = new Map(
    sectionsRead(messages).map(({ url, title }) => [url, title]),
  );
  return {
    citations: [...new Set(urls)].flatMap((url) => {
      const title = titles.get(url);
      if (title === undefined) {
        return [];
      }
      return [{ title, url }];
    }),
  };
}

const citeManualTool = tool({
  description: `Show links to the manual sections your reply used, under the reply. Call it once, after your reply's text, with sections that ${SEARCH_MANUAL_TOOL} returned. URLs no search returned are dropped.`,
  inputSchema: CITE_MANUAL_INPUT,
  outputSchema: CITE_MANUAL_OUTPUT,
  execute: citeSectionsRead,
});

export { citeManualTool };
