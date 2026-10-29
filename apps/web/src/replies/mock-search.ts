// "/mock-search <query>" makes the mock buddy search the manual for the
// query, cite every section found, then reply with each one, so end-to-end
// tests can check the search part, the citations and their order.
import type {
  MockConversation,
  MockStep,
  MockToolResult,
} from "@/replies/mock-script.ts";
import { CITE_MANUAL_TOOL } from "@/replies/tools/cite-manual-contract.ts";
import {
  SEARCH_MANUAL_OUTPUT,
  SEARCH_MANUAL_TOOL,
} from "@/replies/tools/search-manual-contract.ts";

// The steps after a search: when it found sections, cite them all, then
// reply with each one, its label in bold and its excerpt. The citations
// arrive before the text, as they do from Claude when it cites first.
function stepsAfterSearch(
  query: string,
  result: MockToolResult,
): readonly MockStep[] {
  const search = SEARCH_MANUAL_OUTPUT.safeParse(result.output);
  if (result.failed || !search.success) {
    return [
      {
        text: `The mock buddy could not search the manual for "${query}".`,
        toolCalls: [],
      },
    ];
  }
  const { sections } = search.data;
  if (sections.length === 0) {
    return [
      {
        text: `The manual has nothing on "${query}", so the mock buddy gives no steps.`,
        toolCalls: [],
      },
    ];
  }
  return [
    {
      text: "",
      toolCalls: [
        {
          toolName: CITE_MANUAL_TOOL,
          input: { urls: sections.map(({ url }) => url) },
        },
      ],
    },
    {
      text: [
        `The manual covers "${query}":`,
        "",
        ...sections.map(
          ({ label, excerpt }, index) =>
            `${index + 1}. **${label}**: ${excerpt}`,
        ),
      ].join("\n"),
      toolCalls: [],
    },
  ];
}

function mockSearchReply(
  query: string,
  { toolResults }: MockConversation,
): MockStep[] {
  const search: MockStep = {
    text: "",
    toolCalls: [{ toolName: SEARCH_MANUAL_TOOL, input: { query } }],
  };
  const [result] = toolResults;
  if (result === undefined) {
    return [search];
  }
  return [search, ...stepsAfterSearch(query, result)];
}

export { mockSearchReply };
