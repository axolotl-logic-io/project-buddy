// Starting quests, in the test database with the mock construct: what the
// one start action makes from each of the four starting points, as the
// stores give it to the pages. Concurrent Dailies starts and their
// isolation are conversations.server.test.ts's.

import { describe, expect, test } from "vitest";
import type { User } from "@/accounts/users-store.ts";
import { currentActivity } from "@/activities/activity-sessions.ts";
import {
  type StartQuestState,
  startQuestAction,
} from "@/app/(workspace)/quests/actions.ts";
import type { ChatQuest } from "@/chats/chat-rows.ts";
import { listMessages } from "@/chats/store.ts";
import { cloneConstruct } from "@/constructs/construct-store.ts";
import { getConstruct } from "@/constructs/index.ts";
import type { Conversation } from "@/conversations/conversation-store.ts";
import { readQuestConversation } from "@/conversations/start-quest.ts";
import {
  PREMADE_QUESTS,
  type PremadeQuestId,
} from "@/quests/premade-quests.ts";
import { QUEST_NAME_MAX_LENGTH } from "@/quests/quest-name.ts";
import { listQuests } from "@/quests/store.ts";
import { QUESTS_COPY } from "@/ui/copy/quests.ts";
import { testData } from "../../../../support/test-database/data-test-kit.ts";
import { testUser } from "../../../../support/test-database/user-test-kit.ts";
import { formOf, messageText } from "../../../test-database/chat-test-kit.ts";
import { expectRedirect } from "../../../test-database/navigation-test-kit.ts";
import { signIn } from "../../../test-database/session-test-kit.ts";

const IDLE: StartQuestState = { kind: "idle" };

// The starting point of id, as its details are first filled in.
function premade(id: PremadeQuestId): (typeof PREMADE_QUESTS)[number] {
  const quest = PREMADE_QUESTS.find((offering) => offering.id === id);
  if (quest === undefined) {
    throw new Error(`No starting point ${id}`);
  }
  return quest;
}

// The start form for the starting point id, as its details are first
// filled in, with any field changed.
function startForm(
  id: PremadeQuestId,
  changes: Partial<
    Record<"name" | "context" | "constructId" | "motivation", string>
  > = {},
): FormData {
  const quest = premade(id);
  return formOf({
    premadeId: id,
    name: quest.name,
    context: quest.context,
    constructId: "vellum",
    ...changes,
  });
}

// Starts a quest from form as the signed-in user, checks the action opened
// the quest it made, the newest of theirs, and returns its conversation.
async function startQuest(
  user: User,
  form: FormData,
): Promise<Conversation & { readonly quest: ChatQuest }> {
  const starting = startQuestAction(IDLE, form);
  await Promise.allSettled([starting]);
  const [quest] = await listQuests(user.id);
  if (quest === undefined) {
    throw new Error("No quest was made");
  }
  await expectRedirect(() => starting, `/quests/${quest.id}`);
  const conversation = await readQuestConversation(user.id, quest.id);
  if (conversation?.quest === undefined) {
    throw new Error("The quest has no conversation");
  }
  return { ...conversation, quest: conversation.quest };
}

describe("use_case_view_quests", () => {
  test("their quests are listed newest first", async () => {
    const user = await testUser();
    const data = testData(user);
    const older = await data.quest();
    const newer = await data.quest();

    expect((await listQuests(user.id)).map(({ id }) => id)).toEqual([
      newer.id,
      older.id,
    ]);
  });
});

// A Journal's next step, which the plan keeps instead.
const NEXT_STEP = /next step/iu;

describe("use_case_new_quest", () => {
  test("no starting Journal holds a next step, which the plan keeps", () => {
    for (const quest of PREMADE_QUESTS) {
      expect(quest.context).not.toMatch(NEXT_STEP);
    }
  });

  test.each([
    ["learn", "learn-a-thing"],
    ["make", "find-something-to-make"],
    ["do", "project-breakdown"],
  ] as const)(
    "%s opens its quest's one conversation in %s, with its opening and Journal",
    async (id, activityId) => {
      const user = await testUser();
      await signIn(user);

      const conversation = await startQuest(user, startForm(id));

      expect(conversation.construct.name).toBe(getConstruct("vellum").name);
      expect((await currentActivity(user.id, conversation)).id).toBe(
        activityId,
      );
      const messages = await listMessages(user.id, conversation.id);
      expect(messages.map(({ role }) => role)).toEqual(["assistant"]);
      expect(messages.map(messageText).join("")).not.toBe("");
      expect(messages).toHaveLength(1);
    },
  );

  test.each(["learn", "dailies"] as const)(
    "%s keeps the optional Why in its opening conversation",
    async (id) => {
      const user = await testUser();
      await signIn(user);
      const conversation = await startQuest(
        user,
        startForm(id, { motivation: "  Make time for myself.  " }),
      );
      const messages = await listMessages(user.id, conversation.id);
      expect(messages.map(({ role }) => role)).toEqual(["user", "assistant"]);
      expect(messageText(messages[0])).toBe("Make time for myself.");
      expect(messageText(messages[1])).toContain("Make time for myself.");
    },
  );

  test("each start is a quest of its own, for another goal", async () => {
    const user = await testUser();
    await signIn(user);

    const first = await startQuest(
      user,
      startForm("learn", { name: "Learn Spanish" }),
    );
    const second = await startQuest(
      user,
      startForm("learn", { name: "Learn to knit" }),
    );

    expect(second.quest.id).not.toBe(first.quest.id);
    expect((await listQuests(user.id)).map(({ name }) => name)).toEqual([
      "Learn to knit",
      "Learn Spanish",
    ]);
  });

  test("the starting point chooses the activity, whatever an older form sends", async () => {
    const user = await testUser();
    await signIn(user);
    const form = startForm("make");
    form.set("activityId", "brainstorming");

    const conversation = await startQuest(user, form);

    expect((await currentActivity(user.id, conversation)).id).toBe(
      "find-something-to-make",
    );
  });
});

describe("use_case_dailies", () => {
  test("starting Dailies again opens the same quest, even renamed, and writes nothing", async () => {
    const user = await testUser();
    await signIn(user);
    const first = await startQuest(user, startForm("dailies"));
    const before = await listMessages(user.id, first.id);

    const again = await startQuest(
      user,
      startForm("dailies", { name: "Mornings" }),
    );

    expect(again.id).toBe(first.id);
    expect(await listMessages(user.id, again.id)).toEqual(before);
    const quests = await listQuests(user.id);
    expect(quests).toHaveLength(1);
    expect(quests[0]).toMatchObject({ name: "Dailies", dailies: true });
  });
});

describe("use_case_new_quest_with_construct", () => {
  test("the quest is with their own construct, when they chose it", async () => {
    const user = await testUser();
    await signIn(user);
    const own = await cloneConstruct(user.id, "lumen");
    if (own === undefined) {
      throw new Error("Lumen could not be cloned");
    }

    const conversation = await startQuest(
      user,
      startForm("do", { constructId: own.id }),
    );

    expect(conversation.construct.name).toBe(own.name);
    expect(conversation.construct.definition).toEqual(own.definition);
  });

  test("another user's construct cannot start a quest", async () => {
    const user = await testUser();
    const other = await testUser();
    const own = await cloneConstruct(other.id, "lumen");
    if (own === undefined) {
      throw new Error("No construct was cloned");
    }
    await signIn(user);

    expect(
      await startQuestAction(IDLE, startForm("do", { constructId: own.id })),
    ).toMatchObject({ kind: "invalid" });
    expect(await listQuests(user.id)).toEqual([]);
  });
});

describe("use_case_new_quest_without_name", () => {
  test("a name of only spaces asks for a name and makes nothing", async () => {
    const user = await testUser();
    await signIn(user);

    expect(
      await startQuestAction(IDLE, startForm("make", { name: "   " })),
    ).toEqual({ kind: "invalid", message: QUESTS_COPY.needsName });
    expect(await listQuests(user.id)).toEqual([]);
  });
});

describe("use_case_new_quest_name_too_long", () => {
  test("a name longer than the limit is refused and makes nothing", async () => {
    const user = await testUser();
    await signIn(user);
    const name = "Fox ".repeat(QUEST_NAME_MAX_LENGTH);

    expect(await startQuestAction(IDLE, startForm("make", { name }))).toEqual({
      kind: "invalid",
      message: QUESTS_COPY.nameTooLong(QUEST_NAME_MAX_LENGTH),
    });
    expect(await listQuests(user.id)).toEqual([]);
  });

  test("a name of exactly the limit, once trimmed, is made", async () => {
    const user = await testUser();
    await signIn(user);
    const name = "f".repeat(QUEST_NAME_MAX_LENGTH);

    const conversation = await startQuest(
      user,
      startForm("make", { name: `  ${name}  ` }),
    );

    expect(conversation.quest.name).toBe(name);
  });

  test("the limit counts UTF-16 code units, as the name field does, so a fox emoji counts as 2", async () => {
    const user = await testUser();
    await signIn(user);
    const atLimit = "🦊".repeat(QUEST_NAME_MAX_LENGTH / 2);

    expect(
      await startQuestAction(IDLE, startForm("make", { name: `${atLimit}🦊` })),
    ).toMatchObject({ kind: "invalid" });
    expect(await listQuests(user.id)).toEqual([]);

    const conversation = await startQuest(
      user,
      startForm("make", { name: atLimit }),
    );

    expect(conversation.quest.name).toBe(atLimit);
  });
});
