// "use_case_prepared_opening" in use-cases/: a quest started in a built-in
// construct and a built-in activity, or in copies of the user's own that she
// has only renamed, opens at once with the opening prepared for them
// (src/activities/prepared-openings.ts), asking nothing of Claude. The mock
// construct fails any model call whose prompt holds `/mock-error <type>`
// (mock-opening.ts), which a quest's name puts there, so a quest that starts
// with such a name asked nothing of Claude.

import { describe, expect, test } from "vitest";
import type { User } from "@/accounts/users-store.ts";
import type { ActivityId } from "@/activities/activity.ts";
import { cloneActivity, updateActivity } from "@/activities/activity-store.ts";
import { chosenActivity } from "@/activities/chosen-activity.ts";
import { getActivity, listActivities } from "@/activities/index.ts";
import { preparedOpening } from "@/activities/prepared-openings.ts";
import type { Chat } from "@/chats/chat-rows.ts";
import { listMessages } from "@/chats/store.ts";
import { chosenConstruct } from "@/constructs/chosen-construct.ts";
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
import { startProject } from "@/conversations/start-quest.ts";
import { PROJECT_NAME } from "@/projects/project-name.ts";
import { listProjects } from "@/projects/store.ts";
import { retireDefinition } from "@/retirement/retirement-store.ts";
import { goldSpent } from "../../support/test-database/gold-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { constructReply, messageText } from "../test-database/chat-test-kit.ts";
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

// The conversation of a new quest of the user's, named name, in the
// construct and activity with these ids, as the start form gives them.
async function questIn(
  user: User,
  constructId: string,
  activityId: string,
  name = "Fox",
): Promise<Chat> {
  const [construct, activity] = await Promise.all([
    chosenConstruct(user.id, constructId),
    chosenActivity(user.id, activityId),
  ]);
  if (construct === undefined || activity === undefined) {
    throw new Error("No such construct or activity");
  }
  const result = await startProject(
    user.id,
    PROJECT_NAME.parse(name),
    construct.construct,
    { activity },
  );
  if (result.kind !== "started") {
    throw new Error(`The quest didn't start: ${result.kind}`);
  }
  return result.chat;
}

// The texts of the chat's messages, in order, by role.
async function savedLines(user: User, chat: Chat): Promise<string[]> {
  const messages = await listMessages(user.id, chat.id);
  return messages.map((message) => `${message.role}: ${messageText(message)}`);
}

describe("use_case_prepared_opening", () => {
  test("every built-in construct opens a quest in each activity with its own prepared opening", async () => {
    const user = await testUser();
    const pairs = listConstructs().flatMap((construct) =>
      NEW_CHAT_ACTIVITIES.map((activity) => ({ construct, activity })),
    );

    const openings = await Promise.all(
      pairs.map(async ({ construct, activity }) => {
        const chat = await questIn(user, construct.id, activity.id);
        return {
          saved: await savedLines(user, chat),
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

  test("every built-in construct opens a new quest with its prepared opening while Claude is unavailable", async () => {
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

    const chat = await questIn(user, construct.id, activity.id);

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

    const edited = await chosenActivity(user.id, activity.id);
    if (edited === undefined) {
      throw new Error("Her activity is not hers");
    }

    const result = await startProject(
      user.id,
      PROJECT_NAME.parse("Fox"),
      getConstruct("vellum"),
      { activity: edited },
    );

    expect(result.kind).toBe("claudeUnavailable");
    expect(await listProjects(user.id)).toEqual([]);
  });

  test("a second quest has its own conversation, with the same opening, and the first keeps its opening first, once, after her message and a later delete of her construct", async () => {
    const user = await testUser();
    const [construct] = await Promise.all([
      cloneConstruct(user.id, "lumen"),
      signIn(user),
    ]);
    if (construct === undefined) {
      throw new Error("The built-in construct wasn't cloned");
    }
    const opening = `assistant: ${builtInOpening("lumen", "project-breakdown")}`;

    const first = await questIn(user, construct.id, "project-breakdown");
    const second = await questIn(user, construct.id, "project-breakdown");
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
