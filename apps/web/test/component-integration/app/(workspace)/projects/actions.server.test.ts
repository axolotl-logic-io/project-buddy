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
} from "@/app/(workspace)/projects/actions.ts";
import type { ChatProject } from "@/chats/chat-rows.ts";
import { listMessages } from "@/chats/store.ts";
import { cloneConstruct } from "@/constructs/construct-store.ts";
import { getConstruct } from "@/constructs/index.ts";
import type { Conversation } from "@/conversations/conversation-store.ts";
import { readQuestConversation } from "@/conversations/start-quest.ts";
import { readMemoryHistory } from "@/memory/memory-store.ts";
import {
  PREMADE_QUESTS,
  type PremadeQuestId,
} from "@/projects/premade-quests.ts";
import { PROJECT_NAME_MAX_LENGTH } from "@/projects/project-name.ts";
import { listProjects } from "@/projects/store.ts";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";
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
  changes: Partial<Record<"name" | "journal" | "constructId", string>> = {},
): FormData {
  const quest = premade(id);
  return formOf({
    premadeId: id,
    name: quest.name,
    journal: quest.journal,
    activityId: quest.activityId,
    constructId: "vellum",
    ...changes,
  });
}

// Starts a quest from form as the signed-in user, checks the action opened
// the quest it made, the newest of theirs, and returns its conversation.
async function startQuest(
  user: User,
  form: FormData,
): Promise<Conversation & { readonly project: ChatProject }> {
  const starting = startQuestAction(IDLE, form);
  await Promise.allSettled([starting]);
  const [project] = await listProjects(user.id);
  if (project === undefined) {
    throw new Error("No quest was made");
  }
  await expectRedirect(() => starting, `/projects/${project.id}`);
  const conversation = await readQuestConversation(user.id, project.id);
  if (conversation?.project === undefined) {
    throw new Error("The quest has no conversation");
  }
  return { ...conversation, project: conversation.project };
}

describe("use_case_view_projects", () => {
  test("their quests are listed newest first", async () => {
    const user = await testUser();
    const data = testData(user);
    const older = await data.project();
    const newer = await data.project();

    expect((await listProjects(user.id)).map(({ id }) => id)).toEqual([
      newer.id,
      older.id,
    ]);
  });
});

// A Journal's next step, which the plan keeps instead.
const NEXT_STEP = /next step/iu;

describe("use_case_new_project", () => {
  test("no starting Journal holds a next step, which the plan keeps", () => {
    for (const quest of PREMADE_QUESTS) {
      expect(quest.journal).not.toMatch(NEXT_STEP);
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
      expect(
        await readMemoryHistory(user.id, conversation.project.id),
      ).toMatchObject([{ author: "user", text: premade(id).journal }]);
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

    expect(second.project.id).not.toBe(first.project.id);
    expect((await listProjects(user.id)).map(({ name }) => name)).toEqual([
      "Learn to knit",
      "Learn Spanish",
    ]);
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
    const projects = await listProjects(user.id);
    expect(projects).toHaveLength(1);
    expect(projects[0]).toMatchObject({ name: "Dailies", dailies: true });
  });
});

describe("use_case_new_project_with_construct", () => {
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
    expect(await listProjects(user.id)).toEqual([]);
  });
});

describe("use_case_new_project_without_name", () => {
  test("a name of only spaces asks for a name and makes nothing", async () => {
    const user = await testUser();
    await signIn(user);

    expect(
      await startQuestAction(IDLE, startForm("make", { name: "   " })),
    ).toEqual({ kind: "invalid", message: PROJECTS_COPY.needsName });
    expect(await listProjects(user.id)).toEqual([]);
  });
});

describe("use_case_new_project_name_too_long", () => {
  test("a name longer than the limit is refused and makes nothing", async () => {
    const user = await testUser();
    await signIn(user);
    const name = "Fox ".repeat(PROJECT_NAME_MAX_LENGTH);

    expect(await startQuestAction(IDLE, startForm("make", { name }))).toEqual({
      kind: "invalid",
      message: PROJECTS_COPY.nameTooLong(PROJECT_NAME_MAX_LENGTH),
    });
    expect(await listProjects(user.id)).toEqual([]);
  });

  test("a name of exactly the limit, once trimmed, is made", async () => {
    const user = await testUser();
    await signIn(user);
    const name = "f".repeat(PROJECT_NAME_MAX_LENGTH);

    const conversation = await startQuest(
      user,
      startForm("make", { name: `  ${name}  ` }),
    );

    expect(conversation.project.name).toBe(name);
  });

  test("the limit counts UTF-16 code units, as the name field does, so a fox emoji counts as 2", async () => {
    const user = await testUser();
    await signIn(user);
    const atLimit = "🦊".repeat(PROJECT_NAME_MAX_LENGTH / 2);

    expect(
      await startQuestAction(IDLE, startForm("make", { name: `${atLimit}🦊` })),
    ).toMatchObject({ kind: "invalid" });
    expect(await listProjects(user.id)).toEqual([]);

    const conversation = await startQuest(
      user,
      startForm("make", { name: atLimit }),
    );

    expect(conversation.project.name).toBe(atLimit);
  });
});
