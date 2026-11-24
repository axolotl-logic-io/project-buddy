"use client";

import Link from "next/link";
import {
  type JSX,
  startTransition,
  useCallback,
  useId,
  useOptimistic,
  useSyncExternalStore,
} from "react";
import { Alert, FormStatus } from "@/components/ui/form-message.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import { useQuestAction } from "@/components/use-quest-action.ts";
import {
  type DayMark,
  type LocalDate,
  markRows,
  sharedDates,
  streakChains,
  todayHere,
  withMark,
} from "@/dailies/dailies.ts";
import { changeQuestDay } from "@/dailies/quest-day-actions.ts";
import type { StreakQuest } from "@/dailies/quest-day-store.ts";
import type { QuestId } from "@/ids.ts";
import { changeListItemAction } from "@/lists/list-item-actions.ts";
import { DAY_GRID_COPY } from "@/ui/copy/dailies.ts";
import { HOME_COPY } from "@/ui/copy/home.ts";

// How many calendar dates the table shows.
const DAYS_SHOWN = 7;

// The marks a square can be checked or unchecked on: a day was started on
// that date and it tracked the task.
const CHECKABLE: ReadonlySet<DayMark> = new Set(["done", "missed", "pending"]);

// The weekday of a calendar date, the same on the server and in every
// browser, since the date already is the user's own.
const WEEKDAY = new Intl.DateTimeFormat("en", {
  weekday: "short",
  timeZone: "UTC",
});

function weekdayOf(date: LocalDate): string {
  return WEEKDAY.format(new Date(`${date}T00:00:00Z`));
}

function dayOfMonth(date: LocalDate): string {
  return String(Number(date.slice(-2)));
}

function subscribeToNothing(): () => void {
  return (): void => {
    // The date a page opened on is the one it shows until it reloads.
  };
}

function browserToday(): LocalDate {
  return todayHere(new Date());
}

// The server can't know the browser's date, so it marks no column Today.
function noToday(): string {
  return "";
}

// One task's mark on one date, checked or unchecked.
interface Mark {
  readonly questId: QuestId;
  readonly number: number;
  readonly date: LocalDate;
  readonly done: boolean;
}

function marked(
  quests: readonly StreakQuest[],
  change: Mark,
): readonly StreakQuest[] {
  return quests.map((each) => {
    if (each.quest.id !== change.questId) {
      return each;
    }
    return { ...each, ...withMark(each.days, each.tasks, change) };
  });
}

// A date's column heading: its weekday and day of the month, or Today on
// the browser's own date. On a phone the weekday shrinks to its letter.
function DateHeading({
  date,
  today,
}: {
  readonly date: LocalDate;
  readonly today: string;
}): JSX.Element {
  const weekday = weekdayOf(date);
  let name = (
    <>
      <span className="streak-weekday">{weekday}</span>
      <span aria-hidden="true" className="streak-weekday-letter">
        {weekday.slice(0, 1)}
      </span>
    </>
  );
  if (date === today) {
    name = <span>{HOME_COPY.today}</span>;
  }
  return (
    <th className="streak-date" data-today={date === today} scope="col">
      {name}
      <span>{dayOfMonth(date)}</span>
    </th>
  );
}

// One task's square on one date. A date with a day that tracked the task is
// a button that checks it, or unchecks it, there and then; a gap, or a date
// before the task recurred, only shows its mark.
function Square({
  questId,
  number,
  text,
  date,
  mark,
  current,
  onMark,
}: {
  readonly questId: QuestId;
  readonly number: number;
  readonly text: string;
  readonly date: LocalDate;
  readonly mark: DayMark;
  readonly current: boolean;
  readonly onMark: (change: Mark) => void;
}): JSX.Element {
  const done = mark === "done";
  const toggle = useCallback((): void => {
    onMark({ questId, number, date, done: !done });
  }, [onMark, questId, number, date, done]);
  const weekday = weekdayOf(date);
  let square = (
    <span className="streak-square" data-mark={mark}>
      <span className="sr-only">{DAY_GRID_COPY.day(weekday, date, mark)}</span>
    </span>
  );
  if (CHECKABLE.has(mark)) {
    square = (
      <button
        aria-label={HOME_COPY.square(text, weekday, dayOfMonth(date))}
        aria-pressed={done}
        className="streak-target"
        onClick={toggle}
        type="button"
      >
        <span className="streak-square" data-mark={mark}>
          {done && <Icon name="check" />}
        </span>
      </button>
    );
  }
  return (
    <td className="streak-cell" data-current={current}>
      {square}
    </td>
  );
}

// One quest's recurring tasks under a link to the quest, each with its
// squares and its streak.
function QuestRows({
  entry,
  dates,
  onMark,
}: {
  readonly entry: StreakQuest;
  readonly dates: readonly LocalDate[];
  readonly onMark: (change: Mark) => void;
}): JSX.Element {
  const { quest, days, tasks } = entry;
  const chains = streakChains(days, tasks);
  const rows = markRows(days, tasks, dates);
  const newest = dates.at(-1);
  return (
    <tbody>
      <tr className="streak-row streak-quest">
        <th colSpan={dates.length + 2} scope="rowgroup">
          <Link className="text-link" href={`/quests/${quest.id}`}>
            {quest.name}
          </Link>{" "}
          <span className="font-normal text-muted text-sm">
            {HOME_COPY.recurringCount(rows.length)}
          </span>
        </th>
      </tr>
      {rows.map((row) => {
        const streak = chains.get(row.number)?.streak ?? 0;
        return (
          <tr className="streak-row" key={row.number}>
            <th className="streak-task" scope="row">
              {row.text}
            </th>
            {row.marks.map((mark, index) => {
              const date = dates[index] ?? "";
              return (
                <Square
                  current={date === newest}
                  date={date}
                  key={date}
                  mark={mark}
                  number={row.number}
                  onMark={onMark}
                  questId={quest.id}
                  text={row.text}
                />
              );
            })}
            <td className="streak-count">
              <strong>{streak}</strong>
              <span className="streak-unit">
                {HOME_COPY.streakUnit(streak)}
              </span>
            </td>
          </tr>
        );
      })}
    </tbody>
  );
}

// The streaks of every recurring task across the user's Dailies quests over
// the last seven calendar dates, grouped by quest. Any square on a day that
// was started can be checked off in place: on a quest's newest day it is the
// task's own check, and on an earlier one it changes what that day recorded.
// On a phone each task's name stands above its squares.
function StreakTable({
  quests,
}: {
  readonly quests: readonly StreakQuest[];
}): JSX.Element {
  const headingId = useId();
  const [shown, showMark] = useOptimistic(quests, marked);
  const today = useSyncExternalStore(subscribeToNothing, browserToday, noToday);
  const { run: runCheck, ...check } = useQuestAction(changeListItemAction);
  const { run: runRecord, ...record } = useQuestAction(changeQuestDay);
  const dates = sharedDates(
    shown.map(({ days }) => days),
    DAYS_SHOWN,
  );
  const onMark = useCallback(
    (change: Mark): void => {
      const entry = quests.find(({ quest }) => quest.id === change.questId);
      const task = entry?.tasks.items.find(
        ({ number }) => number === change.number,
      );
      if (entry === undefined || task === undefined) {
        return;
      }
      startTransition(async () => {
        showMark(change);
        if (entry.days.at(-1)?.date === change.date) {
          await runCheck({
            questId: change.questId,
            listId: task.listId,
            change: { kind: "check", id: task.id, checkedOff: change.done },
          });
          return;
        }
        await runRecord({
          op: "mark",
          questId: change.questId,
          localDate: change.date,
          number: change.number,
          done: change.done,
        });
      });
    },
    [quests, showMark, runCheck, runRecord],
  );

  let body: JSX.Element;
  if (shown.length === 0) {
    body = <p className="text-muted text-sm">{HOME_COPY.noStreaks}</p>;
  } else if (dates.length === 0) {
    body = <p className="text-muted text-sm">{HOME_COPY.noDays}</p>;
  } else {
    body = (
      <>
        <table aria-labelledby={headingId} className="streak-table">
          <thead>
            <tr className="streak-row streak-head">
              <th className="streak-task-head" scope="col">
                <span className="sr-only">{HOME_COPY.taskColumn}</span>
              </th>
              {dates.map((date) => (
                <DateHeading date={date} key={date} today={today} />
              ))}
              <th className="streak-count-head" scope="col">
                {HOME_COPY.streakColumn}
              </th>
            </tr>
          </thead>
          {shown.map((entry) => (
            <QuestRows
              dates={dates}
              entry={entry}
              key={entry.quest.id}
              onMark={onMark}
            />
          ))}
        </table>
        <p className="text-muted text-sm">{HOME_COPY.legend}</p>
      </>
    );
  }
  const problem = check.problem ?? record.problem;
  return (
    <section aria-labelledby={headingId} className="streak-panel">
      <h2 className="section-heading" id={headingId}>
        {HOME_COPY.streaksHeading}
      </h2>
      {body}
      {problem !== undefined && <Alert>{problem}</Alert>}
      <FormStatus>{check.status}</FormStatus>
    </section>
  );
}

export { StreakTable };
