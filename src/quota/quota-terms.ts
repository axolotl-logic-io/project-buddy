// The terms of the Claude quota, as the server and the browser both know
// them: how much each user may spend in a calendar month, which month a
// moment falls in (in UTC), when the quota resets, how that day is named,
// and how a refusal says so. It reads no storage, so the chat's error
// message can use it.
import { userMessage } from "@/errors/app-error.ts";
import { QUOTA_COPY } from "@/ui/copy/chat.ts";

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

// What a refusal says when the quota is used up, naming the day it resets.
// The chat and the new-chat and new-project forms all show this text.
function quotaUsedUpMessage(resetsOn: Date): string {
  return `${userMessage("quota-used-up")} ${QUOTA_COPY.resetsOn(
    formatResetDay(resetsOn),
  )}`;
}

// The day the quota resets, as every page names it, such as "November 1,
// 2026": the refusal in the chat and the forms, and the account page. The
// day is UTC's, wherever the reader is.
function formatResetDay(resetsOn: Date): string {
  return RESET_DAY.format(resetsOn);
}

export {
  formatResetDay,
  MONTHLY_QUOTA_MICRO_USD,
  quotaResetsOn,
  quotaUsedUpMessage,
  spendMonthOf,
};
