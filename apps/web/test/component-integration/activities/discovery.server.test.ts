// An activity's start action begins a quest in that activity through the one
// quest start, against the test database with the mock construct. Find
// something to make stands for every activity: the activity's card only
// presets the start.
import { describe, expect, test } from "vitest";
import { getActivity } from "@/activities/index.ts";
import { startQuestAction } from "@/app/(workspace)/projects/actions.ts";
import { getConstruct } from "@/constructs/index.ts";
import { readQuestConversation } from "@/conversations/start-quest.ts";
import { listProjects } from "@/projects/store.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { constructPrompt, formOf } from "../test-database/chat-test-kit.ts";
import { expectRedirect } from "../test-database/navigation-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";

const DISCOVERY = getActivity("find-something-to-make");
const QUEST_NAME = "A small experiment";
describe("use_case_start_chat_in_activity", () => {
  test("starting from an activity opens a new quest in it, beside her other quests", async () => {
    const user = await testUser();
    const existing = await testData(user).project("An ongoing creative quest");
    await signIn(user);

    const starting = startQuestAction(
      { kind: "idle" },
      formOf({
        premadeId: "make",
        name: QUEST_NAME,
        journal: "Goal: explore small paper sculptures.",
        activityId: DISCOVERY.id,
        constructId: "lumen",
      }),
    );
    await Promise.allSettled([starting]);
    const quest = (await listProjects(user.id)).find(
      ({ name }) => name === QUEST_NAME,
    );
    if (quest === undefined) {
      throw new Error("No quest started");
    }
    await expectRedirect(() => starting, `/projects/${quest.id}`);

    const conversation = await readQuestConversation(user.id, quest.id);
    if (conversation === undefined) {
      throw new Error("The quest has no conversation");
    }
    expect(conversation.activity.id).toBe(DISCOVERY.id);
    expect(conversation.construct.name).toBe(getConstruct("lumen").name);
    expect(await readQuestConversation(user.id, existing.id)).toBeUndefined();
    expect(await listProjects(user.id)).toHaveLength(2);
    expect(await constructPrompt(conversation.id)).toContain(
      DISCOVERY.definition.prompt,
    );
  });
});
