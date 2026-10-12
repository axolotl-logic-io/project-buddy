import { describe, expect, test } from "vitest";
import { MEMORY_VERSION_NUMBER } from "@/memory/memory.ts";
import { getPersona } from "@/personas/index.ts";
import { withChatKickoff } from "@/tutor/chat-kickoff.ts";
import { memoryPromptSection } from "@/tutor/memory-prompt.ts";
import { defaultMockScript, type MockStep } from "@/tutor/mock-script.ts";
import { CHAT_ID, PROJECT_ID } from "@/tutor/reply-test-kit.ts";

const MEMORY = "## Goals\n\n- A low-poly fox for a game";

// The text of the kickoff, as the mock reads the user's last message.
function kickoffText(): string {
  const [kickoff] = withChatKickoff([]);
  return String(kickoff?.content);
}

// What the mock opens a chat with, given its project's memory.
function openingFor(memoryText: string): readonly MockStep[] {
  const persona = getPersona("hippy");
  const memorySection = memoryPromptSection({
    chat: {
      id: CHAT_ID,
      projectId: PROJECT_ID,
      projectName: "Low-poly fox",
      personaId: persona.id,
      createdAt: new Date(),
      name: undefined,
      renamedByHand: false,
    },
    persona,
    memory: { text: memoryText, version: MEMORY_VERSION_NUMBER.parse(1) },
  });
  return defaultMockScript(kickoffText(), {
    systemTexts: ["You are a Blender tutor.", memorySection],
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
});
