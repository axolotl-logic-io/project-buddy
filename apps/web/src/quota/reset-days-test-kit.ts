// Spend and reset days for tests of the monthly quota, whatever the date
// they run on. The server names the 1st of the month after the one it reads
// in, and a run that crosses a month's end (UTC) between seeding the spend
// and checking what the app says sees the later month's day: so the tests
// seed both months and accept either day (wiki decision `claude-spend-quota`,
// "Month ends in quota tests").
import type { User } from "@/accounts/users-store.ts";
import { formatResetDay, quotaResetsOn } from "@/quota/quota-terms.ts";
import { recordSpend } from "@/quota/spend-store.ts";
import { quotaUsedUpMessage } from "@/ui/copy/chat.ts";

const REGEXP_SYNTAX = /[\\^$.*+?()[\]{}|/]/gu;

// The reset instants the server can name between since, recorded before the
// test seeded its spend, and now: one instant, or two across a month's end.
function resetInstantsSince(since: Date): readonly Date[] {
  const instants = [since, new Date()].map(quotaResetsOn);
  return instants.filter(
    (instant, index) =>
      instants.findIndex((other) => other.getTime() === instant.getTime()) ===
      index,
  );
}

// The reset days, as the pages write them, of resetInstantsSince's instants.
function resetDaysSince(since: Date): readonly string[] {
  return resetInstantsSince(since).map(formatResetDay);
}

// A pattern for the whole of exactly one of texts, such as the account
// page's reset line with any of resetDaysSince's days.
function exactlyOneOf(texts: readonly string[]): RegExp {
  const escaped = texts.map((text) => text.replaceAll(REGEXP_SYNTAX, "\\$&"));
  return new RegExp(`^(?:${escaped.join("|")})$`, "u");
}

// The quota message the app builds with quotaUsedUpMessage, naming the 1st
// of next month in UTC as its reset day: of the month since, when the test
// seeded its spend, or of a month that has begun since then.
function quotaMessage(since: Date): RegExp {
  return exactlyOneOf(resetInstantsSince(since).map(quotaUsedUpMessage));
}

// Adds microUsd to user's spend this month (UTC), as their model calls
// would. It adds the same to next month's: a run that crosses a month's end
// before any model call is charged then still finds it, and until the month
// turns nothing reads next month's. A month's end after a charge leaves that
// charge behind in the old month; spendInMonthAfter covers it.
async function spend(user: User, microUsd: number): Promise<void> {
  const now = new Date();
  await recordSpend(user.id, microUsd, now);
  await recordSpend(user.id, microUsd, quotaResetsOn(now));
}

// Adds microUsd to user's spend in the month (UTC) after moment's, as a
// charge there would.
async function spendInMonthAfter(
  user: User,
  microUsd: number,
  moment: Date,
): Promise<void> {
  await recordSpend(user.id, microUsd, quotaResetsOn(moment));
}

export { exactlyOneOf, quotaMessage, resetDaysSince, spend, spendInMonthAfter };
