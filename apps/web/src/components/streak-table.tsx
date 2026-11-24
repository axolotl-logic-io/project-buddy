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
import type { QuestId } from "@/ids.ts";
import { changeListItemAction } from "@/lists/list-item-actions.ts";
import { markTaskDayAction } from "@/streaks/streak-actions.ts";
import type { StreakQuest } from "@/streaks/streak-store.ts";
import {
  type DayMark,
  type LocalDate,
  localDate,
  type MarkChange,
  markRows,
  STREAK_TABLE_DAYS,
  sharedDates,
  streakChains,
  withMark,
} from "@/streaks/streaks.ts";
import { DAY_GRID_COPY } from "@/ui/copy/day-grid.ts";
import { HOME_COPY } from "@/ui/copy/home.ts";

// The marks a square can be checked or unchecked on: the task had been
// added by that date, and the date isn't after the quest's today.
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
  return localDate(
    new Date(),
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
}

// The server can't know the browser's date, so it marks no column Today.
function noToday(): string {
  return "";
}

// One task's mark on one date in one quest, checked or unchecked.
interface Mark extends MarkChange {
  readonly questId: QuestId;
}

function marked(
  quests: readonly StreakQuest[],
  change: Mark,
): readonly StreakQuest[] {
  return quests.map((each) => {
    if (each.quest.id !== change.questId) {
      return each;
    }
    return { ...each, ...withMark(each.history, each.tasks, change) };
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

// One task's square on one date. A date since the task was added, up to
// the quest's today, is a button that checks it, or unchecks it, there and
// then; any other date only shows its mark.
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
  const { quest, history, tasks } = entry;
  const chains = streakChains(history, tasks);
  const rows = markRows(history, tasks, dates);
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
                  current={date === history.today}
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

// The streaks of every recurring task across the user's Active quests over
// the last seven dates, grouped by quest. Any square since a task was added
// can be checked off in place: on its quest's today it is the task's own
// check, and on an earlier date it adds or takes back that day's check-off.
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
  const { run: runRecord, ...record } = useQuestAction(markTaskDayAction);
  const dates = sharedDates(
    shown.map(({ history }) => history.today),
    STREAK_TABLE_DAYS,
  );
  const onMark = useCallback(
    (change: Mark): void => {
      const entry = quests.find(({ quest }) => quest.id === change.questId);
      const task = entry?.tasks.find(({ number }) => number === change.number);
      if (entry === undefined || task === undefined) {
        return;
      }
      startTransition(async () => {
        showMark(change);
        if (entry.history.today === change.date) {
          await runCheck({
            questId: change.questId,
            listId: task.listId,
            change: { kind: "check", id: task.id, checkedOff: change.done },
          });
          return;
        }
        await runRecord({
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
