// What the timer's page and its server share about presence: how often an
// open timer reports, how long a report counts, and what the page shows of
// the others following its schedule.

const MS_PER_MINUTE = 60_000;

// How often an open timer reports, and how long a report counts: two
// reports' time, so one late report doesn't drop an open timer from others'
// counts.
const TIMER_PRESENCE_REPORT_MS: number = MS_PER_MINUTE;
const TIMER_PRESENCE_EXPIRY_MINUTES = 2;
const TIMER_PRESENCE_EXPIRY_MS: number =
  TIMER_PRESENCE_EXPIRY_MINUTES * MS_PER_MINUTE;

// How many other accounts reported following a schedule recently, or that
// the count is unavailable.
type TimerPresence =
  | { readonly kind: "count"; readonly others: number }
  | { readonly kind: "unavailable" };

export {
  TIMER_PRESENCE_EXPIRY_MINUTES,
  TIMER_PRESENCE_EXPIRY_MS,
  TIMER_PRESENCE_REPORT_MS,
  type TimerPresence,
};
