// Her activities, from the activities pages' forms, in the test database
// with the mock construct: customizing a built-in activity makes a copy of her
// own, and Craft activity makes one, which she edits, clones,
// resets and starts chats in; a chat keeps the activity as it was when it
// entered it; and the built-in activities and other users' activities are
// never changed.
import { describe, expect, test, vi } from "vitest";
import type { User } from "@/accounts/users-store.ts";
import { saveUserName } from "@/accounts/users-store.ts";
import {
  type ActivityDefinition,
  DEFAULT_ACTIVITY_ID,
} from "@/activities/activity.ts";
import { currentActivity } from "@/activities/activity-sessions.ts";
import {
  getOwnActivity,
  listOwnActivities,
  type OwnActivity,
} from "@/activities/activity-store.ts";
import { chosenActivity } from "@/activities/chosen-activity.ts";
import { getActivity } from "@/activities/index.ts";
import { SELECT_ACTIVITY_TOOL } from "@/activities/select-activity-contract.ts";
import {
  cloneActivityAction,
  editBuiltInActivityAction,
  newActivityAction,
  resetActivityPromptAction,
  saveActivityAction,
} from "@/app/(workspace)/activities/actions.ts";
import { getChat } from "@/chats/store.ts";
import { getConstruct } from "@/constructs/index.ts";
import { privateChat } from "@/conversations/private-chat.ts";
import { startProject } from "@/conversations/start-quest.ts";
import type { ChatId } from "@/ids.ts";
import { PROJECT_NAME } from "@/projects/project-name.ts";
import { ACTIVITIES_COPY } from "@/ui/copy/activities.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import {
  constructPrompt,
  constructReply,
  formOf,
} from "../test-database/chat-test-kit.ts";
import {
  expectNotFound,
  expectRedirect,
} from "../test-database/navigation-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";

vi.mock("next/cache", () => ({ refresh: vi.fn(), revalidatePath: vi.fn() }));

const BRAINSTORMING = getActivity("brainstorming");

// The activity page's form: the activity's id, its name and every part.
function activityForm(
  activityId: string,
  name: string,
  parts: ActivityDefinition,
): FormData {
  const data = formOf({ activityId, name });
  for (const key of ["prompt", "openingRequest"] as const) {
    data.set(key, parts[key]);
  }
  return data;
}

// A new user, signed in.
async function signedInUser(): Promise<User> {
  const user = await testUser();
  await signIn(user);
  return user;
}

// Her activity with this id, as stored.
async function stored(user: User, activityId: string): Promise<OwnActivity> {
  const activity = await getOwnActivity(user.id, activityId);
  if (activity === undefined) {
    throw new Error(`${activityId} is not hers`);
  }
  return activity;
}

// Customizes the built-in brainstorming activity, as its Customize button
// does, and returns her new copy.
async function customizeBrainstorming(user: User): Promise<OwnActivity> {
  const customizing = editBuiltInActivityAction(
    formOf({ activityId: "brainstorming" }),
  );
  await Promise.allSettled([customizing]);
  const [copy] = await listOwnActivities(user.id);
  if (copy === undefined) {
    throw new Error("Customizing made no activity");
  }
  await expectRedirect(() => customizing, `/activities/${copy.id}`);
  return copy;
}

// Crafts an activity from the Craft activity button; checks
// it opened the page of the activity it made, and returns that activity.
async function writeNew(user: User): Promise<OwnActivity> {
  const writing = newActivityAction();
  await Promise.allSettled([writing]);
  const activity = (await listOwnActivities(user.id)).at(-1);
  if (activity === undefined) {
    throw new Error("Craft activity made no activity");
  }
  await expectRedirect(() => writing, `/activities/${activity.id}`);
  return activity;
}

// Resets one part of her activity, from its reset button, and checks it
// showed the activity's page again.
async function resetPrompt(activityId: string): Promise<void> {
  await resetActivityPromptAction(formOf({ activityId }));
}

// Starts a quest in the activity with this id, and returns its
// conversation's id.
async function startIn(user: User, activityId: string): Promise<ChatId> {
  const activity = await chosenActivity(user.id, activityId);
  if (activity === undefined) {
    throw new Error(`No activity ${activityId}`);
  }
  const started = await startProject(
    user.id,
    PROJECT_NAME.parse("Activity quest"),
    getConstruct("vellum"),
    { activity },
  );
  if (started.kind !== "started") {
    throw new Error(`The quest didn't start: ${started.kind}`);
  }
  return started.chat.id;
}

describe("use_case_customize_activity", () => {
  test("her copy of a built-in activity is hers to edit, and a chat in it follows her text", async () => {
    const user = await signedInUser();
    await saveUserName(user.id, "Mabel");

    const copy = await customizeBrainstorming(user);
    expect(copy).toMatchObject({
      name: `${BRAINSTORMING.name} (clone)`,
      definition: BRAINSTORMING.definition,
      clonedFrom: "brainstorming",
    });

    const edited: ActivityDefinition = {
      ...copy.definition,
      prompt: "Brainstorm {{name}}'s fox, wildly.",
    };
    await expectRedirect(
      () => saveActivityAction(activityForm(copy.id, "Wild ideas", edited)),
      `/activities/${copy.id}?saved=1`,
    );
    expect(await stored(user, copy.id)).toMatchObject({
      name: "Wild ideas",
      definition: edited,
    });

    const chatId = await startIn(user, copy.id);
    expect(await constructPrompt(chatId)).toContain(
      "Brainstorm Mabel's fox, wildly.",
    );
    expect(getActivity("brainstorming")).toEqual(BRAINSTORMING);
  });

  test("a chat keeps the activity as it was when it entered it", async () => {
    const user = await signedInUser();
    const copy = await customizeBrainstorming(user);
    const chatId = await startIn(user, copy.id);
    const chat = await getChat(user.id, chatId);
    if (chat === undefined) {
      throw new Error("No chat started");
    }

    await saveActivityAction(
      activityForm(copy.id, "Changed", {
        ...copy.definition,
        prompt: "Changed instructions.",
      }),
    ).catch(() => undefined);

    expect(await currentActivity(user.id, chat)).toEqual({
      id: copy.id,
      name: copy.name,
      definition: copy.definition,
    });
    expect(await constructPrompt(chatId)).not.toContain(
      "Changed instructions.",
    );
  });

  test("cloning and resetting her activity keep its source as it was", async () => {
    const user = await signedInUser();
    const copy = await customizeBrainstorming(user);
    await saveActivityAction(
      activityForm(copy.id, copy.name, {
        prompt: "Edited.",
        openingRequest: "Open edited.",
      }),
    ).catch(() => undefined);

    await expectRedirect(
      () => cloneActivityAction(formOf({ sourceId: copy.id })),
      "/activities",
    );
    const clone = (await listOwnActivities(user.id)).at(-1);
    expect(clone).toMatchObject({
      name: `${copy.name} (clone)`,
      definition: { prompt: "Edited.", openingRequest: "Open edited." },
    });

    await resetActivityPromptAction(formOf({ activityId: copy.id }));
    expect((await stored(user, copy.id)).definition).toEqual({
      prompt: BRAINSTORMING.definition.prompt,
      openingRequest: "Open edited.",
    });
  });

  test("another user's activity, or one that isn't built in, is not found", async () => {
    const owner = await signedInUser();
    const copy = await customizeBrainstorming(owner);

    await signedInUser();
    await expectNotFound(() =>
      saveActivityAction(activityForm(copy.id, "Taken", copy.definition)),
    );
    await expectNotFound(() =>
      editBuiltInActivityAction(formOf({ activityId: copy.id })),
    );
    expect((await stored(owner, copy.id)).name).toBe(copy.name);
  });
});

describe("use_case_new_activity", () => {
  test("a new activity starts with default instructions, and each Craft activity makes another", async () => {
    const user = await signedInUser();

    const activity = await writeNew(user);
    expect(activity).toMatchObject({
      name: ACTIVITIES_COPY.newActivityName,
      definition: getActivity(DEFAULT_ACTIVITY_ID).definition,
      clonedFrom: undefined,
    });

    const edited: ActivityDefinition = {
      prompt: "Edited.",
      openingRequest: "Open edited.",
    };
    await expectRedirect(
      () =>
        saveActivityAction(activityForm(activity.id, activity.name, edited)),
      `/activities/${activity.id}?saved=1`,
    );
    expect((await stored(user, activity.id)).definition).toEqual(edited);
    await resetPrompt(activity.id);
    expect((await stored(user, activity.id)).definition).toEqual({
      ...activity.definition,
      openingRequest: "Open edited.",
    });

    await writeNew(user);
    expect((await listOwnActivities(user.id)).map(({ name }) => name)).toEqual([
      ACTIVITIES_COPY.newActivityName,
      ACTIVITIES_COPY.newActivityName,
    ]);
  });

  test("her new activity can be written, started, entered by the construct and cloned, and is hers alone", async () => {
    const user = await signedInUser();
    const activity = await writeNew(user);
    const parts: ActivityDefinition = {
      prompt: "Plan a picnic, step by step.",
      openingRequest: "Ask where the picnic is.",
    };
    await expectRedirect(
      () => saveActivityAction(activityForm(activity.id, "Picnic", parts)),
      `/activities/${activity.id}?saved=1`,
    );

    const started = await startIn(user, activity.id);
    expect(await constructPrompt(started)).toContain(parts.prompt);

    const chat = await privateChat(user.id);
    await constructReply(
      chat.id,
      `/mock-tool ${SELECT_ACTIVITY_TOOL} ${JSON.stringify({ activityId: activity.id })}`,
    );
    expect(await currentActivity(user.id, chat)).toEqual({
      id: activity.id,
      name: "Picnic",
      definition: parts,
    });

    await expectRedirect(
      () => cloneActivityAction(formOf({ sourceId: activity.id })),
      "/activities",
    );
    expect((await listOwnActivities(user.id)).at(-1)).toMatchObject({
      name: "Picnic (clone)",
      definition: parts,
    });

    const other = await signedInUser();
    await expectNotFound(() =>
      saveActivityAction(activityForm(activity.id, "Taken", parts)),
    );
    expect(await listOwnActivities(other.id)).toEqual([]);
    expect((await stored(user, activity.id)).name).toBe("Picnic");
  });
});
