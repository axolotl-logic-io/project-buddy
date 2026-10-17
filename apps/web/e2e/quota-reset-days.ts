// The reset days a test of the monthly quota may see, whatever the date it
// runs on. The server names the 1st of the month after the one it reads in,
// and a run that crosses a month's end (UTC) between seeding the spend and
// checking the page sees the later month's day: so the tests accept either.
import { formatResetDay, quotaResetsOn } from "@/quota/quota-terms.ts";
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

export { exactlyOneOf, quotaMessage, resetDaysSince };
