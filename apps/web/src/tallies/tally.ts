// Tallies: the list items of a tally list, each a running count of
// something, such as words written or mantras recited. A tally has a total
// on each date in its quest owner's time zone (src/lists/quest-today.ts),
// and its total is the sum of every date's. Amounts may be fractional or
// negative. It imports nothing from the server, because the browser checks
// and shows amounts too.
import { z } from "zod";
import type { QuestId } from "@/ids.ts";
import type { ListId } from "@/lists/list.ts";
import type { ListItemId } from "@/lists/list-item.ts";
import { datesUpTo, type LocalDate } from "@/streaks/streaks.ts";

// How many dates a tally shows, and so how far back Home can change one.
const TALLY_DAYS = 7;

// A decimal as a person types it: at most 12 digits before the point and 6
// after, with an optional sign, as a day's total is stored.
const DECIMAL = /^[-+]?(?:\d{1,12}(?:\.\d{0,6})?|\.\d{1,6})$/u;
const LEADING_PLUS = /^\+/u;
// A decimal's zeros after its point, and the point when nothing else
// follows it.
const TRAILING_ZEROS = /\.?0+$/u;

// An amount, kept as its decimal text so no digit is lost on the way to the
// database.
const TALLY_AMOUNT = z
  .string()
  .trim()
  .regex(DECIMAL)
  .transform((value) => value.replace(LEADING_PLUS, ""));

// The places a stored amount keeps after its point.
const AMOUNT_PLACES = 6;
const SIGN = /^[-+]/u;

// A tally's total on a date.
interface TallyDay {
  readonly date: LocalDate;
  readonly total: string;
}

// A tally as it is shown: its list item and list, its totals on the dates
// it shows, and the sum of all its totals.
interface Tally {
  readonly id: ListItemId;
  readonly listId: ListId;
  readonly text: string;
  readonly days: readonly TallyDay[];
  readonly sum: string;
}

// A quest's tallies, with the quest's today, which a tally's increments add
// to.
interface TallyQuest {
  readonly quest: { readonly id: QuestId; readonly name: string };
  readonly today: LocalDate;
  readonly tallies: readonly Tally[];
}

// Changes to a tally, as its list runs them. Each shows at once, and
// refused runs when the server refuses it.
interface TallyChanges {
  readonly increment: (amount: string, refused: () => void) => void;
  readonly setToday: (total: string, refused: () => void) => void;
}

// A change to a tally: an amount added to its total on its quest's today,
// or a new total on one of its dates.
type TallyChange =
  | { readonly kind: "increment"; readonly amount: string }
  | { readonly kind: "set"; readonly date: LocalDate; readonly total: string };

// An amount's decimal text, or undefined when it isn't one a tally can hold.
function parseAmount(value: string): string | undefined {
  return TALLY_AMOUNT.safeParse(value).data;
}

const AMOUNT_FORMAT = new Intl.NumberFormat("en", {
  maximumFractionDigits: 6,
});

function isNumeric(value: string): value is `${number}` {
  return value.trim() !== "" && Number.isFinite(Number(value));
}

// An amount as shown: decimal places only when they aren't 0. The text
// goes in whole, so no digit is lost.
function formatAmount(amount: string): string {
  if (!isNumeric(amount)) {
    return amount;
  }
  return AMOUNT_FORMAT.format(amount);
}

// An amount as a number field holds it: no grouping, and decimal places
// only when they aren't 0.
function plainAmount(amount: string): string {
  if (!amount.includes(".")) {
    return amount;
  }
  return amount.replace(TRAILING_ZEROS, "");
}

// An amount in millionths, so sums keep every digit.
function millionths(amount: string): bigint {
  const [whole = "", fraction = ""] = amount.replace(SIGN, "").split(".");
  const size = BigInt(
    `${whole || "0"}${fraction.padEnd(AMOUNT_PLACES, "0").slice(0, AMOUNT_PLACES)}`,
  );
  if (amount.startsWith("-")) {
    return -size;
  }
  return size;
}

function fromMillionths(value: bigint): string {
  let sign = "";
  let size = value;
  if (value < 0n) {
    sign = "-";
    size = -value;
  }
  const digits = size.toString().padStart(AMOUNT_PLACES + 1, "0");
  const whole = digits.slice(0, -AMOUNT_PLACES);
  const fraction = digits.slice(-AMOUNT_PLACES).replace(TRAILING_ZEROS, "");
  if (fraction === "") {
    return `${sign}${whole}`;
  }
  return `${sign}${whole}.${fraction}`;
}

// A tally as a change leaves it, worked out in the browser before the
// server saves it: the date's new total, and the sum moved by as much.
function changedTally(
  tally: Tally,
  today: LocalDate,
  change: TallyChange,
): Tally {
  let date = today;
  if (change.kind === "set") {
    ({ date } = change);
  }
  const before = millionths(
    tally.days.find((each) => each.date === date)?.total ?? "0",
  );
  let after: bigint;
  if (change.kind === "set") {
    after = millionths(change.total);
  } else {
    after = before + millionths(change.amount);
  }
  const total = fromMillionths(after);
  const moved: bigint = after - before;
  return {
    ...tally,
    days: [...tally.days.filter((each) => each.date !== date), { date, total }],
    sum: fromMillionths(millionths(tally.sum) + moved),
  };
}

// A quest's tallies with one tally changed.
function withTallyChange(
  entry: TallyQuest,
  id: ListItemId,
  change: TallyChange,
): TallyQuest {
  return {
    ...entry,
    tallies: entry.tallies.map((tally) => {
      if (tally.id !== id) {
        return tally;
      }
      return changedTally(tally, entry.today, change);
    }),
  };
}

// The tally's total on each of the count dates up to today, oldest first,
// 0 where it has none.
function tallyDays(
  tally: Pick<Tally, "days">,
  today: LocalDate,
  count: number,
): readonly TallyDay[] {
  return datesUpTo(today, count).map((date) => ({
    date,
    total: tally.days.find((each) => each.date === date)?.total ?? "0",
  }));
}

export type { Tally, TallyChange, TallyChanges, TallyDay, TallyQuest };
export {
  formatAmount,
  parseAmount,
  plainAmount,
  TALLY_AMOUNT,
  TALLY_DAYS,
  tallyDays,
  withTallyChange,
};
