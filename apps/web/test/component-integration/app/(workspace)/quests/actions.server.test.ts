// Starting quests, in the test database: what New quest makes from a name
// and an optional Why, as the stores give it to the pages.

import { describe, expect, test, vi } from "vitest";
import type { User } from "@/accounts/users-store.ts";
import {
  type StartQuestState,
  startQuestAction,
} from "@/app/(workspace)/quests/actions.ts";
import { readLists } from "@/lists/list-store.ts";
import { listPerformances } from "@/performances/performance-store.ts";
import { QUEST_NAME_MAX_LENGTH } from "@/quests/quest-name.ts";
import { listQuests, type Quest } from "@/quests/store.ts";
import { QUESTS_COPY } from "@/ui/copy/quests.ts";
import { testData } from "../../../../support/test-database/data-test-kit.ts";
import { testUser } from "../../../../support/test-database/user-test-kit.ts";
import { formOf } from "../../../test-database/form-test-kit.ts";
import { expectRedirect } from "../../../test-database/navigation-test-kit.ts";
import { signIn } from "../../../test-database/session-test-kit.ts";

const IDLE: StartQuestState = { kind: "idle" };

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

// The New quest form, with a name and any other field.
function startForm(
  name: string,
  others: Partial<Record<"motivation" | "constructId", string>> = {},
): FormData {
  return formOf({ name, ...others });
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

describe("use_case_new_quest", () => {
  test("opens its quest with a Tasks and an Ideas list and no active performance", async () => {
    const user = await testUser();
    await signIn(user);

    const started = await startQuest(user, startForm("Learn Spanish"));

    expect(started).toMatchObject({
      name: "Learn Spanish",
      status: "active",
      life: false,
    });
    expect(await listPerformances(user.id, started.id)).toEqual([]);
    expect(
      (await readLists(user.id, started.id)).map(({ name, type }) => ({
        name,
        type,
      })),
    ).toEqual([
      { name: "Tasks", type: "task" },
      { name: "Ideas", type: "plain" },
    ]);
  });

  test("keeps the optional Why, trimmed, as its starting context", async () => {
    const user = await testUser();
    await signIn(user);

    const started = await startQuest(
      user,
      startForm("Knit", { motivation: "  Make time for myself.  " }),
    );

    expect(started.startingContext).toBe("Make time for myself.");
  });

  test("without a Why, its starting context is empty", async () => {
    const user = await testUser();
    await signIn(user);

    const started = await startQuest(user, startForm("Knit"));

    expect(started.startingContext).toBe("");
  });

  test("each start is a quest of its own", async () => {
    const user = await testUser();
    await signIn(user);

    const first = await startQuest(user, startForm("Learn Spanish"));
    const second = await startQuest(user, startForm("Learn Spanish"));

    expect(second.id).not.toBe(first.id);
    expect(await listQuests(user.id)).toHaveLength(2);
  });
});

describe("use_case_new_quest_with_construct", () => {
  test("a new quest uses Vellum, whatever construct is submitted", async () => {
    const user = await testUser();
    await signIn(user);

    const started = await startQuest(
      user,
      startForm("Make a fox", { constructId: "lumen" }),
    );

    expect(started.constructId).toBe("vellum");
  });
});

describe("use_case_new_quest_without_name", () => {
  test("a name of only spaces asks for a name and makes nothing", async () => {
    const user = await testUser();
    await signIn(user);

    expect(await startQuestAction(IDLE, startForm("   "))).toEqual({
      kind: "invalid",
      message: QUESTS_COPY.needsName,
    });
    expect(await listQuests(user.id)).toEqual([]);
  });
});

describe("use_case_new_quest_name_too_long", () => {
  test("a name longer than the limit is refused and makes nothing", async () => {
    const user = await testUser();
    await signIn(user);
    const name = "Fox ".repeat(QUEST_NAME_MAX_LENGTH);

    expect(await startQuestAction(IDLE, startForm(name))).toEqual({
      kind: "invalid",
      message: QUESTS_COPY.nameTooLong(QUEST_NAME_MAX_LENGTH),
    });
    expect(await listQuests(user.id)).toEqual([]);
  });

  test("a name of exactly the limit, once trimmed, is made", async () => {
    const user = await testUser();
    await signIn(user);
    const name = "f".repeat(QUEST_NAME_MAX_LENGTH);

    const started = await startQuest(user, startForm(`  ${name}  `));

    expect(started.name).toBe(name);
  });

  test("the limit counts UTF-16 code units, as the name field does, so a fox emoji counts as 2", async () => {
    const user = await testUser();
    await signIn(user);
    const atLimit = "🦊".repeat(QUEST_NAME_MAX_LENGTH / 2);

    expect(
      await startQuestAction(IDLE, startForm(`${atLimit}🦊`)),
    ).toMatchObject({ kind: "invalid" });
    expect(await listQuests(user.id)).toEqual([]);

    const started = await startQuest(user, startForm(atLimit));

    expect(started.name).toBe(atLimit);
  });
});
