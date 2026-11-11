// Activity and Construct start actions begin a quest through the one quest
// start with their choice preset, against the test database with the mock
// construct. Find something to make stands for every activity, and an own
// construct for every construct: the cards only preset the start.
import { describe, expect, test } from "vitest";
import { getActivity } from "@/activities/index.ts";
import { startQuestAction } from "@/app/(workspace)/projects/actions.ts";
import { getConstruct } from "@/constructs/index.ts";
import { readQuestConversation } from "@/conversations/start-quest.ts";
import type { UserId } from "@/ids.ts";
import { listProjects, type Project } from "@/projects/store.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { constructPrompt, formOf } from "../test-database/chat-test-kit.ts";
import { expectRedirect } from "../test-database/navigation-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";

const DISCOVERY = getActivity("find-something-to-make");
const QUEST_NAME = "A small experiment";

// Starts a quest with the details the start's form sends, and returns the
// quest named QUEST_NAME, having checked the start opened it.
async function startedQuest(
  owner: UserId,
  details: Readonly<Record<string, string>>,
): Promise<Project> {
  const starting = startQuestAction(
    { kind: "idle" },
    formOf({ name: QUEST_NAME, journal: "", ...details }),
  );
  await Promise.allSettled([starting]);
  const quest = (await listProjects(owner)).find(
    ({ name }) => name === QUEST_NAME,
  );
  if (quest === undefined) {
    throw new Error("No quest started");
  }
  await expectRedirect(() => starting, `/projects/${quest.id}`);
  return quest;
}
describe("use_case_start_chat_in_activity", () => {
  test("starting from an activity opens a new quest in it, beside her other quests", async () => {
    const user = await testUser();
    const existing = await testData(user).project("An ongoing creative quest");
    await signIn(user);

    const quest = await startedQuest(user.id, {
      premadeId: "make",
      journal: "Goal: explore small paper sculptures.",
      activityId: DISCOVERY.id,
      constructId: "lumen",
    });

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

describe("a construct's start action", () => {
  test("starting with her own construct opens a quest that speaks with it", async () => {
    const user = await testUser();
    const own = await testData(user).editedConstruct();
    await signIn(user);

    const quest = await startedQuest(user.id, {
      premadeId: "do",
      activityId: "project-breakdown",
      constructId: own.id,
    });

    const conversation = await readQuestConversation(user.id, quest.id);
    expect(conversation?.construct.name).toBe(own.name);
    expect(conversation?.activity.id).toBe("project-breakdown");
  });
});
