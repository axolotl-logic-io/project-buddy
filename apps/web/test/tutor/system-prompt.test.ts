import type { SystemModelMessage } from "ai";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { type BuddyId, getBuddy, renderBuddyPrompt } from "@/buddies/index.ts";
import type { ChatInProject } from "@/chats/chat-rows.ts";
import {
  EMPTY_MEMORY,
  MEMORY_VERSION_NUMBER,
  type Memory,
} from "@/memory/memory.ts";
import { CITATION_RULES } from "@/tutor/citation-prompt.ts";
import { PROMPT_CACHE_BREAKPOINT } from "@/tutor/prompt-cache.ts";
import {
  buildTutorInstructions,
  renderTutorInstructions,
  type TutorPromptRequest,
} from "@/tutor/system-prompt.ts";
import { chatIdFixture, projectIdFixture } from "../id-fixtures.ts";
import { OWNER, readMemory, resetReplyTestKit } from "./reply-test-kit.ts";

const SHE_OR_HER = /\b(?:she|her)\b/iu;

vi.mock("@/memory/memory-store.ts", () => import("./reply-test-kit.ts"));
vi.mock(
  "@/accounts/users-store.ts",
  () => import("../accounts/users-store-test-kit.ts"),
);

beforeEach(resetReplyTestKit);

function promptRequest(
  buddyId: BuddyId,
  isInterviewChat = false,
): TutorPromptRequest & { readonly chat: ChatInProject } {
  const buddy = getBuddy(buddyId);
  return {
    owner: OWNER,
    chat: {
      kind: "project",
      id: chatIdFixture(),
      projectId: projectIdFixture(),
      projectName: "Low-poly fox",
      isInterviewChat,
      buddy,
      name: undefined,
      renamedByHand: false,
      createdAt: new Date(),
    },
    buddy,
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
    expect(contentOf(mrTee[0])).toContain(getBuddy("mr-tee").parts.role);
    expect(contentOf(mrTee[0])).toContain(CITATION_RULES);
    expect(mrTee[0]?.providerOptions).toEqual(PROMPT_CACHE_BREAKPOINT);
  });

  test("follows with the chat's project and buddy, uncached", async () => {
    const request = promptRequest("mr-tee");

    const [, chat] = await buildTutorInstructions(request);

    expect(contentOf(chat)).toContain('"Low-poly fox"');
    expect(contentOf(chat)).toContain(renderBuddyPrompt(request.buddy));
    expect(chat?.providerOptions).toBeUndefined();
  });

  test("calls the person it teaches the user", async () => {
    const [shared, chat] = await buildTutorInstructions(promptRequest("hippy"));

    for (const message of [shared, chat]) {
      expect(contentOf(message)).toContain("the user");
      expect(contentOf(message)).not.toMatch(SHE_OR_HER);
    }
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
    expect(contentOf(chat)).toContain(request.buddy.parts.emptyMemory);
    expect(contentOf(chat)).not.toContain("<project_memory>");
  });
});

describe("renderTutorInstructions", () => {
  test("renders every static text from the buddy's parts", () => {
    const hippy = getBuddy("hippy");
    const buddy = {
      ...hippy,
      parts: {
        ...hippy.parts,
        role: "Tutor role",
        citation: "Citation rules",
        interview: "INTERVIEW",
        brainstorming: "Brainstorm together",
        projectBreakdown: "Plan milestones",
        memoryIntro: "MEMORY INTRO",
        voice: "VOICE",
        sharedRules: "- SHARED",
        teachingRules: "- OWN",
      },
    };

    const [shared, chat] = renderTutorInstructions({
      kind: "project",
      projectName: "Low-poly fox",
      isInterviewChat: true,
      buddy,
      memory: { text: "# Goals", version: MEMORY_VERSION_NUMBER.parse(1) },
      userName: undefined,
      hiddenFlags: [],
    });

    expect(contentOf(shared)).toBe(
      "Tutor role\n\nCitation rules\n\nBrainstorm together\n\nPlan milestones",
    );
    expect(contentOf(chat)).toBe(
      [
        'This chat is about the user\'s project "Low-poly fox".',
        [
          "MEMORY INTRO",
          "<project_memory>",
          "# Goals",
          "</project_memory>",
        ].join("\n"),
        "INTERVIEW",
        "VOICE\n\n## Rules\n\n- SHARED\n- OWN",
      ].join("\n\n"),
    );
  });
});
