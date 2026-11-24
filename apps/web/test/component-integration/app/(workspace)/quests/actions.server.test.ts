// Starting quests, in the test database: what the one start action makes
// from each of the four starting points, as the stores give it to the
// pages.

import { describe, expect, test } from "vitest";
import type { User } from "@/accounts/users-store.ts";
import {
  type StartQuestState,
  startQuestAction,
} from "@/app/(workspace)/quests/actions.ts";
import { getConstruct, listConstructs } from "@/constructs/index.ts";
import { readLists } from "@/lists/list-store.ts";
import { listPerformances } from "@/performances/performance-store.ts";
import {
  PREMADE_QUESTS,
  type PremadeQuestId,
} from "@/quests/premade-quests.ts";
import { QUEST_NAME_MAX_LENGTH } from "@/quests/quest-name.ts";
import { listQuests, type Quest } from "@/quests/store.ts";
import { QUESTS_COPY } from "@/ui/copy/quests.ts";
import { testData } from "../../../../support/test-database/data-test-kit.ts";
import { testUser } from "../../../../support/test-database/user-test-kit.ts";
import { formOf } from "../../../test-database/form-test-kit.ts";
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
    ...changes,
  });
}

// Starts a quest from form as the signed-in user, checks the action opened
// the quest it made, the newest of theirs, and returns it.
async function startQuest(user: User, form: FormData): Promise<Quest> {
  const starting = startQuestAction(IDLE, form);
  await Promise.allSettled([starting]);
  const [quest] = await listQuests(user.id);
  if (quest === undefined) {
    throw new Error("No quest was made");
  }
  await expectRedirect(() => starting, `/quests/${quest.id}`);
  return quest;
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

// A next step written into a starting context, which belongs in the
// quest's Tasks list instead.
const NEXT_STEP = /next step/iu;

describe("use_case_new_quest", () => {
  test("no starting point's context holds a next step, which belongs in Tasks", () => {
    for (const quest of PREMADE_QUESTS) {
      expect(quest.context).not.toMatch(NEXT_STEP);
    }
  });

  test.each(["learn", "make", "do"] as const)(
    "%s opens its quest with starting lists and no active performance",
    async (id) => {
      const user = await testUser();
      await signIn(user);

      const started = await startQuest(user, startForm(id));

      expect(started.constructId).toBe(premade(id).constructId);
      expect(await listPerformances(user.id, started.id)).toEqual([]);
      expect(
        (await readLists(user.id, started.id)).map(({ type }) => type),
      ).toEqual(["task", "plain"]);
    },
  );

  test.each(["learn", "dailies"] as const)(
    "%s keeps the optional Why in its quest context",
    async (id) => {
      const user = await testUser();
      await signIn(user);
      const started = await startQuest(
        user,
        startForm(id, { motivation: "  Make time for myself.  " }),
      );
      expect(started.startingContext).toBe("Make time for myself.");
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

    expect(second.id).not.toBe(first.id);
    expect((await listQuests(user.id)).map(({ name }) => name)).toEqual([
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
    const before = await readLists(user.id, first.id);

    const again = await startQuest(
      user,
      startForm("dailies", { name: "Mornings" }),
    );

    expect(again.id).toBe(first.id);
    expect(await readLists(user.id, again.id)).toEqual(before);
    const quests = await listQuests(user.id);
    expect(quests).toHaveLength(1);
    expect(quests[0]).toMatchObject({ name: "Dailies", dailies: true });
  });
});

describe("use_case_new_quest_with_construct", () => {
  test.each(["dailies", "learn", "make", "do"] as const)(
    "%s uses its assigned construct even when a different construct is submitted",
    async (id) => {
      const user = await testUser();
      await signIn(user);
      const assigned = getConstruct(premade(id).constructId);
      const other = listConstructs().find(
        (construct) => construct.id !== assigned.id,
      );
      if (other === undefined) {
        throw new Error("No other construct");
      }
      const started = await startQuest(
        user,
        startForm(id, { constructId: other.id }),
      );
      expect(started.constructId).toBe(assigned.id);
    },
  );
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

    const started = await startQuest(
      user,
      startForm("make", { name: `  ${name}  ` }),
    );

    expect(started.name).toBe(name);
  });

  test("the limit counts UTF-16 code units, as the name field does, so a fox emoji counts as 2", async () => {
    const user = await testUser();
    await signIn(user);
    const atLimit = "🦊".repeat(QUEST_NAME_MAX_LENGTH / 2);

    expect(
      await startQuestAction(IDLE, startForm("make", { name: `${atLimit}🦊` })),
    ).toMatchObject({ kind: "invalid" });
    expect(await listQuests(user.id)).toEqual([]);

    const started = await startQuest(
      user,
      startForm("make", { name: atLimit }),
    );

    expect(started.name).toBe(atLimit);
  });
});
