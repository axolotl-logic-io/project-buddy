import { beforeEach, describe, expect, test, vi } from "vitest";
import { MEMORY_VERSION_NUMBER } from "@/memory/memory.ts";
import { getPersona, renderPersonaPrompt } from "@/personas/index.ts";
import { memoryInPrompt, memoryPromptSection } from "@/tutor/memory-prompt.ts";
import {
  CHAT_ID,
  OWNER,
  PROJECT_ID,
  readMemory,
  resetReplyTestKit,
} from "@/tutor/reply-test-kit.ts";
import {
  buildTutorInstructions,
  type TutorPromptContext,
  type TutorPromptRequest,
} from "@/tutor/system-prompt.ts";

vi.mock("@/memory/memory-store.ts", () => import("@/tutor/reply-test-kit.ts"));
vi.mock(
  "@/accounts/users-store.ts",
  () => import("@/accounts/users-store-test-kit.ts"),
);

const MEMORY = "# Goals\n\n- Model a low-poly fox";

// A chat turn and its project's memory, which both a section and the whole
// prompt can be built from.
function promptContext(text: string): TutorPromptRequest & TutorPromptContext {
  const persona = getPersona("mr-tee");
  return {
    owner: OWNER,
    projectName: "Low-poly fox",
    isInterviewChat: true,
    chat: {
      id: CHAT_ID,
      projectId: PROJECT_ID,
      projectName: "Low-poly fox",
      isInterviewChat: true,
      persona,
      name: undefined,
      renamedByHand: false,
      createdAt: new Date(),
    },
    persona,
    memory: { text, version: MEMORY_VERSION_NUMBER.parse(2) },
    userName: undefined,
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

describe("memoryInPrompt", () => {
  test("reads the memory back from a prompt that holds its section", () => {
    const prompt = [
      "Before",
      memoryPromptSection(promptContext(MEMORY)),
      "After",
    ];

    expect(memoryInPrompt(prompt.join("\n\n"))).toBe(MEMORY);
  });

  test("is empty when the memory is, or the prompt has no memory", () => {
    expect(memoryInPrompt(memoryPromptSection(promptContext(" \n")))).toBe("");
    expect(memoryInPrompt("You are a Blender tutor.")).toBe("");
  });
});
