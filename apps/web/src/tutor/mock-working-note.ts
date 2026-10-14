// "/mock-working-note <text>" makes the mock tutor write a working note,
// search the manual for the text, then answer, as Claude does when it notes
// what it needs between searches. End-to-end tests use it to check that the
// note shows as a working note and the answer as prose.
import type { MockStep } from "@/tutor/mock-script.ts";
import { SEARCH_MANUAL_TOOL } from "@/tutor/tools/search-manual-contract.ts";

// The text of the mock's working note before it searches for text.
function mockWorkingNoteText(text: string): string {
  return `The mock tutor needs the manual's page on "${text}" first.`;
}

// The text of the mock's answer after its search for text.
function mockWorkingNoteAnswer(text: string): string {
  return `Here is the mock tutor's answer on "${text}", written after its search.`;
}

// The reply to /mock-working-note: the note and the search in one step, then
// the answer. Without text, a reply that says how to use the command.
function mockWorkingNoteReply(text: string): MockStep[] {
  if (text.trim() === "") {
    return [
      {
        text: "The mock tutor needs `/mock-working-note <text>`, with the text to search the manual for.",
        toolCalls: [],
      },
    ];
  }
  return [
    {
      text: mockWorkingNoteText(text),
      toolCalls: [{ toolName: SEARCH_MANUAL_TOOL, input: { query: text } }],
    },
    { text: mockWorkingNoteAnswer(text), toolCalls: [] },
  ];
}

export { mockWorkingNoteAnswer, mockWorkingNoteReply, mockWorkingNoteText };
