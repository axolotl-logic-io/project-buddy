// use_case_project_from_standalone_chat: the user asks the construct in their
// standalone chat for a project, and the construct's create_project starts it as
// New Project does, against the test database, through POST /api/chat with
// the mock construct.

import { streamText, type UIMessage } from "ai";
import { describe, expect, test } from "vitest";
import type { User } from "@/accounts/users-store.ts";
import { currentActivity } from "@/activities/activity-sessions.ts";
import { getActivity } from "@/activities/index.ts";
import { preparedOpening } from "@/activities/prepared-openings.ts";
import { createStandaloneChat } from "@/chats/standalone-chat.ts";
import { listChats, listMessages } from "@/chats/store.ts";
import { DEFAULT_CONSTRUCT_ID, getConstruct } from "@/constructs/index.ts";
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
import { messageIdFixture } from "../../support/id-fixtures.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { spendAllGold } from "../../support/test-database/gold-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { sendChatMessage } from "../test-database/chat-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";

const PROJECT_NAME = "Low-poly fox";
const UNAVAILABLE_NAME = "Fox /mock-error overloaded_error";

function createCommand(name: string): string {
  return `/mock-tool ${CREATE_PROJECT_TOOL} ${JSON.stringify({ name })}`;
}

// A signed-in user, and the id of their standalone chat, with the default
// construct, or with a construct of their own that has no prepared opening when
// edited is true.
async function signedInWithStandaloneChat(edited = false): Promise<{
  user: User;
  chatId: ChatId;
}> {
  const user = await testUser();
  await signIn(user);
  let construct = getConstruct(DEFAULT_CONSTRUCT_ID);
  if (edited) {
    const own = await testData(user).editedConstruct();
    construct = { ...construct, name: own.name, definition: own.definition };
  }
  const chat = await createStandaloneChat(user.id, construct);
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
  const standalone = await createStandaloneChat(user.id);
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
  test("creates the project, first in her list, with its interview chat opened", async () => {
    const { user, chatId } = await signedInWithStandaloneChat();

    expect(
      await sendInStandaloneChat(chatId, createCommand(PROJECT_NAME)),
    ).toBe(HTTP_STATUS.ok);

    const [project] = await listProjects(user.id);
    expect(project?.name).toBe(PROJECT_NAME);
    if (project === undefined) {
      throw new Error("No project was created");
    }
    const [interview, ...others] = await listChats(user.id, project.id);
    expect(others).toEqual([]);
    expect(interview).toMatchObject({
      project: { id: project.id },
      construct: { name: getConstruct(DEFAULT_CONSTRUCT_ID).name },
    });
    if (interview === undefined) {
      throw new Error("The interview chat is gone");
    }
    expect((await currentActivity(user.id, interview)).id).toBe(
      "project-breakdown",
    );
    const opening = await listMessages(user.id, interview.id);
    expect(opening.map(({ role }) => role)).toEqual(["assistant"]);
    expect(textsOf(opening)).toEqual([
      preparedOpening(
        getConstruct(DEFAULT_CONSTRUCT_ID).definition,
        getActivity("project-breakdown").definition,
      ),
    ]);
    expect(await savedOutputs(user, chatId)).toEqual([
      {
        status: "created",
        projectId: project.id,
        name: PROJECT_NAME,
        interviewChatId: interview.id,
      },
    ]);
  });

  test("saves no project when Claude can't open its interview in a construct with no prepared opening", async () => {
    const { user, chatId } = await signedInWithStandaloneChat(true);

    expect(
      await sendInStandaloneChat(chatId, createCommand(UNAVAILABLE_NAME)),
    ).toBe(HTTP_STATUS.ok);

    expect(await savedOutputs(user, chatId)).toEqual([
      { status: "claudeUnavailable" },
    ]);
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
    const { user } = await signedInWithStandaloneChat();
    await spendAllGold(user);

    const {
      outputs: [output],
    } = await callToolDirectly(user);

    expect(CREATE_PROJECT_OUTPUT.parse(output).status).toBe("outOfGold");
    expect(await listProjects(user.id)).toEqual([]);
  });
});
