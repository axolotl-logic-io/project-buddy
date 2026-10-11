import type { SystemModelMessage } from "ai";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { chatIdFixture, projectIdFixture } from "@/id-fixtures.ts";
import {
  EMPTY_MEMORY,
  MEMORY_VERSION_NUMBER,
  type Memory,
} from "@/memory/memory.ts";
import {
  getPersona,
  type PersonaId,
  renderPersonaPrompt,
} from "@/personas/index.ts";
import { CITATION_RULES } from "@/tutor/citation-prompt.ts";
import { PROMPT_CACHE_BREAKPOINT } from "@/tutor/prompt-cache.ts";
import { readMemory, resetReplyTestKit } from "@/tutor/reply-test-kit.ts";
import {
  buildTutorInstructions,
  type TutorPromptRequest,
} from "@/tutor/system-prompt.ts";

vi.mock("@/memory/memory-store.ts", () => import("@/tutor/reply-test-kit.ts"));

beforeEach(resetReplyTestKit);

function promptRequest(personaId: PersonaId): TutorPromptRequest {
  const persona = getPersona(personaId);
  return {
    chat: {
      id: chatIdFixture(),
      projectId: projectIdFixture(),
      projectName: "Low-poly fox",
      personaId: persona.id,
      name: undefined,
      renamedByHand: false,
      createdAt: new Date(),
    },
    persona,
  };
}

function contentOf(message: SystemModelMessage | undefined): string {
  return message?.content ?? "";
}

describe("buildTutorInstructions", () => {
  test("puts the text every chat shares first, as a cache breakpoint", async () => {
    const [mrT, hippy] = await Promise.all([
      buildTutorInstructions(promptRequest("mr-t")),
      buildTutorInstructions(promptRequest("hippy")),
    ]);

    expect(mrT[0]).toEqual(hippy[0]);
    expect(contentOf(mrT[0])).toContain("Blender tutor");
    expect(contentOf(mrT[0])).toContain(CITATION_RULES);
    expect(mrT[0]?.providerOptions).toEqual(PROMPT_CACHE_BREAKPOINT);
  });

  test("follows with the chat's project and persona, uncached", async () => {
    const request = promptRequest("mr-t");

    const [, chat] = await buildTutorInstructions(request);

    expect(contentOf(chat)).toContain('"Low-poly fox"');
    expect(contentOf(chat)).toContain(renderPersonaPrompt(request.persona));
    expect(chat?.providerOptions).toBeUndefined();
  });

  test("calls the person it teaches the user", async () => {
    const [shared, chat] = await buildTutorInstructions(promptRequest("hippy"));

    expect(contentOf(shared)).toContain("You teach the user Blender");
    expect(contentOf(chat)).toContain(
      'This chat is about the user\'s project "Low-poly fox".',
    );
  });

  test("reads the project's memory once, so every section sees one version", async () => {
    const request = promptRequest("mr-t");
    // Empty at the first read, then written to, as if the tutor saved goals
    // between two reads.
    const reads: Memory[] = [
      EMPTY_MEMORY,
      { text: "# Goals", version: MEMORY_VERSION_NUMBER.parse(1) },
    ];
    readMemory.mockImplementation(() =>
      Promise.resolve(reads.shift() ?? EMPTY_MEMORY),
    );

    const [, chat] = await buildTutorInstructions(request);

    expect(readMemory).toHaveBeenCalledOnce();
    expect(readMemory).toHaveBeenCalledWith(request.chat.projectId);
    expect(contentOf(chat)).toContain("memory is empty");
    expect(contentOf(chat)).toContain("# The project interview");
    expect(contentOf(chat)).not.toContain("<project_memory>");
  });
});
