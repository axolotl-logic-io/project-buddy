// use_case_project_from_standalone_chat: the user asks the construct in
// Chat for a quest, and its create_project offers Turn Chat into a quest
// filled in, creating nothing, against the test database, through POST
// /api/chat with the mock construct. A quest's conversation has no such tool.

import { streamText, type UIMessage } from "ai";
import { describe, expect, test } from "vitest";
import type { User } from "@/accounts/users-store.ts";
import { listMessages } from "@/chats/store.ts";
import { privateChat } from "@/conversations/private-chat.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import type { ChatId } from "@/ids.ts";
import { PROJECT_NAME_MAX_LENGTH } from "@/projects/project-name.ts";
import { listProjects } from "@/projects/store.ts";
import { mockConstructModel } from "@/replies/mock-model.ts";
import { createProjectTool } from "@/replies/tools/create-project.ts";
import {
  CREATE_PROJECT_OUTPUT,
  CREATE_PROJECT_TOOL,
  type CreateProjectOutput,
} from "@/replies/tools/create-project-contract.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import {
  sendChatMessage,
  signedInChat,
} from "../test-database/chat-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";

const PROJECT_NAME = "Low-poly fox";

function createCommand(name: string): string {
  return `/mock-tool ${CREATE_PROJECT_TOOL} ${JSON.stringify({ name })}`;
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

// The create_project outputs saved in the user's standalone chat.
async function savedOutputs(
  user: User,
  chatId: ChatId,
): Promise<CreateProjectOutput[]> {
  const saved: UIMessage[] = await listMessages(user.id, chatId);
  return saved.flatMap(({ parts }) =>
    parts.flatMap((part) => {
      if (
        part.type !== `tool-${CREATE_PROJECT_TOOL}` ||
        !("output" in part) ||
        part.output === undefined
      ) {
        return [];
      }
      return [CREATE_PROJECT_OUTPUT.parse(part.output)];
    }),
  );
}

// The error text of each failed create_project call saved in the user's
// standalone chat.
async function savedErrors(user: User, chatId: ChatId): Promise<string[]> {
  const saved: UIMessage[] = await listMessages(user.id, chatId);
  return saved.flatMap(({ parts }) =>
    parts.flatMap((part) => {
      if (
        part.type !== `tool-${CREATE_PROJECT_TOOL}` ||
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
  name = PROJECT_NAME,
): Promise<{ outputs: unknown[]; errors: string[] }> {
  const result = streamText({
    model: mockConstructModel(),
    messages: [{ role: "user", content: createCommand(name) }],
    tools: { [CREATE_PROJECT_TOOL]: createProjectTool },
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

describe("use_case_project_from_standalone_chat", () => {
  test("the construct's offer holds the name and summary to confirm, and creates nothing", async () => {
    const { user, chatId } = await signedInWithStandaloneChat();
    const summary = "Plan: shape a fox, then shade it.";
    const motivation = "A gift.";

    expect(
      await sendInStandaloneChat(
        chatId,
        `/mock-tool ${CREATE_PROJECT_TOOL} ${JSON.stringify({ name: PROJECT_NAME, summary, motivation })}`,
      ),
    ).toBe(HTTP_STATUS.ok);

    expect(await savedOutputs(user, chatId)).toEqual([
      { status: "proposed", name: PROJECT_NAME, summary, motivation },
    ]);
    expect(await listProjects(user.id)).toEqual([]);
  });

  test("a name longer than the limit fails the call, saved as failed, and offers nothing", async () => {
    const { user, chatId } = await signedInWithStandaloneChat();

    expect(
      await sendInStandaloneChat(
        chatId,
        createCommand("f".repeat(PROJECT_NAME_MAX_LENGTH + 1)),
      ),
    ).toBe(HTTP_STATUS.ok);

    expect(await savedErrors(user, chatId)).toHaveLength(1);
    expect(await savedOutputs(user, chatId)).toEqual([]);
    expect(await listProjects(user.id)).toEqual([]);
  });

  test("a name longer than the limit tells the construct the limit", async () => {
    const { outputs, errors } = await callToolDirectly(
      "f".repeat(PROJECT_NAME_MAX_LENGTH + 1),
    );

    expect(outputs).toEqual([]);
    expect(errors).toEqual([
      expect.stringContaining(`at most ${PROJECT_NAME_MAX_LENGTH} characters`),
    ]);
  });

  test("a quest's conversation can't offer another quest", async () => {
    const { user, chat } = await signedInChat();

    await sendChatMessage(chat.id, createCommand(PROJECT_NAME));

    expect(await savedOutputs(user, chat.id)).toEqual([]);
    expect((await listProjects(user.id)).map(({ id }) => id)).toEqual([
      chat.project.id,
    ]);
  });
});
