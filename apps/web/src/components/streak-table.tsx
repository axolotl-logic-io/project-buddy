"use client";

import Link from "next/link";
import { type JSX, useCallback, useId, useOptimistic } from "react";
import { periodName } from "@/components/calendar-days.ts";
import { PeriodHeading } from "@/components/date-heading.tsx";
import { Alert, FormStatus } from "@/components/ui/form-message.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import { NoticeSlot } from "@/components/ui/notice-slot.tsx";
import { useBrowserToday } from "@/components/use-browser-today.ts";
import { useQuestAction } from "@/components/use-quest-action.ts";
import type { QuestId } from "@/ids.ts";
import { changeListItemAction } from "@/lists/list-item-actions.ts";
import { markTaskPeriodAction } from "@/streaks/streak-actions.ts";
import type { StreakQuest } from "@/streaks/streak-store.ts";
import {
  CADENCES,
  type Cadence,
  type DayMark,
  type LocalDate,
  type MarkChange,
  markRows,
  periodOf,
  STREAK_TABLE_PERIODS,
  sharedPeriods,
  streakChains,
  withMark,
} from "@/streaks/streaks.ts";
import { CADENCE_COPY } from "@/ui/copy/cadence.ts";
import { HOME_COPY } from "@/ui/copy/home.ts";
import { LISTS_COPY } from "@/ui/copy/lists.ts";

// The marks a square can be checked or unchecked on: the task had been
// added by the end of that period, and the period isn't after the quest's
// current one.
const CHECKABLE: ReadonlySet<DayMark> = new Set(["done", "missed", "pending"]);

// One task's mark in one period in one quest, checked or unchecked.
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

// One task's square in one period, named by its first date. A period
// since the task was added, up to the quest's current one, is a button
// that checks it, or unchecks it, there and then; any other period only
// shows its mark.
function Square({
  questId,
  number,
  text,
  cadence,
  date,
  mark,
  current,
  onMark,
}: {
  readonly questId: QuestId;
  readonly number: number;
  readonly text: string;
  readonly cadence: Cadence;
  readonly date: LocalDate;
  readonly mark: DayMark;
  readonly current: boolean;
  readonly onMark: (change: Mark) => void;
}): JSX.Element {
  const done = mark === "done";
  const toggle = useCallback((): void => {
    onMark({ questId, number, date, done: !done });
  }, [onMark, questId, number, date, done]);
  const period = periodName(cadence, date);
  let square = (
    <span className="streak-square" data-mark={mark}>
      <span className="sr-only">{HOME_COPY.period(period, mark)}</span>
    </span>
  );
  if (CHECKABLE.has(mark)) {
    square = (
      <button
        aria-label={HOME_COPY.square(text, period)}
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

// One quest's recurring tasks of one cadence under a link to the quest,
// each with its squares and its streak.
function QuestRows({
  entry,
  cadence,
  dates,
  onMark,
}: {
  readonly entry: StreakQuest;
  readonly cadence: Cadence;
  readonly dates: readonly LocalDate[];
  readonly onMark: (change: Mark) => void;
}): JSX.Element {
  const { quest, history, tasks } = entry;
  const chains = streakChains(history, tasks);
  const rows = markRows(history, tasks, dates);
  const current = periodOf(history.today, cadence);
  return (
    <tbody>
      <tr className="streak-row streak-quest">
        <th colSpan={dates.length + 2} scope="rowgroup">
          <Link className="text-link" href={`/quests/${quest.id}`}>
            {quest.name}
          </Link>{" "}
          <span className="font-normal text-muted text-sm">
            {HOME_COPY.recurringCount(rows.length, cadence)}
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
                  cadence={cadence}
                  current={date === current}
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
                {HOME_COPY.streakUnit(streak, cadence)}
              </span>
            </td>
          </tr>
        );
      })}
    </tbody>
  );
}

// The quests' recurring tasks of one cadence over its last seven periods,
// grouped by quest, under the cadence's heading.
function CadenceTable({
  cadence,
  quests,
  today,
  onMark,
}: {
  readonly cadence: Cadence;
  readonly quests: readonly StreakQuest[];
  readonly today: string;
  readonly onMark: (change: Mark) => void;
}): JSX.Element {
  const headingId = useId();
  const { heading, starts } = CADENCE_COPY.words(cadence);
  const dates = sharedPeriods(
    quests.map(({ history }) => history.today),
    cadence,
    STREAK_TABLE_PERIODS,
  );
  return (
    <section aria-labelledby={headingId} className="card streak-cadence">
      <header className="streak-cadence-head">
        <h3 className="card-title" id={headingId}>
          {heading}
        </h3>
        <p className="text-muted text-sm">{starts}</p>
      </header>
      <table aria-labelledby={headingId} className="streak-table">
        <thead>
          <tr className="streak-row streak-head">
            <th className="streak-task-head" scope="col">
              <span className="sr-only">{HOME_COPY.taskColumn}</span>
            </th>
            {dates.map((date) => (
              <PeriodHeading
                cadence={cadence}
                key={date}
                start={date}
                today={today}
              />
            ))}
            <th className="streak-count-head" scope="col">
              {HOME_COPY.streakColumn}
            </th>
          </tr>
        </thead>
        {quests.map((entry) => (
          <QuestRows
            cadence={cadence}
            dates={dates}
            entry={entry}
            key={entry.quest.id}
            onMark={onMark}
          />
        ))}
      </table>
    </section>
  );
}

// Each quest that has recurring tasks of a cadence, with only those tasks.
function questsOf(
  quests: readonly StreakQuest[],
  cadence: Cadence,
): readonly StreakQuest[] {
  return quests.flatMap((entry) => {
    const tasks = entry.tasks.filter((task) => task.cadence === cadence);
    if (tasks.length === 0) {
      return [];
    }
    return [{ ...entry, tasks }];
  });
}

// The streaks of every recurring task across the user's Active quests, in
// a grid for each cadence that has any: Every day over the last seven
// days, Every week over the last seven weeks and Every month over the last
// seven months, each grouped by quest. Any square since a task was added
// can be checked off in place: in its quest's current period it is the
// task's own check, and in an earlier one it adds or takes back that
// period's check-off. On a phone each task's name stands above its
// squares.
function StreakTable({
  quests,
}: {
  readonly quests: readonly StreakQuest[];
}): JSX.Element {
  const headingId = useId();
  const [shown, showMark] = useOptimistic(quests, marked);
  const today = useBrowserToday();
  const { start: startCheck, ...check } = useQuestAction(changeListItemAction);
  const { start: startRecord, ...record } =
    useQuestAction(markTaskPeriodAction);
  const onMark = useCallback(
    (change: Mark): void => {
      const entry = quests.find(({ quest }) => quest.id === change.questId);
      const task = entry?.tasks.find(({ number }) => number === change.number);
      if (entry === undefined || task === undefined) {
        return;
      }
      function show(): void {
        showMark(change);
      }
      if (
        periodOf(change.date, task.cadence) ===
        periodOf(entry.history.today, task.cadence)
      ) {
        const checked = {
          kind: "check",
          id: task.id,
          checkedOff: change.done,
        } as const;
        startCheck(
          { questId: change.questId, listId: task.listId, change: checked },
          { status: LISTS_COPY.changed(checked, "task"), show },
        );
        return;
      }
      startRecord(
        {
          questId: change.questId,
          localDate: change.date,
          number: change.number,
          done: change.done,
        },
        { show },
      );
    },
    [quests, showMark, startCheck, startRecord],
  );

  const tables = CADENCES.flatMap((cadence) => {
    const repeating = questsOf(shown, cadence);
    if (repeating.length === 0) {
      return [];
    }
    return [
      <CadenceTable
        cadence={cadence}
        key={cadence}
        onMark={onMark}
        quests={repeating}
        today={today}
      />,
    ];
  });
  let body: JSX.Element;
  if (tables.length === 0) {
    body = <p className="text-muted text-sm">{HOME_COPY.noStreaks}</p>;
  } else {
    body = (
      <>
        {tables}
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
      <NoticeSlot>
        {body}
        {problem !== undefined && <Alert>{problem}</Alert>}
        <FormStatus>{check.status}</FormStatus>
      </NoticeSlot>
    </section>
  );
}

export { StreakTable };
