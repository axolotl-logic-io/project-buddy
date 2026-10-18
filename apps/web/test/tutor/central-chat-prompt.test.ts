// The prompt of the user's central chat, which is in no project: the
// central chat part where a project chat names its project, and no memory
// or interview.
import type { SystemModelMessage } from "ai";
import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  type BuddySnapshot,
  DEFAULT_BUDDY_ID,
  getBuddy,
  snapshotOf,
} from "@/buddies/index.ts";
import { MEMORY_VERSION_NUMBER } from "@/memory/memory.ts";
import { INTERVIEW_PROMPT } from "@/tutor/interview-prompt.ts";
import { MEMORY_START_TAG } from "@/tutor/memory-prompt.ts";
import {
  buildTutorInstructions,
  renderTutorInstructions,
} from "@/tutor/system-prompt.ts";
import { readPromptPreferences } from "../accounts/users-store-test-kit.ts";
import { projectIdFixture } from "../id-fixtures.ts";
import {
  CENTRAL_CHAT,
  OWNER,
  readMemory,
  resetReplyTestKit,
} from "./reply-test-kit.ts";

vi.mock("@/memory/memory-store.ts", () => import("./reply-test-kit.ts"));
vi.mock(
  "@/accounts/users-store.ts",
  () => import("../accounts/users-store-test-kit.ts"),
);

beforeEach(() => {
  resetReplyTestKit();
  readPromptPreferences.mockReset();
});

const BUDDY: BuddySnapshot = CENTRAL_CHAT.buddy;

// The central chat's buddy, with {{name}} in its role, which is in the
// shared message, and in its central chat part, which opens the chat's own.
const NAMED_BUDDY: BuddySnapshot = {
  ...BUDDY,
  parts: {
    ...BUDDY.parts,
    role: "You teach {{name}} Blender.",
    centralChat: "Hi {{name}}",
  },
};

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
    const projectName = "Sentinel project quartz";
    const [, project] = renderTutorInstructions({
      kind: "project",
      projectName,
      isInterviewChat: false,
      buddy: BUDDY,
      memory: { text: "", version: MEMORY_VERSION_NUMBER.parse(0) },
      userName: undefined,
      hiddenFlags: [],
    });
    expect(contentOf(project)).toContain(projectName);
    expect(text).not.toContain(projectName);
    expect(text).not.toContain(BUDDY.parts.emptyMemory);
    expect(text).not.toContain(BUDDY.parts.memoryIntro);
    expect(text).not.toContain(MEMORY_START_TAG);
    expect(text).not.toContain(INTERVIEW_PROMPT);
  });
});

describe("Central prompt cache", () => {
  test("shares the cached text of a project chat with the same buddy", async () => {
    readPromptPreferences.mockResolvedValue({
      userName: "Mabel",
      hiddenExtras: [],
    });

    const [[centralShared], [projectShared]] = await Promise.all([
      buildTutorInstructions({
        owner: OWNER,
        chat: { ...CENTRAL_CHAT, buddy: NAMED_BUDDY },
        buddy: NAMED_BUDDY,
      }),
      buildTutorInstructions({
        owner: OWNER,
        chat: {
          ...CENTRAL_CHAT,
          kind: "project",
          projectId: projectIdFixture(),
          projectName: "Low-poly fox",
          isInterviewChat: true,
          buddy: NAMED_BUDDY,
        },
        buddy: NAMED_BUDDY,
      }),
    ]);

    expect(contentOf(centralShared)).toContain("You teach Mabel Blender.");
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

describe("the central chat part's default", () => {
  test("tells the tutor to call create_project when the user asks for a project", () => {
    const { centralChat } = getBuddy(DEFAULT_BUDDY_ID).parts;

    expect(centralChat).toContain("create_project");
    expect(centralChat).toContain("the user");
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
      hiddenFlags: [],
    });

    expect(contentOf(chat)).toContain("Hi Mabel");
  });
});
