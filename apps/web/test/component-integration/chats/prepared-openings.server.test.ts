import { retireDefinition } from "@/retirement/retirement-store.ts";
// "use_case_prepared_opening" in use-cases/: a chat in a built-in construct and
// a built-in activity, or in copies of the user's own that she has only
// renamed, starts at once with the opening prepared for them
// (src/activities/prepared-openings.ts), asking nothing of Claude. The mock
// construct fails any model call whose prompt holds `/mock-error <type>`
// (mock-opening.ts), which a project's name puts there, so a chat that
// starts in such a project asked nothing of Claude. An edited construct, which
// writes its opening, is use_case_new_chat's.

import { describe, expect, test } from "vitest";
import type { User } from "@/accounts/users-store.ts";
import type { ActivityId } from "@/activities/activity.ts";
import { cloneActivity, updateActivity } from "@/activities/activity-store.ts";
import { builtInActivity } from "@/activities/chosen-activity.ts";
import { getActivity, listActivities } from "@/activities/index.ts";
import { preparedOpening } from "@/activities/prepared-openings.ts";
import { startChatAction } from "@/app/(workspace)/chats/actions.ts";
import { createProjectAction } from "@/app/(workspace)/projects/actions.ts";
import { listAllChats } from "@/chats/all-chats.ts";
import type { Chat } from "@/chats/chat-rows.ts";
import { startChat } from "@/chats/start-chat.ts";
import { listMessages } from "@/chats/store.ts";
import {
  cloneConstruct,
  deleteConstruct,
  updateConstruct,
} from "@/constructs/construct-store.ts";
import {
  type ConstructId,
  getConstruct,
  listConstructs,
  snapshotOf,
} from "@/constructs/index.ts";
import { saveInterviewConstruct } from "@/constructs/interview-construct.ts";
import { startProject } from "@/conversations/start-quest.ts";
import { PROJECT_NAME } from "@/projects/project-name.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { goldSpent } from "../../support/test-database/gold-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import {
  constructReply,
  formOf,
  messageText,
} from "../test-database/chat-test-kit.ts";
import { expectRedirect } from "../test-database/navigation-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";

// A project name that fails any model call whose prompt holds it.
const UNAVAILABLE_PROJECT_NAME = "Fox den /mock-error overloaded_error";
const FIRST_MESSAGE = "A low-poly fox, please.";

// The built-in activities a new chat can start in.
const NEW_CHAT_ACTIVITIES = listActivities();

// The prepared opening of a built-in construct in a built-in activity.
function builtInOpening(
  constructId: ConstructId,
  activityId: ActivityId,
): string | undefined {
  return preparedOpening(
    getConstruct(constructId).definition,
    getActivity(activityId).definition,
  );
}

// The chat the signed-in user's form starts, with start, which redirects to
// it.
async function started(
  user: User,
  start: () => Promise<unknown>,
): Promise<Chat> {
  const starting = start();
  await Promise.allSettled([starting]);
  const [newest] = await listAllChats(user.id);
  if (newest === undefined) {
    throw new Error("No chat started");
  }
  await expectRedirect(() => starting, `/chats/${newest.id}`);
  return newest;
}

// A standalone chat the signed-in user starts in the construct and activity.
function standaloneChat(
  user: User,
  constructId: string,
  activityId: string,
): Promise<Chat> {
  return started(user, () =>
    startChatAction(
      { kind: "idle" },
      formOf({ projectId: "", constructId, activityId }),
    ),
  );
}

// The texts of the chat's messages, in order, by role.
async function savedLines(user: User, chat: Chat): Promise<string[]> {
  const messages = await listMessages(user.id, chat.id);
  return messages.map((message) => `${message.role}: ${messageText(message)}`);
}

describe("use_case_prepared_opening", () => {
  test("every built-in construct opens a chat in each activity with its own prepared opening", async () => {
    const user = await testUser();
    const pairs = listConstructs().flatMap((construct) =>
      NEW_CHAT_ACTIVITIES.map((activity) => ({ construct, activity })),
    );

    const openings = await Promise.all(
      pairs.map(async ({ construct, activity }) => {
        const result = await startChat(user.id, {
          project: undefined,
          construct: { id: construct.id, ...snapshotOf(construct) },
          activity: builtInActivity(activity.id),
        });
        if (result.kind !== "started") {
          throw new Error(`The chat didn't start: ${result.kind}`);
        }
        return {
          saved: await savedLines(user, result.chat),
          opening: builtInOpening(construct.id, activity.id),
        };
      }),
    );

    for (const { saved, opening } of openings) {
      expect(opening).toBeTruthy();
      expect(saved).toEqual([`assistant: ${opening}`]);
    }
    const texts = new Set(openings.map(({ opening }) => opening));
    expect(texts.size).toBe(pairs.length);
    expect(await goldSpent(user)).toBe(0);
  });

  test("every built-in construct opens a new project's interview with its prepared opening", async () => {
    const user = await testUser();
    await Promise.all(
      listConstructs().map(async (construct) => {
        const result = await startProject(
          user.id,
          PROJECT_NAME.parse(UNAVAILABLE_PROJECT_NAME),
          {
            id: construct.id,
            ...snapshotOf(construct),
          },
        );
        if (result.kind !== "started") {
          throw new Error(`The project didn't start: ${result.kind}`);
        }
        expect(await savedLines(user, result.chat)).toEqual([
          `assistant: ${builtInOpening(construct.id, "project-breakdown")}`,
        ]);
      }),
    );
  });

  test("a project chat and a new project start with their prepared openings while Claude is unavailable", async () => {
    const user = await testUser();
    const [project] = await Promise.all([
      testData(user).project(UNAVAILABLE_PROJECT_NAME),
      signIn(user),
    ]);

    const projectChat = await started(user, () =>
      startChatAction(
        { kind: "idle" },
        formOf({ projectId: project.id, constructId: "lumen" }),
      ),
    );
    await saveInterviewConstruct(user.id, "lumen");
    const interview = await started(user, () =>
      createProjectAction(
        { kind: "idle" },
        formOf({ name: UNAVAILABLE_PROJECT_NAME, constructId: "lumen" }),
      ),
    );

    expect(projectChat.project?.id).toBe(project.id);
    expect(await savedLines(user, projectChat)).toEqual([
      `assistant: ${builtInOpening("lumen", "open-chat")}`,
    ]);
    expect(interview.project?.name).toBe(UNAVAILABLE_PROJECT_NAME);
    expect(await savedLines(user, interview)).toEqual([
      `assistant: ${builtInOpening("lumen", "project-breakdown")}`,
    ]);
  });

  test("renamed copies of a built-in construct and activity open as the built-in ones do", async () => {
    const user = await testUser();
    const [construct, activity] = await Promise.all([
      cloneConstruct(user.id, "lumen"),
      cloneActivity(user.id, "brainstorming"),
      signIn(user),
    ]);
    if (construct === undefined || activity === undefined) {
      throw new Error("The built-in prompts weren't cloned");
    }
    await Promise.all([
      updateConstruct(user.id, construct.id, { name: "Professor Notebook" }),
      updateActivity(user.id, activity.id, { name: "Idea jam" }),
    ]);

    const chat = await standaloneChat(user, construct.id, activity.id);

    expect(chat.construct.name).toBe("Professor Notebook");
    expect(await savedLines(user, chat)).toEqual([
      `assistant: ${builtInOpening("lumen", "brainstorming")}`,
    ]);
  });

  test("an edited activity asks the model to write its opening", async () => {
    const user = await testUser();
    const [activity] = await Promise.all([
      cloneActivity(user.id, "brainstorming"),
      signIn(user),
    ]);
    if (activity === undefined) {
      throw new Error("The built-in activity wasn't cloned");
    }
    await updateActivity(user.id, activity.id, {
      definition: {
        ...activity.definition,
        prompt: `${activity.definition.prompt}\n/mock-error overloaded_error`,
      },
    });

    const result = await startChatAction(
      { kind: "idle" },
      formOf({ projectId: "", constructId: "vellum", activityId: activity.id }),
    );

    expect(result.kind).toBe("claudeUnavailable");
    expect(await listAllChats(user.id)).toEqual([]);
  });

  test("a second chat is separate, with the same opening, and the first keeps its opening first, once, after her message and a later delete of her construct", async () => {
    const user = await testUser();
    const [construct] = await Promise.all([
      cloneConstruct(user.id, "lumen"),
      signIn(user),
    ]);
    if (construct === undefined) {
      throw new Error("The built-in construct wasn't cloned");
    }
    const opening = `assistant: ${builtInOpening("lumen", "project-breakdown")}`;

    const first = await standaloneChat(user, construct.id, "project-breakdown");
    const second = await standaloneChat(
      user,
      construct.id,
      "project-breakdown",
    );
    const reply = await constructReply(first.id, FIRST_MESSAGE);
    await updateConstruct(user.id, construct.id, {
      definition: { ...construct.definition, prompt: "A different voice." },
    });
    expect(await savedLines(user, first)).toEqual([
      opening,
      `user: ${FIRST_MESSAGE}`,
      `assistant: ${messageText(reply)}`,
    ]);
    await retireDefinition(user.id, "construct", construct.id);
    await deleteConstruct(user.id, construct.id);

    expect(second.id).not.toBe(first.id);
    expect(await savedLines(user, second)).toEqual([opening]);
    expect(await savedLines(user, first)).toEqual([
      opening,
      `user: ${FIRST_MESSAGE}`,
      `assistant: ${messageText(reply)}`,
    ]);
  });
});
