import { beforeEach, describe, expect, test, vi } from "vitest";
import { MEMORY_VERSION_NUMBER } from "@/memory/memory.ts";
import { getPersona, renderPersonaPrompt } from "@/personas/index.ts";
import { memoryPromptSection } from "@/tutor/memory-prompt.ts";
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

vi.mock("@/memory/memory-store.ts", () => import("@/tutor/reply-test-kit.ts"));

const MEMORY = "# Goals\n\n- Model a low-poly fox";

function promptContext(text: string): TutorPromptContext {
  const persona = getPersona("mr-tee");
  return {
    chat: {
      id: CHAT_ID,
      projectId: PROJECT_ID,
      projectName: "Low-poly fox",
      personaId: persona.id,
      name: undefined,
      renamedByHand: false,
      createdAt: new Date(),
    },
    persona,
    memory: { text, version: MEMORY_VERSION_NUMBER.parse(2) },
  };
}

beforeEach(resetReplyTestKit);

describe("memoryPromptSection", () => {
  test("gives the chat its project's memory, set apart in tags", () => {
    const section = memoryPromptSection(promptContext(MEMORY));

    expect(section).toContain(`<project_memory>\n${MEMORY}\n</project_memory>`);
  });

  test("says when the memory is empty", () => {
    const section = memoryPromptSection(promptContext(" \n"));

    expect(section).toContain("memory is empty");
    expect(section).not.toContain("<project_memory>");
  });

  test("is part of every chat's own prompt, before the persona", async () => {
    const context = promptContext(MEMORY);
    readMemory.mockResolvedValue(context.memory);

    const [shared, chat] = await buildTutorInstructions(context);
    const chatText = chat?.content ?? "";

    expect(shared?.content).not.toContain(MEMORY);
    expect(chatText.indexOf(MEMORY)).toBeGreaterThan(-1);
    expect(chatText.indexOf(MEMORY)).toBeLessThan(
      chatText.indexOf(renderPersonaPrompt(context.persona)),
    );
  });
});
