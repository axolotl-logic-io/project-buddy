import { describe, expect, test } from "vitest";
import { MEMORY_VERSION_NUMBER } from "@/memory/memory.ts";
import { getPersona } from "@/personas/index.ts";
import { withChatKickoff } from "@/tutor/chat-kickoff.ts";
import { defaultMockScript, type MockStep } from "@/tutor/mock-script.ts";
import { renderTutorInstructions } from "@/tutor/system-prompt.ts";

const MEMORY = "## Goals\n\n- A low-poly fox for a game";

// The text of the kickoff, as the mock reads the user's last message.
function kickoffText(): string {
  const [kickoff] = withChatKickoff([]);
  return String(kickoff?.content);
}

// What the mock opens a chat with, given its project's memory and name, as
// the chat's prompt gives them.
function openingFor(
  memoryText: string,
  projectName = "Low-poly fox",
): readonly MockStep[] {
  const instructions = renderTutorInstructions({
    projectName,
    persona: getPersona("hippy"),
    memory: { text: memoryText, version: MEMORY_VERSION_NUMBER.parse(1) },
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

    expect(opening?.text).toContain("starts the interview");
    expect(opening?.text).not.toContain("memory");
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
