// "/mock-empty-after-search <text>" makes the mock buddy search the manual
// for the text, cite the sections found, then end its reply with an empty
// step, as Claude did in the buddy-names smoke test. The app's answer-now
// call then asks for the answer, and the mock answers from the sections its
// search found, naming each, so end-to-end tests can tell that the
// answer-now call got the search results.

import { CITE_BLENDER_MANUAL_TOOL } from "@/blender-manual/cite-tool-contract.ts";
import {
  SEARCH_BLENDER_MANUAL_OUTPUT,
  SEARCH_BLENDER_MANUAL_TOOL,
  type SearchBlenderManualOutput,
} from "@/blender-manual/search-tool-contract.ts";
import type {
  MockConversation,
  MockStep,
  MockToolResult,
} from "@/replies/mock-script.ts";

const EMPTY_STEP: MockStep = { text: "", toolCalls: [] };

// The mock's answer in the answer-now call, naming the labels of the
// sections its search for text found.
function mockEmptyAfterSearchAnswer(
  text: string,
  labels: readonly string[],
): string {
  if (labels.length === 0) {
    return `The mock buddy's search for "${text}" found nothing in the manual, so it gives no steps.`;
  }
  return `The mock buddy answers "${text}" from the sections its search found: ${labels.join("; ")}.`;
}

// The sections the search among toolResults found.
function sectionsFound(
  toolResults: readonly MockToolResult[],
): SearchBlenderManualOutput["sections"] {
  return toolResults.flatMap(({ toolName, output }) => {
    if (toolName !== SEARCH_BLENDER_MANUAL_TOOL) {
      return [];
    }
    return SEARCH_BLENDER_MANUAL_OUTPUT.safeParse(output).data?.sections ?? [];
  });
}

// The reply to /mock-empty-after-search: the search, the citations when it
// found sections, then an empty step; in the answer-now call, the answer.
// Without text, a reply that says how to use the command.
function mockEmptyAfterSearchReply(
  text: string,
  { toolResults, answerNow }: MockConversation,
): MockStep[] {
  if (text.trim() === "") {
    return [
      {
        text: "The mock buddy needs `/mock-empty-after-search <text>`, with the text to search the manual for.",
        toolCalls: [],
      },
    ];
  }
  const sections = sectionsFound(toolResults);
  if (answerNow) {
    return [
      {
        text: mockEmptyAfterSearchAnswer(
          text,
          sections.map(({ label }) => label),
        ),
        toolCalls: [],
      },
    ];
  }
  const search: MockStep = {
    text: "",
    toolCalls: [
      { toolName: SEARCH_BLENDER_MANUAL_TOOL, input: { query: text } },
    ],
  };
  if (toolResults.length === 0) {
    return [search];
  }
  if (sections.length === 0) {
    return [search, EMPTY_STEP];
  }
  const cite: MockStep = {
    text: "",
    toolCalls: [
      {
        toolName: CITE_BLENDER_MANUAL_TOOL,
        input: { urls: sections.map(({ url }) => url) },
      },
    ],
  };
  return [search, cite, EMPTY_STEP];
}

export { mockEmptyAfterSearchAnswer, mockEmptyAfterSearchReply };
