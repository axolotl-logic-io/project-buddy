// The terms of the model quota, as the server and the browser both know
// them: how much each user may spend in a calendar month, which month a
// moment falls in (in UTC), when the quota resets, and how that day is
// named. It reads no storage and imports nothing, so the chat's error message
// and the UI copy that words a refusal (src/ui/copy/chat.ts) can use it.

// $5 a month, every account's quota, in micro-USD as spend is counted.
const MONTHLY_QUOTA_MICRO_USD = 5_000_000;

const DATE_LENGTH: number = "YYYY-MM-DD".length;

const RESET_DAY = new Intl.DateTimeFormat("en", {
  dateStyle: "long",
  timeZone: "UTC",
});

// The month that now falls in, in UTC, as its first day: the date the spend
// of that month is stored under, such as "2026-10-01".
function spendMonthOf(now: Date): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString()
    .slice(0, DATE_LENGTH);
}

// When the quota of now's month resets: midnight UTC at the start of the
// next month's first day.
function quotaResetsOn(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

// The day the quota resets, as every page names it, such as "November 1,
// 2026": the refusal in the chat and the forms, and the account page. The
// day is UTC's, wherever the reader is.
function formatResetDay(resetsOn: Date): string {
  return RESET_DAY.format(resetsOn);
}

export { formatResetDay, MONTHLY_QUOTA_MICRO_USD, quotaResetsOn, spendMonthOf };
