import { and, desc, eq, sql } from "drizzle-orm";
import {
  performanceMessageOpenTo,
  performanceOpenTo,
  questOpenTo,
} from "@/accounts/owner-scope.ts";
import { getDb } from "@/db/client.ts";
import { performanceMessages, performances } from "@/db/tables/performances.ts";
import { quests } from "@/db/tables/quests.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import { parseQuestId, type QuestId, type UserId } from "@/ids.ts";
import { readNextTasks } from "@/lists/list-item-store.ts";
import type { QuestSharing } from "@/quests/membership.ts";
import { SHARING_COLUMNS, sharingOf } from "@/quests/quest-sharing.ts";

interface CurrentQuest {
  readonly quest: { readonly id: QuestId; readonly name: string };
  readonly sharing: QuestSharing;
  readonly nextTask: string | undefined;
}

function readCurrentQuest(owner: UserId): Promise<CurrentQuest | undefined> {
  return withAppErrors("readCurrentQuest", async () => {
    const db = getDb();
    const activity = db
      .select({ time: sql`max(${performanceMessages.createdAt})` })
      .from(performanceMessages)
      .innerJoin(
        performances,
        eq(performances.id, performanceMessages.performanceId),
      )
      // Fully qualify the outer column so it remains a correlated subquery.
      .where(
        and(
          sql`${performances.questId} = "quests"."id"`,
          performanceOpenTo(owner),
          performanceMessageOpenTo(owner),
        ),
      );

    const [latest] = await db
      .select({ id: quests.id, name: quests.name, ...SHARING_COLUMNS })
      .from(quests)
      .where(and(questOpenTo(owner), eq(quests.status, "active")))
      .orderBy(
        desc(sql`coalesce((${activity}), ${quests.createdAt})`),
        desc(quests.id),
      )
      .limit(1);
    const id = parseQuestId(latest?.id ?? "");
    if (latest === undefined || id === undefined) {
      return;
    }
    return {
      quest: { id, name: latest.name },
      sharing: sharingOf(owner, latest),
      nextTask: (await readNextTasks(owner, id, 1))[0]?.text,
    };
  });
}

export type { CurrentQuest };
export { readCurrentQuest };
