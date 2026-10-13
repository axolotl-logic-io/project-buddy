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
import { PERSONA_IDS } from "@/personas/persona.ts";
import { CITATION_RULES } from "@/tutor/citation-prompt.ts";
import { PROMPT_CACHE_BREAKPOINT } from "@/tutor/prompt-cache.ts";
import {
  OWNER,
  readMemory,
  resetReplyTestKit,
} from "@/tutor/reply-test-kit.ts";
import {
  buildTutorInstructions,
  renderTutorInstructions,
  type TutorPromptRequest,
} from "@/tutor/system-prompt.ts";

vi.mock("@/memory/memory-store.ts", () => import("@/tutor/reply-test-kit.ts"));

beforeEach(resetReplyTestKit);

function promptRequest(personaId: PersonaId): TutorPromptRequest {
  const persona = getPersona(personaId);
  return {
    owner: OWNER,
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
    const [mrTee, hippy] = await Promise.all([
      buildTutorInstructions(promptRequest("mr-tee")),
      buildTutorInstructions(promptRequest("hippy")),
    ]);

    expect(mrTee[0]).toEqual(hippy[0]);
    expect(contentOf(mrTee[0])).toContain("Blender tutor");
    expect(contentOf(mrTee[0])).toContain(CITATION_RULES);
    expect(mrTee[0]?.providerOptions).toEqual(PROMPT_CACHE_BREAKPOINT);
  });

  test("follows with the chat's project and persona, uncached", async () => {
    const request = promptRequest("mr-tee");

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
    const request = promptRequest("mr-tee");
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
    expect(readMemory).toHaveBeenCalledWith(OWNER, request.chat.projectId);
    expect(contentOf(chat)).toContain("memory is empty");
    expect(contentOf(chat)).not.toContain("<project_memory>");
  });
});

// Today's prompt for every built-in persona, pinned byte for byte, so that
// rendering it from the persona's parts changes nothing the model reads.
describe.each(PERSONA_IDS)("the prompt in persona %s", (personaId) => {
  test("is byte for byte the pinned prompt, with an empty memory", async () => {
    const instructions = await buildTutorInstructions(promptRequest(personaId));

    expect(instructions).toMatchSnapshot();
  });

  test("is byte for byte the pinned prompt, with a saved memory", async () => {
    readMemory.mockResolvedValue({
      text: "# Goals\n\nA low-poly fox for my game.",
      version: MEMORY_VERSION_NUMBER.parse(2),
    });

    const instructions = await buildTutorInstructions(promptRequest(personaId));

    expect(instructions).toMatchSnapshot();
  });
});

describe("renderTutorInstructions", () => {
  test("renders every static text from the persona's parts", () => {
    const hippy = getPersona("hippy");
    const persona = {
      ...hippy,
      parts: {
        ...hippy.parts,
        role: "ROLE",
        citation: "CITATION",
        interview: "INTERVIEW",
        memoryIntro: "MEMORY INTRO",
        voice: "VOICE",
        sharedRules: "- SHARED",
        teachingRules: "- OWN",
      },
    };

    const [shared, chat] = renderTutorInstructions({
      projectName: "Low-poly fox",
      persona,
      memory: { text: "# Goals", version: MEMORY_VERSION_NUMBER.parse(1) },
    });

    expect(contentOf(shared)).toBe("ROLE\n\nCITATION\n\nINTERVIEW");
    expect(contentOf(chat)).toBe(
      [
        'This chat is about the user\'s project "Low-poly fox".',
        [
          "MEMORY INTRO",
          "<project_memory>",
          "# Goals",
          "</project_memory>",
        ].join("\n"),
        "VOICE\n\n## Rules\n\n- SHARED\n- OWN",
      ].join("\n\n"),
    );
  });
});
