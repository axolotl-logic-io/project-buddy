// use_case_project_from_central_chat: the user asks the tutor in their
// central chat for a project, and the tutor's create_project starts it as
// New Project does, against the test database, through POST /api/chat with
// the mock tutor.
import { streamText, type UIMessage } from "ai";
import { describe, expect, test } from "vitest";
import type { User } from "@/accounts/users-store.ts";
import { POST } from "@/app/api/chat/route.ts";
import { DEFAULT_BUDDY_ID, getBuddy } from "@/buddies/index.ts";
import { createCentralChat } from "@/chats/central-chat.ts";
import { getChat, listMessages } from "@/chats/store.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import { CHAT_ID, type ChatId } from "@/ids.ts";
import { listProjects } from "@/projects/store.ts";
import { MONTHLY_QUOTA_MICRO_USD } from "@/quota/quota-terms.ts";
import { recordSpend } from "@/quota/spend-store.ts";
import { mockTutorModel } from "@/tutor/mock-model.ts";
import { MOCK_FIRST_QUESTION } from "@/tutor/mock-opening.ts";
import { createProjectTool } from "@/tutor/tools/create-project.ts";
import {
  CREATE_PROJECT_OUTPUT,
  CREATE_PROJECT_TOOL,
  type CreateProjectOutput,
} from "@/tutor/tools/create-project-contract.ts";
import { afterTasksDone } from "../test-database/after-test-kit.ts";
import {
  requestWithSession,
  signIn,
} from "../test-database/session-test-kit.ts";
import { testUser } from "../test-database/user-test-kit.ts";

const PROJECT_NAME = "Low-poly fox";
const UNAVAILABLE_NAME = "Fox /mock-error overloaded_error";

function createCommand(name: string): string {
  return `/mock-tool ${CREATE_PROJECT_TOOL} ${JSON.stringify({ name })}`;
}

// A signed-in user, and the id of their central chat.
async function signedInWithCentralChat(): Promise<{
  user: User;
  chatId: ChatId;
}> {
  const user = await testUser();
  await signIn(user);
  const chat = await createCentralChat(user.id);
  return { user, chatId: chat.id };
}

// The user's message in their central chat, posted to /api/chat; its body
// read to the end, and every after() task it started done.
async function sendInCentralChat(
  chatId: ChatId,
  text: string,
): Promise<number> {
  const response = await POST(
    requestWithSession("http://localhost/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: chatId,
        message: {
          id: `m-${crypto.randomUUID()}`,
          role: "user",
          parts: [{ type: "text", text }],
        },
      }),
    }),
  );
  await response.text();
  await afterTasksDone();
  return response.status;
}

// The create_project outputs saved in the user's central chat.
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

// The real tool's output, called by the mock tutor in the user's central
// chat, outside any reply.
async function callToolDirectly(user: User): Promise<unknown[]> {
  const central = await createCentralChat(user.id);
  const result = streamText({
    model: mockTutorModel(),
    messages: [{ role: "user", content: createCommand(PROJECT_NAME) }],
    tools: { [CREATE_PROJECT_TOOL]: createProjectTool },
    toolsContext: {
      [CREATE_PROJECT_TOOL]: {
        owner: user.id,
        chatId: central.id,
        buddy: central.buddy,
      },
    },
  });
  const [step] = await result.steps;
  return (step?.content ?? []).flatMap((part) => {
    if (part.type === "tool-result") {
      return [part.output];
    }
    return [];
  });
}

describe("use_case_project_from_central_chat", () => {
  test("creates the project, first in her list, with its interview chat opened", async () => {
    const { user, chatId } = await signedInWithCentralChat();

    expect(await sendInCentralChat(chatId, createCommand(PROJECT_NAME))).toBe(
      HTTP_STATUS.ok,
    );

    const [project] = await listProjects(user.id);
    expect(project?.name).toBe(PROJECT_NAME);
    const interviewChatId = CHAT_ID.parse(project?.interviewChatId);
    const interview = await getChat(user.id, interviewChatId);
    expect(interview).toMatchObject({
      kind: "project",
      projectId: project?.id,
      isInterviewChat: true,
      buddy: { name: getBuddy(DEFAULT_BUDDY_ID).name },
    });
    const opening = await listMessages(user.id, interviewChatId);
    expect(opening.map(({ role }) => role)).toEqual(["assistant"]);
    expect(textsOf(opening)).toEqual([MOCK_FIRST_QUESTION]);
    expect(await savedOutputs(user, chatId)).toEqual([
      {
        status: "created",
        projectId: project?.id,
        name: PROJECT_NAME,
        interviewChatId,
      },
    ]);
  });

  test("saves no project when Claude can't open its interview", async () => {
    const { user, chatId } = await signedInWithCentralChat();

    expect(
      await sendInCentralChat(chatId, createCommand(UNAVAILABLE_NAME)),
    ).toBe(HTTP_STATUS.ok);

    expect(await savedOutputs(user, chatId)).toEqual([
      { status: "claudeUnavailable" },
    ]);
    expect(await listProjects(user.id)).toEqual([]);
  });

  test("saves no project once her quota is used up", async () => {
    const { user, chatId } = await signedInWithCentralChat();
    await recordSpend(user.id, MONTHLY_QUOTA_MICRO_USD, new Date());

    expect(await sendInCentralChat(chatId, createCommand(PROJECT_NAME))).toBe(
      HTTP_STATUS.tooManyRequests,
    );
    const [output] = await callToolDirectly(user);

    expect(CREATE_PROJECT_OUTPUT.parse(output).status).toBe("quotaUsedUp");
    expect(await listProjects(user.id)).toEqual([]);
  });
});
