import { describe, expect, test } from "vitest";
import { getBuddy } from "@/buddies/index.ts";
import { MEMORY_VERSION_NUMBER } from "@/memory/memory.ts";
import { OPENING_KICKOFF } from "@/tutor/chat-kickoff.ts";
import {
  MOCK_FIRST_QUESTION,
  MOCK_LESSON_QUESTION,
} from "@/tutor/mock-opening.ts";
import { defaultMockScript, type MockStep } from "@/tutor/mock-script.ts";
import { renderTutorInstructions } from "@/tutor/system-prompt.ts";

const MEMORY = "## Goals\n\n- A low-poly fox for a game";

// The text of the kickoff, as the mock reads the user's last message.
function kickoffText(): string {
  return OPENING_KICKOFF;
}

// What the mock opens a chat with, given its project's memory and name and
// whether it is the project's interview chat, as the chat's prompt gives
// them.
function openingFor(
  memoryText: string,
  projectName = "Low-poly fox",
  isInterviewChat = true,
): readonly MockStep[] {
  const instructions = renderTutorInstructions({
    kind: "project",
    projectName,
    isInterviewChat,
    buddy: getBuddy("hippy"),
    memory: { text: memoryText, version: MEMORY_VERSION_NUMBER.parse(1) },
    userName: undefined,
  });
  return defaultMockScript(kickoffText(), {
    systemTexts: instructions.map(({ content }) => content),
    earlierTexts: [],
    toolResults: [],
    answerNow: false,
  });
}

describe("the mock's chat opening", () => {
  test("sums up the project's memory, then asks a question", () => {
    const [opening, ...rest] = openingFor(MEMORY);

    expect(opening?.text).toContain(MEMORY);
    expect(opening?.text).toContain("?");
    expect(opening).toHaveProperty("toolCalls", []);
    expect(rest).toEqual([]);
  });

  test("only asks the interview's first question while the memory is empty", () => {
    const [opening] = openingFor("");

    expect(opening?.text).toBe(MOCK_FIRST_QUESTION);
    expect(opening?.text).not.toContain("memory");
  });

  test("starts a lesson, not the interview, in another chat with an empty memory", () => {
    const [opening] = openingFor("", "Low-poly fox", false);

    expect(opening?.text).toBe(MOCK_LESSON_QUESTION);
  });

  test("fails as Claude does when the project's name holds /mock-error <type>", () => {
    expect(openingFor("", "Fox /mock-error overloaded_error")).toEqual([
      {
        text: "",
        error: {
          type: "overloaded_error",
          message: "Mock overloaded_error",
        },
      },
    ]);
  });
});
