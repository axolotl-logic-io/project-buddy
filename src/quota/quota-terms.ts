// The terms of the Claude quota, as the server and the browser both know
// them: how much each user may spend in a calendar month, which month a
// moment falls in (in UTC), when the quota resets, and how a refusal says
// so. It reads no storage, so the chat's error message can use it.
import { userMessage } from "@/errors/app-error.ts";
import { QUOTA_COPY } from "@/ui/copy/chat.ts";

// $5 a month, every account's quota, in micro-USD as spend is counted.
const MONTHLY_QUOTA_MICRO_USD = 5_000_000;

const DATE_LENGTH: number = "YYYY-MM-DD".length;

// The reset day as the refusal names it, such as "November 1, 2026". The
// day is UTC's, wherever the reader is.
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

// What a refusal says when the quota is used up, naming the day it resets.
// The chat and the new-chat and new-project forms all show this text.
function quotaUsedUpMessage(resetsOn: Date): string {
  return `${userMessage("quota-used-up")} ${QUOTA_COPY.resetsOn(
    RESET_DAY.format(resetsOn),
  )}`;
}

export {
  MONTHLY_QUOTA_MICRO_USD,
  quotaResetsOn,
  quotaUsedUpMessage,
  spendMonthOf,
};
