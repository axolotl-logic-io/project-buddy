// How the stores keep their reads of quests (src/db/read-cache.ts). A read
// through one quest is tagged with that quest. A read across the user's
// quests, such as Home's, is tagged with every quest open to them, so a
// change in any of them, including one that adds the first row the read
// would find, expires it. A read that depends on today is kept until the
// next midnight of the quests it reads (src/lists/quest-today.ts).
import { eq, or, type SQL, sql } from "drizzle-orm";
import { questOpenTo, questPendingFor } from "@/accounts/owner-scope.ts";
import { getDb } from "@/db/client.ts";
import { expireReads, keepRead } from "@/db/read-cache.ts";
import { quests } from "@/db/tables/quests.ts";
import { users } from "@/db/tables/users.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import { parseQuestId, type QuestId, type UserId } from "@/ids.ts";

// Seconds from now to the next midnight in the time zone of the quest's
// owner, at least one.
const SECONDS_TO_MIDNIGHT: SQL<number> = sql<number>`greatest(1, ceil(extract(epoch from (date_trunc('day', now() at time zone ${users.timeZone}) + interval '1 day') - (now() at time zone ${users.timeZone}))))::int`;

interface OpenQuest {
  readonly id: QuestId;
  readonly secondsToMidnight: number;
}

function openQuests(user: UserId): Promise<readonly OpenQuest[]> {
  return withAppErrors("openQuests", async () => {
    const rows = await getDb()
      .select({ id: quests.id, secondsToMidnight: SECONDS_TO_MIDNIGHT })
      .from(quests)
      .innerJoin(users, eq(users.id, quests.userId))
      .where(questOpenTo(user));
    return rows.flatMap(({ id, secondsToMidnight }) => {
      const questId = parseQuestId(id);
      if (questId === undefined) {
        return [];
      }
      return [{ id: questId, secondsToMidnight }];
    });
  });
}

function soonestMidnight(open: readonly OpenQuest[]): number | undefined {
  if (open.length === 0) {
    return undefined;
  }
  return Math.min(...open.map(({ secondsToMidnight }) => secondsToMidnight));
}

// Keeps a read across every quest open to user that does not depend on the
// date, such as their quests' names.
async function keepQuestsRead(user: UserId): Promise<void> {
  const open = await openQuests(user);
  keepRead(
    user,
    open.map(({ id }) => id),
  );
}

// Keeps a read across every quest open to user that depends on today.
async function keepQuestsReadToday(user: UserId): Promise<void> {
  const open = await openQuests(user);
  keepRead(
    user,
    open.map(({ id }) => id),
    soonestMidnight(open),
  );
}

// Keeps a read through one quest that does not depend on the date.
function keepQuestRead(user: UserId, quest: QuestId): void {
  keepRead(user, [quest]);
}

// Keeps a read through one quest that depends on today. A quest not open to
// user is kept until their account changes, as any read is.
async function keepQuestReadToday(user: UserId, quest: QuestId): Promise<void> {
  const open = await openQuests(user);
  keepRead(
    user,
    [quest],
    soonestMidnight(open.filter(({ id }) => id === quest)),
  );
}

// Expires the reads that show the user's name or their quests' day: their
// own, and those of every quest open to them or that they are invited to.
async function expireAccountReads(user: UserId): Promise<void> {
  const rows = await withAppErrors("expireAccountReads", () =>
    getDb()
      .select({ id: quests.id })
      .from(quests)
      .where(or(questOpenTo(user), questPendingFor(user))),
  );
  expireReads({
    accounts: [user],
    quests: rows.flatMap(({ id }) => parseQuestId(id) ?? []),
  });
}

export {
  expireAccountReads,
  keepQuestRead,
  keepQuestReadToday,
  keepQuestsRead,
  keepQuestsReadToday,
  openQuests,
};
