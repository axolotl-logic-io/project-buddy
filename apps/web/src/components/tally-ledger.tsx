"use client";

import Link from "next/link";
import { type JSX, useCallback, useId, useState } from "react";
import { dayOfMonth, weekdayOf } from "@/components/calendar-days.ts";
import { DateHeading } from "@/components/date-heading.tsx";
import { TallyAmountForm } from "@/components/tally-amount-form.tsx";
import { Alert, FormStatus } from "@/components/ui/form-message.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import { NoticeSlot } from "@/components/ui/notice-slot.tsx";
import { useBrowserToday } from "@/components/use-browser-today.ts";
import { useQuestAction } from "@/components/use-quest-action.ts";
import type { QuestId } from "@/ids.ts";
import type { ListItemId } from "@/lists/list-item.ts";
import { addDays, type LocalDate, sharedDates } from "@/streaks/streaks.ts";
import {
  formatAmount,
  plainAmount,
  TALLY_DAYS,
  type Tally,
  type TallyQuest,
  tallyDays,
} from "@/tallies/tally.ts";
import {
  incrementTallyAction,
  setTallyDayAction,
} from "@/tallies/tally-actions.ts";
import { TALLIES_COPY } from "@/ui/copy/tallies.ts";

// The field open in the ledger: a tally's total on a date, or an amount to
// add to its today when there is no date.
interface Opened {
  readonly id: ListItemId;
  readonly date?: LocalDate | undefined;
}

interface LedgerActions {
  readonly opened: Opened | undefined;
  readonly busy: boolean;
  readonly open: (opened: Opened) => void;
  readonly close: () => void;
  readonly save: (
    questId: QuestId,
    opened: Opened,
    amount: string,
  ) => Promise<boolean>;
}

// One tally's total on one date: a button that opens a field to change it
// on any of its quest's last seven days, and only the total otherwise.
function Cell({
  tally,
  date,
  total,
  questToday,
  actions,
}: {
  readonly tally: Tally;
  readonly date: LocalDate;
  readonly total: string | undefined;
  readonly questToday: LocalDate;
  readonly actions: LedgerActions;
}): JSX.Element {
  const { id } = tally;
  const { open } = actions;
  const change = useCallback((): void => open({ id, date }), [open, id, date]);
  const editable =
    date <= questToday && date > addDays(questToday, -TALLY_DAYS);
  let shown = (
    <span className="tally-cell-value text-muted">{TALLIES_COPY.noDay}</span>
  );
  if (total !== undefined) {
    shown = (
      <span className="tally-cell-value" data-zero={Number(total) === 0}>
        {formatAmount(total)}
      </span>
    );
  }
  if (editable && total !== undefined) {
    shown = (
      <button
        aria-expanded={
          actions.opened?.id === id && actions.opened.date === date
        }
        aria-label={TALLIES_COPY.cell(
          tally.text,
          weekdayOf(date),
          dayOfMonth(date),
          formatAmount(total),
        )}
        className="streak-target"
        disabled={actions.busy}
        onClick={change}
        type="button"
      >
        {shown}
      </button>
    );
  }
  return (
    <td className="streak-cell" data-current={date === questToday}>
      {shown}
    </td>
  );
}

// The field a tally's row opens, on a row of its own under it.
function OpenedField({
  questId,
  tally,
  opened,
  totals,
  actions,
}: {
  readonly questId: QuestId;
  readonly tally: Tally;
  readonly opened: Opened;
  readonly totals: ReadonlyMap<LocalDate, string>;
  readonly actions: LedgerActions;
}): JSX.Element {
  const { save } = actions;
  const submit = useCallback(
    (amount: string): Promise<boolean> => save(questId, opened, amount),
    [save, questId, opened],
  );
  let field = (
    <TallyAmountForm
      label={TALLIES_COPY.incrementBy(tally.text)}
      submit={TALLIES_COPY.add}
      disabled={actions.busy}
      onSave={submit}
      onClose={actions.close}
    />
  );
  if (opened.date !== undefined) {
    field = (
      <TallyAmountForm
        label={TALLIES_COPY.dayTotal(
          tally.text,
          weekdayOf(opened.date),
          dayOfMonth(opened.date),
        )}
        submit={TALLIES_COPY.save}
        initial={plainAmount(totals.get(opened.date) ?? "0")}
        disabled={actions.busy}
        onSave={submit}
        onClose={actions.close}
      />
    );
  }
  return (
    <tr className="streak-row tally-ledger-field">
      <td>{field}</td>
    </tr>
  );
}

// One tally's row: its name and total, its total on each date, and its
// Increment button, then its open field, if any.
function TallyRow({
  questId,
  questToday,
  tally,
  dates,
  actions,
}: {
  readonly questId: QuestId;
  readonly questToday: LocalDate;
  readonly tally: Tally;
  readonly dates: readonly LocalDate[];
  readonly actions: LedgerActions;
}): JSX.Element {
  const { id } = tally;
  const { open, opened } = actions;
  const increment = useCallback((): void => open({ id }), [open, id]);
  const totals = new Map(
    tallyDays(tally, questToday, TALLY_DAYS).map(({ date, total }) => [
      date,
      total,
    ]),
  );
  return (
    <>
      <tr className="streak-row">
        <th className="streak-task" scope="row">
          <span className="block">{tally.text}</span>
          <span className="block text-muted text-xs">
            {TALLIES_COPY.total} {formatAmount(tally.sum)}
          </span>
        </th>
        {dates.map((date) => (
          <Cell
            actions={actions}
            date={date}
            key={date}
            questToday={questToday}
            tally={tally}
            total={totals.get(date)}
          />
        ))}
        <td className="streak-count">
          <button
            aria-expanded={opened?.id === id && opened.date === undefined}
            aria-label={`${TALLIES_COPY.increment} ${tally.text}`}
            className="streak-target"
            disabled={actions.busy}
            onClick={increment}
            title={TALLIES_COPY.increment}
            type="button"
          >
            <span className="tally-increment">
              <Icon name="plus" />
            </span>
          </button>
        </td>
      </tr>
      {opened?.id === id && (
        <OpenedField
          actions={actions}
          opened={opened}
          questId={questId}
          tally={tally}
          totals={totals}
        />
      )}
    </>
  );
}

// One quest's tallies under a link to the quest.
function QuestRows({
  entry,
  dates,
  actions,
}: {
  readonly entry: TallyQuest;
  readonly dates: readonly LocalDate[];
  readonly actions: LedgerActions;
}): JSX.Element {
  const { quest, today, tallies } = entry;
  return (
    <tbody>
      <tr className="streak-row streak-quest">
        <th colSpan={dates.length + 2} scope="rowgroup">
          <Link className="text-link" href={`/quests/${quest.id}`}>
            {quest.name}
          </Link>{" "}
          <span className="font-normal text-muted text-sm">
            {TALLIES_COPY.tallyCount(tallies.length)}
          </span>
        </th>
      </tr>
      {tallies.map((tally) => (
        <TallyRow
          actions={actions}
          dates={dates}
          key={tally.id}
          questId={quest.id}
          questToday={today}
          tally={tally}
        />
      ))}
    </tbody>
  );
}

// Every tally across the user's Active quests over the last seven dates,
// grouped by quest: a day ledger. Choosing a day's total opens a field that
// changes it, and Increment opens one that adds to today's. On a phone each
// tally's name stands above its days.
function TallyLedger({
  quests,
}: {
  readonly quests: readonly TallyQuest[];
}): JSX.Element {
  const headingId = useId();
  const today = useBrowserToday();
  const [opened, setOpened] = useState<Opened | undefined>();
  const { run: runIncrement, ...increment } =
    useQuestAction(incrementTallyAction);
  const { run: runSet, ...set } = useQuestAction(setTallyDayAction);
  const close = useCallback((): void => setOpened(undefined), []);
  const save = useCallback(
    (questId: QuestId, change: Opened, amount: string): Promise<boolean> => {
      if (change.date === undefined) {
        return runIncrement({ questId, id: change.id, amount });
      }
      return runSet({
        questId,
        id: change.id,
        date: change.date,
        total: amount,
      });
    },
    [runIncrement, runSet],
  );
  const actions: LedgerActions = {
    opened,
    busy: increment.busy || set.busy,
    open: setOpened,
    close,
    save,
  };
  const dates = sharedDates(
    quests.map((each) => each.today),
    TALLY_DAYS,
  );
  const problem = increment.problem ?? set.problem;
  const feedback = (
    <>
      {problem !== undefined && <Alert>{problem}</Alert>}
      <FormStatus>{increment.status ?? set.status}</FormStatus>
    </>
  );
  let body: JSX.Element;
  if (quests.length === 0) {
    body = (
      <>
        <p className="text-muted text-sm">{TALLIES_COPY.noTallies}</p>
        <NoticeSlot>{feedback}</NoticeSlot>
      </>
    );
  } else {
    body = (
      <>
        {/* The notice takes the room of the amount form that saving closes. */}
        <NoticeSlot>
          <table
            aria-labelledby={headingId}
            className="streak-table tally-ledger"
          >
            <thead>
              <tr className="streak-row streak-head">
                <th className="streak-task-head" scope="col">
                  <span className="sr-only">{TALLIES_COPY.tallyColumn}</span>
                </th>
                {dates.map((date) => (
                  <DateHeading date={date} key={date} today={today} />
                ))}
                <th className="streak-count-head" scope="col">
                  <span className="sr-only">
                    {TALLIES_COPY.incrementColumn}
                  </span>
                </th>
              </tr>
            </thead>
            {quests.map((entry) => (
              <QuestRows
                actions={actions}
                dates={dates}
                entry={entry}
                key={entry.quest.id}
              />
            ))}
          </table>
          {feedback}
        </NoticeSlot>
        <p className="text-muted text-sm">{TALLIES_COPY.legend}</p>
      </>
    );
  }
  return (
    <section aria-labelledby={headingId} className="streak-panel">
      <h2 className="section-heading" id={headingId}>
        {TALLIES_COPY.heading}
      </h2>
      {body}
    </section>
  );
}

export { TallyLedger };
