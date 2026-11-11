// use_case_project_from_standalone_chat: the user asks the construct in their
// standalone chat for a project, and the construct's create_project starts it as
// New Project does, against the test database, through POST /api/chat with
// the mock construct.

import { streamText, type UIMessage } from "ai";
import { describe, expect, test } from "vitest";
import type { User } from "@/accounts/users-store.ts";
import { currentActivity } from "@/activities/activity-sessions.ts";
import { confirmQuestTransfer } from "@/chats/quest-transfer.ts";
import { listMessages } from "@/chats/store.ts";
import { DEFAULT_CONSTRUCT_ID, getConstruct } from "@/constructs/index.ts";
import { privateChat } from "@/conversations/private-chat.ts";
import { readQuestConversation } from "@/conversations/start-quest.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import type { ChatId } from "@/ids.ts";
import { readMemory } from "@/memory/memory-store.ts";
import { listMilestones } from "@/milestones/milestone-store.ts";
import { PROJECT_NAME_MAX_LENGTH } from "@/projects/project-name.ts";
import { listProjects } from "@/projects/store.ts";
import { mockConstructModel } from "@/replies/mock-model.ts";
import { createProjectTool } from "@/replies/tools/create-project.ts";
import {
  CREATE_PROJECT_OUTPUT,
  CREATE_PROJECT_TOOL,
  type CreateProjectOutput,
} from "@/replies/tools/create-project-contract.ts";
import { messageIdFixture } from "../../support/id-fixtures.ts";
import { spendAllGold } from "../../support/test-database/gold-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { sendChatMessage } from "../test-database/chat-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";

const PROJECT_NAME = "Low-poly fox";
const UNAVAILABLE_NAME = "Fox /mock-error overloaded_error";

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

// The text of each part of each message.
function textsOf(messages: readonly UIMessage[]): string[] {
  return messages.flatMap(({ parts }) =>
    parts.flatMap((part) => {
      if (part.type === "text") {
        return [part.text];
      }
      return [];
    }),
  );
}

// The real tool's results, called by the mock construct with the name in the
// user's standalone chat, outside any reply: each output, and the text of
// each error, as the construct's next step reads it.
async function callToolDirectly(
  user: User,
  name = PROJECT_NAME,
): Promise<{ outputs: unknown[]; errors: string[] }> {
  const standalone = await privateChat(user.id);
  const result = streamText({
    model: mockConstructModel(),
    messages: [{ role: "user", content: createCommand(name) }],
    tools: { [CREATE_PROJECT_TOOL]: createProjectTool },
    toolsContext: {
      [CREATE_PROJECT_TOOL]: {
        actingUser: user.id,
        chatId: standalone.id,
        projectId: undefined,
        construct: standalone.construct,
        answeredId: messageIdFixture(),
      },
    },
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
  test("creates the quest, first in her list, with its one conversation opened", async () => {
    const { user, chatId } = await signedInWithStandaloneChat();

    expect(
      await sendInStandaloneChat(chatId, createCommand(PROJECT_NAME)),
    ).toBe(HTTP_STATUS.ok);

    expect(await listProjects(user.id)).toEqual([]);
    const [proposal] = await savedOutputs(user, chatId);
    if (proposal?.status !== "proposed") {
      throw new Error("No summary offered");
    }
    const confirmation = {
      id: proposal.proposalId,
      summary: "Next step: shape the fox. Planned: shade its ears.",
      motivation: "A present for a friend.",
    };
    const [confirmed, replayed] = await Promise.all([
      confirmQuestTransfer(user.id, confirmation),
      confirmQuestTransfer(user.id, confirmation),
    ]);
    expect(replayed).toEqual(confirmed);
    expect(await confirmQuestTransfer(user.id, confirmation)).toEqual(
      confirmed,
    );
    const [project] = await listProjects(user.id);
    expect(project?.name).toBe(PROJECT_NAME);
    if (project === undefined) {
      throw new Error("No project was created");
    }
    const interview = await readQuestConversation(user.id, project.id);
    expect(interview).toMatchObject({
      project: { id: project.id },
      construct: { name: getConstruct(DEFAULT_CONSTRUCT_ID).name },
    });
    if (interview === undefined) {
      throw new Error("The quest has no conversation");
    }
    expect((await currentActivity(user.id, interview)).id).toBe(
      "project-breakdown",
    );
    const opening = await listMessages(user.id, interview.id);
    expect(opening.map(({ role }) => role)).toEqual(["assistant"]);
    expect(textsOf(opening).join("\n")).toContain(confirmation.summary);
    expect(textsOf(opening).join("\n")).toContain(confirmation.motivation);
    expect((await readMemory(user.id, project.id)).text).toBe(
      `${confirmation.summary}\n\n## Motivation\n${confirmation.motivation}`,
    );
    expect(await listProjects(user.id)).toHaveLength(1);
    expect(await savedOutputs(user, chatId)).toEqual([proposal]);
  });

  test("saves no quest when Claude can't write its opening", async () => {
    const { user, chatId } = await signedInWithStandaloneChat();

    expect(
      await sendInStandaloneChat(chatId, createCommand(UNAVAILABLE_NAME)),
    ).toBe(HTTP_STATUS.ok);

    const [proposal] = await savedOutputs(user, chatId);
    if (proposal?.status !== "proposed") {
      throw new Error("No summary offered");
    }
    const confirmation = {
      id: proposal.proposalId,
      summary: "Keep this idea.",
      motivation: "",
    };
    expect(await confirmQuestTransfer(user.id, confirmation)).toEqual({
      status: "claudeUnavailable",
    });
    expect(await confirmQuestTransfer(user.id, confirmation)).toEqual({
      status: "claudeUnavailable",
    });
    expect(await listProjects(user.id)).toEqual([]);
  });

  test("a name longer than the limit fails the call, saved as failed, and saves no project", async () => {
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
    const user = await testUser();

    const { outputs, errors } = await callToolDirectly(
      user,
      "f".repeat(PROJECT_NAME_MAX_LENGTH + 1),
    );

    expect(outputs).toEqual([]);
    expect(errors).toEqual([
      expect.stringContaining(`at most ${PROJECT_NAME_MAX_LENGTH} characters`),
    ]);
    expect(await listProjects(user.id)).toEqual([]);
  });

  test("saves no project once she is out of gold", async () => {
    const { user, chatId } = await signedInWithStandaloneChat();
    await sendInStandaloneChat(chatId, createCommand(PROJECT_NAME));
    const [proposal] = await savedOutputs(user, chatId);
    if (proposal?.status !== "proposed") {
      throw new Error("No summary offered");
    }
    await spendAllGold(user);
    expect(
      await confirmQuestTransfer(user.id, {
        id: proposal.proposalId,
        summary: "Next step: shape the fox.",
        motivation: "",
      }),
    ).toEqual({ status: "outOfGold" });
    expect(await listProjects(user.id)).toEqual([]);
  });
});

test("confirmed context preserves the selected construct and source, excludes unconfirmed private text, and records no completed milestone", async () => {
  const user = await testUser();
  const outsider = await testUser();
  await signIn(user);
  const chat = await privateChat(user.id);
  const summary = "Plan: shape a fox, then shade it.";
  await sendInStandaloneChat(
    chat.id,
    `/mock-tool ${CREATE_PROJECT_TOOL} ${JSON.stringify({ name: PROJECT_NAME, summary, motivation: "A gift." })}`,
  );
  const [proposal] = await savedOutputs(user, chat.id);
  if (proposal?.status !== "proposed") {
    throw new Error("Missing proposal");
  }
  const source = await listMessages(user.id, chat.id);
  const confirmed = {
    id: proposal.proposalId,
    summary: "Plan: sketch the fox first.",
    motivation: "For a friend.",
  };
  await expect(
    confirmQuestTransfer(outsider.id, confirmed),
  ).rejects.toMatchObject({ errorCase: "not-found" });
  const result = await confirmQuestTransfer(user.id, confirmed);
  if (result.status !== "created") {
    throw new Error("Missing quest");
  }
  const target = await readQuestConversation(user.id, result.projectId);
  expect(target?.construct).toEqual(chat.construct);
  expect((await readMemory(user.id, result.projectId)).text).toBe(
    `${confirmed.summary}\n\n## Motivation\n${confirmed.motivation}`,
  );
  expect(await listMilestones(user.id, result.projectId)).toEqual([]);
  expect(await listMessages(user.id, chat.id)).toEqual(source);
});
