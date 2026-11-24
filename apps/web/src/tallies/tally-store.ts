// The tallies of a quest's tally lists and their totals on each date
// (src/tallies/tally.ts). Increments and day totals earn no experience, and
// stay outside a list's undo.
import { and, asc, eq, exists, gte, inArray, lte, sql } from "drizzle-orm";
import {
  listItemOpenTo,
  listOpenTo,
  questOpenTo,
  tallyDayOpenTo,
} from "@/accounts/owner-scope.ts";
import { getDb, inTransaction } from "@/db/client.ts";
import { listItems, lists } from "@/db/tables/lists.ts";
import { quests } from "@/db/tables/quests.ts";
import { tallyDays } from "@/db/tables/tallies.ts";
import { users } from "@/db/tables/users.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import { parseQuestId, type QuestId, type UserId } from "@/ids.ts";
import { LIST_ID } from "@/lists/list.ts";
import { LIST_ITEM_ID, type ListItemId } from "@/lists/list-item.ts";
import { QUEST_TODAY } from "@/lists/quest-today.ts";
import { addDays, type LocalDate } from "@/streaks/streaks.ts";
import {
  TALLY_DAYS,
  type Tally,
  type TallyDay,
  type TallyQuest,
} from "./tally.ts";

// What a change to a tally found: saved; no such tally open to the user;
// a date outside the last TALLY_DAYS up to the quest's today; or a total
// past what a day can hold.
type TallyResult = "saved" | "missing" | "out-of-range" | "too-large";

// Each tally's totals on the dates from first to last, by its id.
async function readDays(
  user: UserId,
  ids: readonly string[],
  { first, last }: { readonly first: LocalDate; readonly last: LocalDate },
): Promise<ReadonlyMap<string, TallyDay[]>> {
  const rows = await getDb()
    .select({
      id: tallyDays.listItemId,
      date: tallyDays.localDate,
      total: tallyDays.total,
    })
    .from(tallyDays)
    .where(
      and(
        inArray(tallyDays.listItemId, [...ids]),
        tallyDayOpenTo(user),
        gte(tallyDays.localDate, first),
        lte(tallyDays.localDate, last),
      ),
    )
    .orderBy(asc(tallyDays.localDate));
  const found = new Map<string, TallyDay[]>();
  for (const { id, date, total } of rows) {
    found.set(id, [...(found.get(id) ?? []), { date, total }]);
  }
  return found;
}

// The sum of each tally's totals over every date, by its id.
async function readSums(
  user: UserId,
  ids: readonly string[],
): Promise<ReadonlyMap<string, string>> {
  const rows = await getDb()
    .select({
      id: tallyDays.listItemId,
      sum: sql<string>`sum(${tallyDays.total})::text`,
    })
    .from(tallyDays)
    .where(and(inArray(tallyDays.listItemId, [...ids]), tallyDayOpenTo(user)))
    .groupBy(tallyDays.listItemId);
  return new Map(rows.map(({ id, sum }) => [id, sum]));
}

// The quest's tallies, in list order across its tally lists, with their
// totals on the last TALLY_DAYS dates up to the quest's today, or
// undefined when the quest isn't open to user.
function readQuestTallies(
  user: UserId,
  questId: QuestId,
): Promise<TallyQuest | undefined> {
  return withAppErrors("readQuestTallies", async () => {
    const db = getDb();
    const [quest] = await db
      .select({
        name: quests.name,
        today: sql<string>`(now() at time zone ${users.timeZone})::date::text`,
      })
      .from(quests)
      .innerJoin(users, eq(users.id, quests.userId))
      .where(and(eq(quests.id, questId), questOpenTo(user)));
    if (quest === undefined) {
      return;
    }
    const rows = await db
      .select({
        id: listItems.id,
        listId: listItems.listId,
        text: listItems.text,
      })
      .from(listItems)
      .innerJoin(lists, eq(lists.id, listItems.listId))
      .where(
        and(
          eq(listItems.questId, questId),
          listItemOpenTo(user),
          listOpenTo(user),
          eq(lists.type, "tally"),
        ),
      )
      .orderBy(lists.position, listItems.position, listItems.id);
    const ids = rows.map(({ id }) => id);
    let days: ReadonlyMap<string, TallyDay[]> = new Map();
    let sums: ReadonlyMap<string, string> = new Map();
    if (ids.length > 0) {
      [days, sums] = await Promise.all([
        readDays(user, ids, {
          first: addDays(quest.today, 1 - TALLY_DAYS),
          last: quest.today,
        }),
        readSums(user, ids),
      ]);
    }
    const tallies: Tally[] = rows.map(({ id, listId, text }) => ({
      id: LIST_ITEM_ID.parse(id),
      listId: LIST_ID.parse(listId),
      text,
      days: days.get(id) ?? [],
      sum: sums.get(id) ?? "0",
    }));
    return {
      quest: { id: questId, name: quest.name },
      today: quest.today,
      tallies,
    };
  });
}

// Every Active quest open to the user that has a tally, oldest first, with
// its tallies, for Home.
function readTallyQuests(user: UserId): Promise<readonly TallyQuest[]> {
  return withAppErrors("readTallyQuests", async () => {
    const db = getDb();
    const rows = await db
      .select({ id: quests.id })
      .from(quests)
      .where(
        and(
          questOpenTo(user),
          eq(quests.status, "active"),
          exists(
            db
              .select({ id: listItems.id })
              .from(listItems)
              .innerJoin(lists, eq(lists.id, listItems.listId))
              .where(
                and(eq(listItems.questId, quests.id), eq(lists.type, "tally")),
              ),
          ),
        ),
      )
      .orderBy(asc(quests.createdAt), asc(quests.id));
    const found = await Promise.all(
      rows.map(async ({ id }) => {
        const questId = parseQuestId(id);
        if (questId === undefined) {
          return [];
        }
        const tallies = await readQuestTallies(user, questId);
        if (tallies === undefined) {
          return [];
        }
        return [tallies];
      }),
    );
    return found.flat();
  });
}

// Adds to, or sets, a tally's total on a date: the date must be one of the
// last TALLY_DAYS up to the quest's today, and the new total must fit a
// day.
function writeTallyDay(
  user: UserId,
  questId: QuestId,
  change: {
    readonly id: ListItemId;
    // The quest's today when undefined.
    readonly date?: LocalDate | undefined;
    readonly amount: string;
    readonly add: boolean;
  },
): Promise<TallyResult> {
  return withAppErrors("writeTallyDay", () =>
    inTransaction(async (tx) => {
      const [tally] = await tx
        .select({ today: sql<string>`${QUEST_TODAY}::text` })
        .from(listItems)
        .innerJoin(lists, eq(lists.id, listItems.listId))
        .where(
          and(
            eq(listItems.id, change.id),
            eq(listItems.questId, questId),
            listItemOpenTo(user),
            listOpenTo(user),
            eq(lists.type, "tally"),
          ),
        )
        .for("update", { of: listItems });
      if (tally === undefined) {
        return "missing";
      }
      const date = change.date ?? tally.today;
      if (date > tally.today || date < addDays(tally.today, 1 - TALLY_DAYS)) {
        return "out-of-range";
      }
      let total = sql`excluded.total`;
      if (change.add) {
        total = sql`${tallyDays.total} + excluded.total`;
      }
      const saved = await tx
        .insert(tallyDays)
        .values({
          questId,
          listItemId: change.id,
          localDate: date,
          total: change.amount,
        })
        .onConflictDoUpdate({
          target: [tallyDays.listItemId, tallyDays.localDate],
          set: { total },
          setWhere: sql`${tallyDayOpenTo(user)} and abs(${total}) < 1e12`,
        })
        .returning({ total: tallyDays.total });
      if (saved.length === 0) {
        return "too-large";
      }
      return "saved";
    }),
  );
}

// Adds amount to the tally's total on its quest's today.
function incrementTally(
  user: UserId,
  questId: QuestId,
  { id, amount }: { readonly id: ListItemId; readonly amount: string },
): Promise<TallyResult> {
  return writeTallyDay(user, questId, { id, amount, add: true });
}

// Sets the tally's total on a date.
function setTallyDay(
  user: UserId,
  questId: QuestId,
  {
    id,
    date,
    total,
  }: {
    readonly id: ListItemId;
    readonly date: LocalDate;
    readonly total: string;
  },
): Promise<TallyResult> {
  return writeTallyDay(user, questId, { id, date, amount: total, add: false });
}

export type { TallyResult };
export { incrementTally, readQuestTallies, readTallyQuests, setTallyDay };
