// A quest's day starts at midnight in its owner's time zone (users.
// time_zone), for every member alike. Nothing runs at midnight: a recurring
// task stays checked off only on the date it was checked off
// (list_items.checked_off_on), so each read after midnight finds it
// unchecked. Its check-off events stay, and give its streak.
//
// Reading the owner's time zone is a read across users that owner-scope
// allows: it names no one and reaches nothing else of the owner's.
import { getTableColumns, type SQL, sql } from "drizzle-orm";
import { listItems } from "@/db/tables/lists.ts";

// Today's date, a Postgres date, in the time zone of the owner of the quest
// of the list_items row the query reads or writes. The outer column is
// written in full so it stays a correlated subquery.
const QUEST_TODAY: SQL<string> = sql<string>`(
  select (now() at time zone owner.time_zone)::date
  from quests as owned
  join users as owner on owner.id = owned.user_id
  where owned.id = "list_items"."quest_id"
)`;

// Whether a list item counts as checked off now: a one-off task once
// checked off, and a recurring task only on the day it was.
const CHECKED_OFF_NOW: SQL<boolean> = sql<boolean>`(${listItems.checkedOff} and (not ${listItems.recurring} or ${listItems.checkedOffOn} = ${QUEST_TODAY}))`;

// Every list_items column, with checkedOff as it counts now. Every read of
// list items selects these, so a recurring task checked off on an earlier
// day reads, and is changed, as unchecked.
const LIST_ITEM_COLUMNS: Omit<
  ReturnType<typeof getTableColumns<typeof listItems>>,
  "checkedOff"
> & {
  readonly checkedOff: SQL<boolean>;
} = {
  ...getTableColumns(listItems),
  checkedOff: CHECKED_OFF_NOW.mapWith(Boolean),
};

// The date a check-off change saves: today for a check-off, and none for
// an uncheck.
function checkedOffOn({
  checkedOff,
}: {
  readonly checkedOff: boolean;
}): SQL<string> | null {
  if (checkedOff) {
    return QUEST_TODAY;
  }
  return null;
}

export { CHECKED_OFF_NOW, checkedOffOn, LIST_ITEM_COLUMNS, QUEST_TODAY };
