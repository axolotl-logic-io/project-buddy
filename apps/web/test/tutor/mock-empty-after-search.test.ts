import { describe, expect, test } from "vitest";
import {
  mockEmptyAfterSearchAnswer,
  mockEmptyAfterSearchReply,
} from "@/tutor/mock-empty-after-search.ts";
import {
  defaultMockScript,
  type MockConversation,
  type MockStep,
  type MockToolResult,
} from "@/tutor/mock-script.ts";
import { CITE_MANUAL_TOOL } from "@/tutor/tools/cite-manual-contract.ts";
import {
  SEARCH_MANUAL_TOOL,
  type SearchManualOutput,
} from "@/tutor/tools/search-manual-contract.ts";

const BEVEL: SearchManualOutput["sections"][number] = {
  label: "Bevel Modifier",
  url: "https://docs.blender.org/manual/en/latest/modeling/modifiers/generate/bevel.html#bevel-modifier",
  excerpt: "The Bevel modifier bevels the edges of the mesh.",
};
const ADD_MODIFIER: SearchManualOutput["sections"][number] = {
  label: "Introduction › Interface",
  url: "https://docs.blender.org/manual/en/latest/modeling/modifiers/introduction.html#interface",
  excerpt: "Use the Add Modifier menu at the top of the Modifiers tab.",
};
const SEARCH_STEP: MockStep = {
  text: "",
  toolCalls: [{ toolName: SEARCH_MANUAL_TOOL, input: { query: "bevel" } }],
};
const EMPTY_STEP: MockStep = { text: "", toolCalls: [] };

function searchFound(sections: SearchManualOutput["sections"]): MockToolResult {
  return {
    toolName: SEARCH_MANUAL_TOOL,
    failed: false,
    output: { sections },
  };
}

function conversation(
  toolResults: readonly MockToolResult[],
  answerNow = false,
): MockConversation {
  return { systemTexts: [], earlierTexts: [], toolResults, answerNow };
}

describe("/mock-empty-after-search before the answer-now call", () => {
  test("searches the manual for the text first", () => {
    expect(mockEmptyAfterSearchReply("bevel", conversation([]))).toEqual([
      SEARCH_STEP,
    ]);
  });

  test("cites every section found, then ends with an empty step", () => {
    const found = searchFound([BEVEL, ADD_MODIFIER]);

    expect(mockEmptyAfterSearchReply("bevel", conversation([found]))).toEqual([
      SEARCH_STEP,
      {
        text: "",
        toolCalls: [
          {
            toolName: CITE_MANUAL_TOOL,
            input: { urls: [BEVEL.url, ADD_MODIFIER.url] },
          },
        ],
      },
      EMPTY_STEP,
    ]);
  });

  test("ends with an empty step after a search that finds nothing", () => {
    expect(
      mockEmptyAfterSearchReply("bevel", conversation([searchFound([])])),
    ).toEqual([SEARCH_STEP, EMPTY_STEP]);
  });
});

describe("/mock-empty-after-search in the answer-now call", () => {
  test("answers the answer-now call from the sections its search found", () => {
    const found = searchFound([BEVEL, ADD_MODIFIER]);
    const cited: MockToolResult = {
      toolName: CITE_MANUAL_TOOL,
      failed: false,
      output: { citations: [] },
    };

    expect(
      mockEmptyAfterSearchReply("bevel", conversation([found, cited], true)),
    ).toEqual([
      {
        text: mockEmptyAfterSearchAnswer("bevel", [
          BEVEL.label,
          ADD_MODIFIER.label,
        ]),
        toolCalls: [],
      },
    ]);
  });

  test("names the text and each section in the answer", () => {
    const answer = mockEmptyAfterSearchAnswer("bevel", [
      BEVEL.label,
      ADD_MODIFIER.label,
    ]);

    expect(answer).toContain('"bevel"');
    expect(answer).toContain(BEVEL.label);
    expect(answer).toContain(ADD_MODIFIER.label);
  });

  test("says the search found nothing when the answer-now call has no sections", () => {
    expect(mockEmptyAfterSearchReply("bevel", conversation([], true))).toEqual([
      { text: mockEmptyAfterSearchAnswer("bevel", []), toolCalls: [] },
    ]);
    expect(mockEmptyAfterSearchAnswer("bevel", [])).toContain("nothing");
  });
});

describe("/mock-empty-after-search in the default script", () => {
  test("says how to use the command, without searching, when there's no text", () => {
    expect(mockEmptyAfterSearchReply(" ", conversation([]))).toEqual([
      {
        text: expect.stringContaining("`/mock-empty-after-search <text>`"),
        toolCalls: [],
      },
    ]);
  });

  test("answers /mock-empty-after-search in the default script", () => {
    expect(
      defaultMockScript("/mock-empty-after-search bevel", conversation([])),
    ).toEqual(mockEmptyAfterSearchReply("bevel", conversation([])));
  });

  test("is listed with its usage for an unknown command", () => {
    const [step] = defaultMockScript("/mock-dance", conversation([]));

    expect(step?.text).toContain("\n- `/mock-empty-after-search <text>` ");
  });
});
