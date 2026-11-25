// "use_case_home_tasks" in use-cases/home.md, against the test database:
// Home reads the one-off tasks of each Active quest open to the user, open
// or checked off today, and nothing of anyone else's.

import { eq, sql } from "drizzle-orm";
import { describe, expect, test } from "vitest";
import type { User } from "@/accounts/users-store.ts";
import { getDb } from "@/db/client.ts";
import { listItems } from "@/db/tables/lists.ts";
import type { ListId } from "@/lists/list.ts";
import {
  type ListItem,
  readListItems,
  writeListContents,
} from "@/lists/list-item-store.ts";
import { readLists } from "@/lists/list-store.ts";
import { changeQuestStatus } from "@/quests/quest-status-store.ts";
import type { Quest } from "@/quests/store.ts";
import { readTaskQuests } from "@/tasks/task-store.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { addMember } from "../quests/quest-members-test-kit.ts";

// Adds a list item to the end of the quest's first list, Tasks, or its
// second, Ideas, and gives back the item and its list's id.
async function add(
  owner: User,
  quest: Quest,
  place: 0 | 1,
  text: string,
): Promise<ListItem & { readonly listId: ListId }> {
  const list = (await readLists(owner.id, quest.id))[place];
  if (list === undefined) {
    throw new Error("The starting lists were not saved");
  }
  await writeListContents(owner.id, quest.id, list.id, { kind: "add", text });
  const item = (await readListItems(owner.id, quest.id, list.id)).at(-1);
  if (item === undefined) {
    throw new Error("The list item was not saved");
  }
  return { ...item, listId: list.id };
}

describe("use_case_home_tasks", () => {
  test("Home reads each Active quest's one-off tasks, open or checked off today, in list order", async () => {
    const owner = await testUser();
    const errands = await testData(owner).quest(
      "Errands",
      new Date("2026-01-01T00:00:00Z"),
    );
    const garden = await testData(owner).quest(
      "Garden",
      new Date("2026-02-01T00:00:00Z"),
    );
    // Added one after the other, so they keep this order in the list.
    const post = await add(owner, errands, 0, "Post the parcel");
    const bank = await add(owner, errands, 0, "Call the bank");
    const stretch = await add(owner, errands, 0, "Stretch");
    const older = await add(owner, errands, 0, "Return the library books");
    const seeds = await add(owner, garden, 0, "Order seeds");
    // Ideas are plain list items, not tasks.
    await add(owner, garden, 1, "A pond");
    const { listId } = post;
    await Promise.all([
      writeListContents(owner.id, errands.id, listId, {
        kind: "recurring",
        id: stretch.id,
        recurring: true,
      }),
      ...[bank, older].map(({ id }) =>
        writeListContents(owner.id, errands.id, listId, {
          kind: "check",
          id,
          checkedOff: true,
        }),
      ),
    ]);
    // Checked off yesterday: done, and gone from Home.
    await getDb()
      .update(listItems)
      .set({ checkedOffOn: sql`${listItems.checkedOffOn} - 1` })
      .where(eq(listItems.id, older.id));

    expect(await readTaskQuests(owner.id)).toEqual([
      {
        quest: { id: errands.id, name: "Errands" },
        tasks: [
          {
            id: post.id,
            listId,
            text: "Post the parcel",
            done: false,
          },
          {
            id: bank.id,
            listId,
            text: "Call the bank",
            done: true,
          },
        ],
      },
      {
        quest: { id: garden.id, name: "Garden" },
        tasks: [
          {
            id: seeds.id,
            listId: seeds.listId,
            text: "Order seeds",
            done: false,
          },
        ],
      },
    ]);
  });

  test("a member reads the shared quest's tasks; a stranger and a closed quest show none", async () => {
    const owner = await testUser();
    const [member, stranger] = [await testUser(), await testUser()];
    const quest = await testData(owner).quest("Move house");
    await add(owner, quest, 0, "Pack the books");
    await addMember(owner, quest.id, member);

    const [read] = await readTaskQuests(owner.id);
    expect(read?.tasks).toMatchObject([{ text: "Pack the books" }]);
    expect(await readTaskQuests(member.id)).toEqual([read]);
    expect(await readTaskQuests(stranger.id)).toEqual([]);

    await changeQuestStatus(owner.id, {
      questId: quest.id,
      fromStatus: "active",
      toStatus: "completed",
      revision: quest.statusRevision,
    });
    expect(await readTaskQuests(owner.id)).toEqual([]);
  });
});
