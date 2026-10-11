import type { ModelMessage } from "ai";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { MEMORY_VERSION_NUMBER } from "@/memory/memory.ts";
import { getPersona, renderPersonaPrompt } from "@/personas/index.ts";
import {
  interviewPromptSection,
  withInterviewKickoff,
} from "@/tutor/interview-prompt.ts";
import {
  CHAT_ID,
  PROJECT_ID,
  readMemory,
  resetReplyTestKit,
} from "@/tutor/reply-test-kit.ts";
import {
  buildTutorInstructions,
  type TutorPromptContext,
} from "@/tutor/system-prompt.ts";
import { UPDATE_MEMORY_TOOL } from "@/tutor/tools/update-memory-contract.ts";

vi.mock("@/memory/memory-store.ts", () => import("@/tutor/reply-test-kit.ts"));

const MEMORY = "# Goals\n\n- Model a low-poly fox";

const OPENING: ModelMessage = {
  role: "assistant",
  content: [{ type: "text", text: "What would you like to make?" }],
};

const ANSWER: ModelMessage = {
  role: "user",
  content: [{ type: "text", text: "A fox for my game." }],
};

function promptContext(text: string): TutorPromptContext {
  const persona = getPersona("mr-t");
  return {
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
    memory: { text, version: MEMORY_VERSION_NUMBER.parse(1) },
  };
}

beforeEach(resetReplyTestKit);

describe("interviewPromptSection", () => {
  test("interviews the user while the project's memory is empty", () => {
    const section = interviewPromptSection(promptContext(" \n"));

    for (const topic of ["goal", "skill level", "is for", "time", "hardware"]) {
      expect(section).toContain(topic);
    }
    expect(section).toContain("follow-up");
    expect(section).toContain("milestones");
    expect(section).toContain(UPDATE_MEMORY_TOOL);
  });

  test("calls the person the user, never by name", () => {
    const section = interviewPromptSection(promptContext(""));

    expect(section).toContain("the user");
    expect(section).not.toContain("Autumn");
  });

  test("renders nothing once the memory holds something", () => {
    expect(interviewPromptSection(promptContext(MEMORY))).toBe("");
  });

  test("is in the chat's own prompt, after the memory, before the persona", async () => {
    const context = promptContext("");
    readMemory.mockResolvedValue(context.memory);
    const interview = interviewPromptSection(context);

    const [shared, chat] = await buildTutorInstructions(context);
    const chatText = chat?.content ?? "";

    expect(shared?.content).not.toContain(interview);
    expect(chatText.indexOf("memory is empty")).toBeGreaterThan(-1);
    expect(chatText.indexOf(interview)).toBeGreaterThan(
      chatText.indexOf("memory is empty"),
    );
    expect(chatText.indexOf(interview)).toBeLessThan(
      chatText.indexOf(renderPersonaPrompt(context.persona)),
    );
  });

  test("leaves no gap in the prompt once the memory holds something", async () => {
    const context = promptContext(MEMORY);
    readMemory.mockResolvedValue(context.memory);

    const [, chat] = await buildTutorInstructions(context);

    expect(chat?.content).not.toContain("\n\n\n");
  });
});

describe("withInterviewKickoff", () => {
  test("puts a message from the user before the tutor's opening", () => {
    const [kickoff, ...rest] = withInterviewKickoff([OPENING, ANSWER]);

    expect(kickoff?.role).toBe("user");
    expect(kickoff?.content).not.toBe("");
    expect(rest).toEqual([OPENING, ANSWER]);
  });

  test("is the whole conversation when there is none yet", () => {
    const [kickoff, ...rest] = withInterviewKickoff([]);

    expect(kickoff?.role).toBe("user");
    expect(rest).toEqual([]);
  });

  test("leaves a conversation that starts with the user alone", () => {
    expect(withInterviewKickoff([ANSWER, OPENING])).toEqual([ANSWER, OPENING]);
  });

  test("is the same kickoff every time", () => {
    const [first] = withInterviewKickoff([]);
    const [second] = withInterviewKickoff([OPENING]);

    expect(first).toEqual(second);
  });
});
