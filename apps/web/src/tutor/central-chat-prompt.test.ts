// The prompt of the user's central chat, which is in no project: the
// central chat part where a project chat names its project, and no memory
// or interview.
import type { SystemModelMessage } from "ai";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { type BuddySnapshot, getBuddy, snapshotOf } from "@/buddies/index.ts";
import { projectIdFixture } from "@/id-fixtures.ts";
import { INTERVIEW_PROMPT } from "@/tutor/interview-prompt.ts";
import { MEMORY_START_TAG } from "@/tutor/memory-prompt.ts";
import {
  CENTRAL_CHAT,
  OWNER,
  readMemory,
  resetReplyTestKit,
} from "@/tutor/reply-test-kit.ts";
import {
  buildTutorInstructions,
  renderTutorInstructions,
} from "@/tutor/system-prompt.ts";

vi.mock("@/memory/memory-store.ts", () => import("@/tutor/reply-test-kit.ts"));
vi.mock(
  "@/accounts/users-store.ts",
  () => import("@/accounts/users-store-test-kit.ts"),
);

beforeEach(resetReplyTestKit);

const BUDDY: BuddySnapshot = CENTRAL_CHAT.buddy;

function contentOf(message: SystemModelMessage | undefined): string {
  return message?.content ?? "";
}

describe("buildTutorInstructions in the central chat", () => {
  test("opens the chat's own part with the central chat part, with no project, memory or interview", async () => {
    const [, chat] = await buildTutorInstructions({
      owner: OWNER,
      chat: CENTRAL_CHAT,
      buddy: BUDDY,
    });
    const text = contentOf(chat);

    expect(text.startsWith(BUDDY.parts.centralChat)).toBe(true);
    expect(text).not.toContain("This chat is about the user's project");
    expect(text).not.toContain(BUDDY.parts.emptyMemory);
    expect(text).not.toContain(BUDDY.parts.memoryIntro);
    expect(text).not.toContain(MEMORY_START_TAG);
    expect(text).not.toContain(INTERVIEW_PROMPT);
  });

  test("shares the cached text of a project chat with the same buddy", async () => {
    const [[centralShared], [projectShared]] = await Promise.all([
      buildTutorInstructions({
        owner: OWNER,
        chat: CENTRAL_CHAT,
        buddy: BUDDY,
      }),
      buildTutorInstructions({
        owner: OWNER,
        chat: {
          ...CENTRAL_CHAT,
          kind: "project",
          projectId: projectIdFixture(),
          projectName: "Low-poly fox",
          isInterviewChat: true,
        },
        buddy: BUDDY,
      }),
    ]);

    expect(centralShared).toEqual(projectShared);
  });

  test("reads no project memory", async () => {
    await buildTutorInstructions({
      owner: OWNER,
      chat: CENTRAL_CHAT,
      buddy: BUDDY,
    });

    expect(readMemory).not.toHaveBeenCalled();
  });
});

describe("renderTutorInstructions in the central chat", () => {
  test("puts the user's name for {{name}} in the central chat part", () => {
    const mrTee = snapshotOf(getBuddy("mr-tee"));

    const [, chat] = renderTutorInstructions({
      kind: "central",
      buddy: {
        ...mrTee,
        parts: { ...mrTee.parts, centralChat: "Hi {{name}}" },
      },
      userName: "Mabel",
    });

    expect(contentOf(chat)).toContain("Hi Mabel");
  });
});
