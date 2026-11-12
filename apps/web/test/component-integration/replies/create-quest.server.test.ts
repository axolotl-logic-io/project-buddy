// use_case_quest_from_standalone_chat: the user asks the construct in
// Chat for a quest, and its create_quest offers Turn Chat into a quest
// filled in, creating nothing, against the test database, through POST
// /api/chat with the mock construct. A quest's conversation has no such tool.

import { streamText, type UIMessage } from "ai";
import { describe, expect, test } from "vitest";
import type { User } from "@/accounts/users-store.ts";
import { listMessages } from "@/chats/store.ts";
import { privateChat } from "@/conversations/private-chat.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import type { ChatId } from "@/ids.ts";
import { QUEST_NAME_MAX_LENGTH } from "@/quests/quest-name.ts";
import { listQuests } from "@/quests/store.ts";
import { mockConstructModel } from "@/replies/mock-model.ts";
import { createQuestTool } from "@/replies/tools/create-quest.ts";
import {
  CREATE_QUEST_OUTPUT,
  CREATE_QUEST_TOOL,
  type CreateQuestOutput,
} from "@/replies/tools/create-quest-contract.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import {
  sendChatMessage,
  signedInChat,
} from "../test-database/chat-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";

const QUEST_NAME = "Low-poly fox";

function createCommand(name: string): string {
  return `/mock-tool ${CREATE_QUEST_TOOL} ${JSON.stringify({ name })}`;
}

// A signed-in user, and the id of their private Chat, in the default
// construct.
async function signedInWithStandaloneChat(): Promise<{
  user: User;
  chatId: ChatId;
}> {
  const user = await testUser();
  await signIn(user);
  const chat = await privateChat(user.id);
  return { user, chatId: chat.id };
}
async function sendInStandaloneChat(
  chatId: ChatId,
  text: string,
): Promise<number> {
  return (await sendChatMessage(chatId, text)).status;
}

// The create_quest outputs saved in the user's standalone chat.
async function savedOutputs(
  user: User,
  chatId: ChatId,
): Promise<CreateQuestOutput[]> {
  const saved: UIMessage[] = await listMessages(user.id, chatId);
  return saved.flatMap(({ parts }) =>
    parts.flatMap((part) => {
      if (
        part.type !== `tool-${CREATE_QUEST_TOOL}` ||
        !("output" in part) ||
        part.output === undefined
      ) {
        return [];
      }
      return [CREATE_QUEST_OUTPUT.parse(part.output)];
    }),
  );
}

// The error text of each failed create_quest call saved in the user's
// standalone chat.
async function savedErrors(user: User, chatId: ChatId): Promise<string[]> {
  const saved: UIMessage[] = await listMessages(user.id, chatId);
  return saved.flatMap(({ parts }) =>
    parts.flatMap((part) => {
      if (
        part.type !== `tool-${CREATE_QUEST_TOOL}` ||
        !("errorText" in part) ||
        typeof part.errorText !== "string"
      ) {
        return [];
      }
      return [part.errorText];
    }),
  );
}

// The real tool's results, called by the mock construct with the name in the
// user's standalone chat, outside any reply: each output, and the text of
// each error, as the construct's next step reads it.
async function callToolDirectly(
  name = QUEST_NAME,
): Promise<{ outputs: unknown[]; errors: string[] }> {
  const result = streamText({
    model: mockConstructModel(),
    messages: [{ role: "user", content: createCommand(name) }],
    tools: { [CREATE_QUEST_TOOL]: createQuestTool },
  });
  const [step] = await result.steps;
  const content = step?.content ?? [];
  return {
    outputs: content.flatMap((part) => {
      if (part.type === "tool-result") {
        return [part.output];
      }
      return [];
    }),
    errors: content.flatMap((part) => {
      if (part.type === "tool-error") {
        return [String(part.error)];
      }
      return [];
    }),
  };
}

describe("use_case_quest_from_standalone_chat", () => {
  test("the construct's offer holds the name and summary to confirm, and creates nothing", async () => {
    const { user, chatId } = await signedInWithStandaloneChat();
    const summary = "Plan: shape a fox, then shade it.";
    const motivation = "A gift.";

    expect(
      await sendInStandaloneChat(
        chatId,
        `/mock-tool ${CREATE_QUEST_TOOL} ${JSON.stringify({ name: QUEST_NAME, summary, motivation })}`,
      ),
    ).toBe(HTTP_STATUS.ok);

    expect(await savedOutputs(user, chatId)).toEqual([
      { status: "proposed", name: QUEST_NAME, summary, motivation },
    ]);
    expect(await listQuests(user.id)).toEqual([]);
  });

  test("a name longer than the limit fails the call, saved as failed, and offers nothing", async () => {
    const { user, chatId } = await signedInWithStandaloneChat();

    expect(
      await sendInStandaloneChat(
        chatId,
        createCommand("f".repeat(QUEST_NAME_MAX_LENGTH + 1)),
      ),
    ).toBe(HTTP_STATUS.ok);

    expect(await savedErrors(user, chatId)).toHaveLength(1);
    expect(await savedOutputs(user, chatId)).toEqual([]);
    expect(await listQuests(user.id)).toEqual([]);
  });

  test("a name longer than the limit tells the construct the limit", async () => {
    const { outputs, errors } = await callToolDirectly(
      "f".repeat(QUEST_NAME_MAX_LENGTH + 1),
    );

    expect(outputs).toEqual([]);
    expect(errors).toEqual([
      expect.stringContaining(`at most ${QUEST_NAME_MAX_LENGTH} characters`),
    ]);
  });

  test("a quest's conversation can't offer another quest", async () => {
    const { user, chat } = await signedInChat();

    await sendChatMessage(chat.id, createCommand(QUEST_NAME));

    expect(await savedOutputs(user, chat.id)).toEqual([]);
    expect((await listQuests(user.id)).map(({ id }) => id)).toEqual([
      chat.quest.id,
    ]);
  });
});
