// use_case_project_from_standalone_chat: the user asks the buddy in their
// standalone chat for a project, and the buddy's create_project starts it as
// New Project does, against the test database, through POST /api/chat with
// the mock buddy.

import { streamText, type UIMessage } from "ai";
import { describe, expect, test } from "vitest";
import type { User } from "@/accounts/users-store.ts";
import {
  currentActivity,
  interviewChatOf,
} from "@/activities/activity-sessions.ts";
import { getActivity, INTERVIEW_ACTIVITY_ID } from "@/activities/index.ts";
import { preparedOpening } from "@/activities/prepared-openings.ts";
import { DEFAULT_BUDDY_ID, getBuddy } from "@/buddies/index.ts";
import { createStandaloneChat } from "@/chats/standalone-chat.ts";
import { getChat, listMessages } from "@/chats/store.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import { CHAT_ID, type ChatId } from "@/ids.ts";
import { listProjects } from "@/projects/store.ts";
import { MONTHLY_QUOTA_MICRO_USD } from "@/quota/quota-terms.ts";
import { mockBuddyModel } from "@/replies/mock-model.ts";
import { createProjectTool } from "@/replies/tools/create-project.ts";
import {
  CREATE_PROJECT_OUTPUT,
  CREATE_PROJECT_TOOL,
  type CreateProjectOutput,
} from "@/replies/tools/create-project-contract.ts";
import { messageIdFixture } from "../../support/id-fixtures.ts";
import { spend } from "../../support/test-database/spend-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { sendChatMessage } from "../test-database/chat-test-kit.ts";
import { testData } from "../test-database/data-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";

const PROJECT_NAME = "Low-poly fox";
const UNAVAILABLE_NAME = "Fox /mock-error overloaded_error";

function createCommand(name: string): string {
  return `/mock-tool ${CREATE_PROJECT_TOOL} ${JSON.stringify({ name })}`;
}

// A signed-in user, and the id of their standalone chat, with the default
// buddy, or with a buddy of their own that has no prepared opening when
// edited is true.
async function signedInWithStandaloneChat(edited = false): Promise<{
  user: User;
  chatId: ChatId;
}> {
  const user = await testUser();
  await signIn(user);
  let buddy = getBuddy(DEFAULT_BUDDY_ID);
  if (edited) {
    const own = await testData(user).editedBuddy();
    buddy = { ...buddy, name: own.name, parts: own.parts };
  }
  const chat = await createStandaloneChat(user.id, buddy);
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

// The real tool's output, called by the mock buddy in the user's standalone
// chat, outside any reply.
async function callToolDirectly(user: User): Promise<unknown[]> {
  const standalone = await createStandaloneChat(user.id);
  const result = streamText({
    model: mockBuddyModel(),
    messages: [{ role: "user", content: createCommand(PROJECT_NAME) }],
    tools: { [CREATE_PROJECT_TOOL]: createProjectTool },
    toolsContext: {
      [CREATE_PROJECT_TOOL]: {
        owner: user.id,
        chatId: standalone.id,
        projectId: undefined,
        buddy: standalone.buddy,
        answeredId: messageIdFixture(),
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
    const interviewChatId = CHAT_ID.parse(
      await interviewChatOf(user.id, project.id),
    );
    const interview = await getChat(user.id, interviewChatId);
    expect(interview).toMatchObject({
      project: { id: project.id },
      buddy: { name: getBuddy(DEFAULT_BUDDY_ID).name },
    });
    if (interview === undefined) {
      throw new Error("The interview chat is gone");
    }
    expect((await currentActivity(user.id, interview)).id).toBe(
      INTERVIEW_ACTIVITY_ID,
    );
    const opening = await listMessages(user.id, interviewChatId);
    expect(opening.map(({ role }) => role)).toEqual(["assistant"]);
    expect(textsOf(opening)).toEqual([
      preparedOpening(
        getBuddy(DEFAULT_BUDDY_ID).parts,
        getActivity(INTERVIEW_ACTIVITY_ID).parts,
      ),
    ]);
    expect(await savedOutputs(user, chatId)).toEqual([
      {
        status: "created",
        projectId: project.id,
        name: PROJECT_NAME,
        interviewChatId,
      },
    ]);
  });

  test("saves no project when Claude can't open its interview in a buddy with no prepared opening", async () => {
    const { user, chatId } = await signedInWithStandaloneChat(true);

    expect(
      await sendInStandaloneChat(chatId, createCommand(UNAVAILABLE_NAME)),
    ).toBe(HTTP_STATUS.ok);

    expect(await savedOutputs(user, chatId)).toEqual([
      { status: "claudeUnavailable" },
    ]);
    expect(await listProjects(user.id)).toEqual([]);
  });

  test("saves no project once her quota is used up", async () => {
    const { user } = await signedInWithStandaloneChat();
    await spend(user, MONTHLY_QUOTA_MICRO_USD);

    const [output] = await callToolDirectly(user);

    expect(CREATE_PROJECT_OUTPUT.parse(output).status).toBe("quotaUsedUp");
    expect(await listProjects(user.id)).toEqual([]);
  });
});
