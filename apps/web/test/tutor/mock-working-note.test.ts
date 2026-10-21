import { describe, expect, test } from "vitest";
import { defaultMockScript } from "@/tutor/mock-script.ts";
import {
  mockWorkingNoteAnswer,
  mockWorkingNoteReply,
  mockWorkingNoteText,
} from "@/tutor/mock-working-note.ts";
import { SEARCH_MANUAL_TOOL } from "@/tutor/tools/search-manual-contract.ts";

const NO_CONVERSATION = {
  systemTexts: [],
  earlierTexts: [],
  toolResults: [],
  answerNow: false,
};

describe("/mock-working-note", () => {
  test("writes a note and searches the manual for the text, then answers", () => {
    expect(mockWorkingNoteReply("bevel")).toEqual([
      {
        text: mockWorkingNoteText("bevel"),
        toolCalls: [
          { toolName: SEARCH_MANUAL_TOOL, input: { query: "bevel" } },
        ],
      },
      { text: mockWorkingNoteAnswer("bevel"), toolCalls: [] },
    ]);
  });

  test("names the text in both the note and the answer", () => {
    expect(mockWorkingNoteText("bevel")).toContain('"bevel"');
    expect(mockWorkingNoteAnswer("bevel")).toContain('"bevel"');
    expect(mockWorkingNoteText("bevel")).not.toBe(
      mockWorkingNoteAnswer("bevel"),
    );
  });

  test("says how to use the command, without searching, when there's no text", () => {
    expect(mockWorkingNoteReply("  ")).toEqual([
      {
        text: expect.stringContaining("`/mock-working-note <text>`"),
        toolCalls: [],
      },
    ]);
  });

  test("answers /mock-working-note in the default script", () => {
    expect(
      defaultMockScript("/mock-working-note bevel", NO_CONVERSATION),
    ).toEqual(mockWorkingNoteReply("bevel"));
  });
});
