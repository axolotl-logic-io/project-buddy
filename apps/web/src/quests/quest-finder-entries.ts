// Quests' rows, read on the server so their words don't depend on the
// browser's clock: each quest with its construct's initial, how long ago
// something happened in it, and whether it is resting.
import { getConstruct } from "@/constructs/index.ts";
import type { QuestEntry } from "@/quests/quest-index-store.ts";
import type { Quest } from "@/quests/store.ts";
import { QUEST_FINDER_COPY } from "@/ui/copy/quests.ts";

// An Active quest with nothing happening in it for this many days rests.
const RESTING_DAYS = 30;

const MINUTE: number = 60_000;
const HOUR: number = 60 * MINUTE;
const DAY: number = 24 * HOUR;

const RELATIVE: Intl.RelativeTimeFormat = new Intl.RelativeTimeFormat("en", {
  numeric: "auto",
});

// One quest as Quests shows it.
interface FinderQuest {
  readonly quest: Quest;
  // The first letter of its construct's name, on its seal.
  readonly seal: string;
  readonly openTasks: number;
  readonly runningRite: string | undefined;
  // When something last happened in it, as an ISO time, for sorting.
  readonly lastActive: string;
  // When something last happened in it, in words.
  readonly activity: string;
  // Active, with nothing happening in it for RESTING_DAYS days.
  readonly resting: boolean;
}

// How long ago then was, in words: minutes, hours or days.
function ago(then: Date, now: Date): string {
  const elapsed = Math.max(0, now.getTime() - then.getTime());
  if (elapsed < MINUTE) {
    return QUEST_FINDER_COPY.justNow;
  }
  if (elapsed < HOUR) {
    return RELATIVE.format(-Math.floor(elapsed / MINUTE), "minute");
  }
  if (elapsed < DAY) {
    return RELATIVE.format(-Math.floor(elapsed / HOUR), "hour");
  }
  return RELATIVE.format(-Math.floor(elapsed / DAY), "day");
}

function finderQuest(entry: QuestEntry, now: Date): FinderQuest {
  const { quest, lastActive } = entry;
  const idle = Math.floor((now.getTime() - lastActive.getTime()) / DAY);
  const resting = quest.status === "active" && idle >= RESTING_DAYS;
  let activity = QUEST_FINDER_COPY.active(ago(lastActive, now));
  if (resting) {
    activity = QUEST_FINDER_COPY.restingFor(idle);
  }
  return {
    quest,
    seal: getConstruct(quest.constructId).name.charAt(0),
    openTasks: entry.openTasks,
    runningRite: entry.runningRite,
    lastActive: lastActive.toISOString(),
    activity,
    resting,
  };
}

// The quests Quests lists, newest activity first, as they were read.
function finderQuests(
  entries: readonly QuestEntry[],
  now: Date,
): readonly FinderQuest[] {
  return entries.map((entry) => finderQuest(entry, now));
}

export type { FinderQuest };
export { finderQuests, RESTING_DAYS };
