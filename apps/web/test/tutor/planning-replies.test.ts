// Account choices may change between turns of an existing chat. Record the
// actual model requests with the real tool factory: only skill instructions
// may change, never the captured buddy, other prompt parts or available tools.
import type { LanguageModelV4CallOptions } from "@ai-sdk/provider";
import { MockLanguageModelV4 } from "ai/test";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { type Buddy, getBuddy } from "@/buddies/index.ts";
import type { FoundChat } from "@/chats/chat-rows.ts";
import { FLAGS, type FlagId } from "@/flags/flags.ts";
import { mockTutorModel } from "@/tutor/mock-model.ts";
import { replyToChat } from "@/tutor/reply.ts";
import { readPromptPreferences } from "../accounts/users-store-test-kit.ts";
import {
  CENTRAL_CHAT,
  CHAT_ID,
  finishReply,
  getChat,
  NEW_MESSAGE,
  OWNER,
  PROJECT_ID,
  REPLY,
  resetReplyTestKit,
  tutorModel,
} from "./reply-test-kit.ts";

vi.mock("@/chats/store.ts", () => import("./reply-test-kit.ts"));
vi.mock("@/tutor/model.ts", () => import("./reply-test-kit.ts"));
vi.mock("next/server", () => import("./reply-test-kit.ts"));
vi.mock("@/memory/memory-store.ts", () => import("./reply-test-kit.ts"));
vi.mock(
  "@/accounts/users-store.ts",
  () => import("../accounts/users-store-test-kit.ts"),
);
vi.mock("@/tutor/chat-naming.ts", () => import("./reply-test-kit.ts"));
vi.mock("@/quota/quota.ts", () => import("./reply-test-kit.ts"));

const BUDDY: Buddy = {
  ...getBuddy("mr-tee"),
  parts: {
    ...getBuddy("mr-tee").parts,
    brainstorming: "Explore {{name}}'s choices.",
    projectBreakdown: "Plan {{name}}'s milestones.",
  },
};

const TURN_COUNT = 3;

const CHOICES: readonly (readonly FlagId[])[] = [
  [],
  ["brainstorming"],
  ["project-breakdown"],
  ["brainstorming", "project-breakdown"],
];

beforeEach(() => {
  resetReplyTestKit();
  readPromptPreferences.mockReset();
});

async function request(
  recorder: MockLanguageModelV4,
  hiddenExtras: readonly FlagId[],
): Promise<LanguageModelV4CallOptions> {
  readPromptPreferences.mockResolvedValue({ userName: "Mabel", hiddenExtras });
  await finishReply(
    await replyToChat(OWNER, { chatId: CHAT_ID, message: NEW_MESSAGE }),
  );
  const call = recorder.doStreamCalls.at(-1);
  if (call === undefined) {
    throw new Error("The reply made no model request");
  }
  return call;
}

describe.each(["central", "project"] as const)(
  "live choices in a %s chat",
  (kind) => {
    test.each(CHOICES.map((hidden) => ({ hidden })))(
      "$hidden changes only skill instructions and re-enabling restores them",
      async ({ hidden }) => {
        let chat: FoundChat = { ...CENTRAL_CHAT, buddy: BUDDY };
        const expectedTools = ["cite_manual", "search_manual"];
        if (kind === "project") {
          chat = {
            ...chat,
            kind,
            projectId: PROJECT_ID,
            projectName: "Low-poly fox",
            isInterviewChat: false,
          };
          expectedTools.push("update_memory");
        } else {
          expectedTools.push("create_project");
        }
        getChat.mockResolvedValue(chat);
        const original = structuredClone(chat);
        const recorder = new MockLanguageModelV4({
          doStream: mockTutorModel(() => [{ text: REPLY, toolCalls: [] }])
            .doStream,
        });
        tutorModel.mockReturnValue(recorder);
        // Include every older display-only choice, including the off-by-default
        // extras whose stored values mean switched on rather than hidden.
        const olderChoices = FLAGS.filter(
          ({ id }) => id !== "brainstorming" && id !== "project-breakdown",
        ).map(({ id }) => id);
        const initial = await request(recorder, []);
        const changed = await request(recorder, [...olderChoices, ...hidden]);
        const restored = await request(recorder, []);

        expect(recorder.doStreamCalls).toHaveLength(TURN_COUNT);
        const [shared, ...rest] = changed.prompt;
        if (shared?.role !== "system") {
          throw new Error("The reply has no shared system prompt");
        }
        const sections = [BUDDY.parts.role, BUDDY.parts.citation];
        if (!hidden.includes("brainstorming")) {
          sections.push("Explore Mabel's choices.");
        }
        if (!hidden.includes("project-breakdown")) {
          sections.push("Plan Mabel's milestones.");
        }
        expect(shared.content).toBe(sections.join("\n\n"));
        expect(rest).toEqual(initial.prompt.slice(1));
        expect(changed.tools?.map(({ name }) => name)).toEqual(expectedTools);
        expect(changed.tools).toEqual(initial.tools);
        expect(restored.prompt).toEqual(initial.prompt);
        expect(restored.tools).toEqual(initial.tools);
        expect(chat).toEqual(original);
        expect(readPromptPreferences).toHaveBeenCalledTimes(TURN_COUNT);
        expect(readPromptPreferences).toHaveBeenCalledWith(OWNER);
      },
    );
  },
);
