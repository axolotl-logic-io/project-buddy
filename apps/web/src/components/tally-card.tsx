"use client";

import { type JSX, useCallback, useState } from "react";
import { dayOfMonth, weekdayOf } from "@/components/calendar-days.ts";
import { TallyAmountForm } from "@/components/tally-amount-form.tsx";
import { Button } from "@/components/ui/button.tsx";
import type { LocalDate } from "@/streaks/streaks.ts";
import {
  formatAmount,
  plainAmount,
  TALLY_DAYS,
  type Tally,
  type TallyChanges,
  tallyDays,
} from "@/tallies/tally.ts";
import { TALLIES_COPY } from "@/ui/copy/tallies.ts";

// How many heights a day's bar can have, past none.
const BAR_LEVELS = 8;

// A day's bar height, from 0 to BAR_LEVELS, by its total's size against
// the largest of the days shown.
function barLevel(total: string, largest: number): number {
  const size = Math.abs(Number(total));
  if (size === 0 || largest === 0) {
    return 0;
  }
  return Math.max(1, Math.round((size / largest) * BAR_LEVELS));
}

function signOf(total: string): "negative" | "positive" {
  if (Number(total) < 0) {
    return "negative";
  }
  return "positive";
}

// A tally's counter card: today's total, a bar for each of its last seven
// days, its total over every day, Increment, which adds to today's total,
// and Edit today, which sets it.
function TallyCard({
  tally,
  today,
  changes,
  busy,
}: {
  readonly tally: Tally;
  readonly today: LocalDate;
  readonly changes: TallyChanges;
  readonly busy: boolean;
}): JSX.Element {
  // The form open, with the amount a refused save left in it.
  const [open, setOpen] = useState<
    | { readonly form: "increment" | "edit"; readonly amount?: string }
    | undefined
  >();
  const increment = useCallback((): void => setOpen({ form: "increment" }), []);
  const edit = useCallback((): void => setOpen({ form: "edit" }), []);
  const close = useCallback((): void => setOpen(undefined), []);
  const add = useCallback(
    (amount: string): void =>
      changes.increment(amount, () => setOpen({ form: "increment", amount })),
    [changes],
  );
  const setToday = useCallback(
    (total: string): void =>
      changes.setToday(total, () => setOpen({ form: "edit", amount: total })),
    [changes],
  );
  const days = tallyDays(tally, today, TALLY_DAYS);
  const todayTotal = days.at(-1)?.total ?? "0";
  const largest = Math.max(...days.map(({ total }) => Math.abs(Number(total))));
  let controls = (
    <span className="tally-buttons">
      <Button variant="secondary" onClick={increment} disabled={busy}>
        {TALLIES_COPY.increment}
      </Button>
      <Button variant="quiet" onClick={edit} disabled={busy}>
        {TALLIES_COPY.editToday}
      </Button>
    </span>
  );
  if (open?.form === "increment") {
    controls = (
      <TallyAmountForm
        label={TALLIES_COPY.incrementBy(tally.text)}
        submit={TALLIES_COPY.add}
        initial={open.amount ?? ""}
        disabled={busy}
        onSave={add}
        onClose={close}
      />
    );
  }
  if (open?.form === "edit") {
    controls = (
      <TallyAmountForm
        label={TALLIES_COPY.todayTotal(tally.text)}
        submit={TALLIES_COPY.save}
        initial={open.amount ?? plainAmount(todayTotal)}
        disabled={busy}
        onSave={setToday}
        onClose={close}
      />
    );
  }
  return (
    <div className="tally-card">
      <span className="tally-today">
        <span className="tally-today-value">{formatAmount(todayTotal)}</span>
        <span className="tally-caption">{TALLIES_COPY.today}</span>
      </span>
      <ol className="tally-bars" aria-label={TALLIES_COPY.recentDays}>
        {days.map(({ date, total }) => (
          <li key={date} className="tally-day" data-today={date === today}>
            <span
              className="tally-bar"
              data-level={barLevel(total, largest)}
              data-sign={signOf(total)}
              aria-hidden="true"
            />
            <span className="sr-only">
              {TALLIES_COPY.day(
                weekdayOf(date),
                dayOfMonth(date),
                formatAmount(total),
              )}
            </span>
          </li>
        ))}
      </ol>
      <span className="tally-total">
        <span className="tally-caption">{TALLIES_COPY.total}</span>
        <strong>{formatAmount(tally.sum)}</strong>
      </span>
      {controls}
    </div>
  );
}

export { TallyCard };
