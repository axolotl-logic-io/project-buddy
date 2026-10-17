import type { SystemModelMessage } from "ai";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { BUDDY_IDS } from "@/buddies/buddy.ts";
import { type BuddyId, getBuddy, renderBuddyPrompt } from "@/buddies/index.ts";
import type { ChatInProject } from "@/chats/chat-rows.ts";
import { chatIdFixture, projectIdFixture } from "@/id-fixtures.ts";
import {
  EMPTY_MEMORY,
  MEMORY_VERSION_NUMBER,
  type Memory,
} from "@/memory/memory.ts";
import { CITATION_RULES } from "@/tutor/citation-prompt.ts";
import { INTERVIEW_PROMPT } from "@/tutor/interview-prompt.ts";
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
vi.mock(
  "@/accounts/users-store.ts",
  () => import("@/accounts/users-store-test-kit.ts"),
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
    expect(contentOf(mrTee[0])).toContain("Blender tutor");
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

describe("buildTutorInstructions in the interview chat", () => {
  test("shares the same cached text between the interview chat and the project's other chats", async () => {
    const [interviewChat, lesson] = await Promise.all([
      buildTutorInstructions(promptRequest("mr-tee", true)),
      buildTutorInstructions(promptRequest("mr-tee", false)),
    ]);

    expect(interviewChat[0]).toEqual(lesson[0]);
    expect(contentOf(interviewChat[0])).not.toContain(INTERVIEW_PROMPT);
  });

  test("puts the interview in the chat's own part of the interview chat alone", async () => {
    const [[, interviewChat], [, lesson]] = await Promise.all([
      buildTutorInstructions(promptRequest("mr-tee", true)),
      buildTutorInstructions(promptRequest("mr-tee", false)),
    ]);

    expect(contentOf(interviewChat)).toContain(INTERVIEW_PROMPT);
    expect(contentOf(lesson)).not.toContain(INTERVIEW_PROMPT);
  });
});

// Today's prompt for every built-in buddy, pinned byte for byte, so that
// rendering it from the buddy's parts changes nothing the model reads.
describe.each(BUDDY_IDS)("the prompt in buddy %s", (buddyId) => {
  test.each([
    ["the interview chat", true],
    ["another chat", false],
  ])(
    "is byte for byte the pinned prompt of %s, with an empty memory",
    async (_chat, isInterviewChat) => {
      const instructions = await buildTutorInstructions(
        promptRequest(buddyId, isInterviewChat),
      );

      expect(instructions).toMatchSnapshot();
    },
  );

  test.each([
    ["the interview chat", true],
    ["another chat", false],
  ])(
    "is byte for byte the pinned prompt of %s, with a saved memory",
    async (_chat, isInterviewChat) => {
      readMemory.mockResolvedValue({
        text: "# Goals\n\nA low-poly fox for my game.",
        version: MEMORY_VERSION_NUMBER.parse(2),
      });

      const instructions = await buildTutorInstructions(
        promptRequest(buddyId, isInterviewChat),
      );

      expect(instructions).toMatchSnapshot();
    },
  );
});

describe("renderTutorInstructions", () => {
  test("renders every static text from the buddy's parts", () => {
    const hippy = getBuddy("hippy");
    const buddy = {
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
      kind: "project",
      projectName: "Low-poly fox",
      isInterviewChat: true,
      buddy,
      memory: { text: "# Goals", version: MEMORY_VERSION_NUMBER.parse(1) },
      userName: undefined,
    });

    expect(contentOf(shared)).toBe("ROLE\n\nCITATION");
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
