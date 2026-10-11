import type { SystemModelMessage } from "ai";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { chatIdFixture, projectIdFixture } from "@/id-fixtures.ts";
import { getPersona, renderPersonaPrompt } from "@/personas/index.ts";
import { CITATION_RULES } from "@/tutor/citation-prompt.ts";
import { PROMPT_CACHE_BREAKPOINT } from "@/tutor/prompt-cache.ts";
import { resetReplyTestKit } from "@/tutor/reply-test-kit.ts";
import {
  buildTutorInstructions,
  type TutorPromptContext,
} from "@/tutor/system-prompt.ts";

vi.mock("@/memory/memory-store.ts", () => import("@/tutor/reply-test-kit.ts"));

beforeEach(resetReplyTestKit);

function promptContext(personaId: string): TutorPromptContext {
  const persona = getPersona(personaId);
  if (persona === undefined) {
    throw new Error("The prompt fixture is malformed");
  }
  return {
    chat: {
      id: chatIdFixture(),
      projectId: projectIdFixture(),
      projectName: "Low-poly fox",
      personaId: persona.id,
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
      buildTutorInstructions(promptContext("mr-t")),
      buildTutorInstructions(promptContext("hippy")),
    ]);

    expect(mrT[0]).toEqual(hippy[0]);
    expect(contentOf(mrT[0])).toContain("Blender tutor");
    expect(contentOf(mrT[0])).toContain(CITATION_RULES);
    expect(mrT[0]?.providerOptions).toEqual(PROMPT_CACHE_BREAKPOINT);
  });

  test("follows with the chat's project and persona, uncached", async () => {
    const context = promptContext("mr-t");

    const [, chat] = await buildTutorInstructions(context);

    expect(contentOf(chat)).toContain('"Low-poly fox"');
    expect(contentOf(chat)).toContain(renderPersonaPrompt(context.persona));
    expect(chat?.providerOptions).toBeUndefined();
  });
});
