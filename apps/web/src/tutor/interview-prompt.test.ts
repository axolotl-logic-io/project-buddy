import { beforeEach, describe, expect, test, vi } from "vitest";
import { MEMORY_VERSION_NUMBER } from "@/memory/memory.ts";
import { getPersona } from "@/personas/index.ts";
import { INTERVIEW_PROMPT } from "@/tutor/interview-prompt.ts";
import {
  CHAT_ID,
  OWNER,
  PROJECT_ID,
  readMemory,
  resetReplyTestKit,
} from "@/tutor/reply-test-kit.ts";
import {
  buildTutorInstructions,
  type TutorPromptRequest,
} from "@/tutor/system-prompt.ts";
import { UPDATE_MEMORY_TOOL } from "@/tutor/tools/update-memory-contract.ts";

vi.mock("@/memory/memory-store.ts", () => import("@/tutor/reply-test-kit.ts"));

// Memories at each stage of the interview: empty, partway and done.
const MEMORIES = {
  empty: " \n",
  partway: "## Goals\n\n- Model a low-poly fox",
  done: "## Goals\n\n- Model a low-poly fox\n\n## Milestones\n\n- [ ] Block out the body",
} as const;

function promptRequest(isInterviewChat = true): TutorPromptRequest {
  const persona = getPersona("mr-tee");
  return {
    owner: OWNER,
    chat: {
      id: CHAT_ID,
      projectId: PROJECT_ID,
      projectName: "Low-poly fox",
      isInterviewChat,
      persona,
      createdAt: new Date(),
      name: undefined,
      renamedByHand: false,
    },
    persona,
  };
}

beforeEach(resetReplyTestKit);

describe("INTERVIEW_PROMPT", () => {
  test("asks for the goal, skill level and purpose, then milestones, saved to the memory", () => {
    for (const topic of ["goal", "skill level", "is for", "milestones"]) {
      expect(INTERVIEW_PROMPT).toContain(topic);
    }
    expect(INTERVIEW_PROMPT).toContain("follow-up");
    expect(INTERVIEW_PROMPT).toContain(UPDATE_MEMORY_TOOL);
  });

  test("calls the person the user, never by name", () => {
    expect(INTERVIEW_PROMPT).toContain("the user");
    expect(INTERVIEW_PROMPT).not.toContain("Autumn");
  });
});

describe("INTERVIEW_PROMPT in the tutor's prompt", () => {
  test.each(Object.entries(MEMORIES))(
    "is in the interview chat's own part, not the cached part, with %s memory",
    async (_stage, text) => {
      readMemory.mockResolvedValue({
        text,
        version: MEMORY_VERSION_NUMBER.parse(1),
      });

      const [shared, chat] = await buildTutorInstructions(promptRequest());

      expect(shared?.content).not.toContain(INTERVIEW_PROMPT);
      expect(chat?.content).toContain(INTERVIEW_PROMPT);
    },
  );

  test.each(Object.entries(MEMORIES))(
    "is in no part of another chat's prompt, with %s memory",
    async (_stage, text) => {
      readMemory.mockResolvedValue({
        text,
        version: MEMORY_VERSION_NUMBER.parse(1),
      });

      const [shared, chat] = await buildTutorInstructions(promptRequest(false));

      expect(shared?.content).not.toContain(INTERVIEW_PROMPT);
      expect(chat?.content).not.toContain(INTERVIEW_PROMPT);
    },
  );

  test.each([true, false])(
    "leaves no gap in the prompt, when isInterviewChat is %s",
    async (isInterviewChat) => {
      readMemory.mockResolvedValue({
        text: MEMORIES.partway,
        version: MEMORY_VERSION_NUMBER.parse(1),
      });

      const [shared, chat] = await buildTutorInstructions(
        promptRequest(isInterviewChat),
      );

      expect(shared?.content).not.toContain("\n\n\n");
      expect(chat?.content).not.toContain("\n\n\n");
    },
  );
});
