// The reset days a test of the monthly quota may see, whatever the date it
// runs on. The server names the 1st of the month after the one it reads in,
// and a run that crosses a month's end (UTC) between seeding the spend and
// checking the page sees the later month's day: so the tests accept either.
import { formatResetDay, quotaResetsOn } from "@/quota/quota-terms.ts";

const REGEXP_SYNTAX = /[\\^$.*+?()[\]{}|/]/gu;

// The reset days the server can name between since, recorded before the
// test seeded its spend, and now: one day, or two across a month's end.
function resetDaysSince(since: Date): readonly string[] {
  const days = [since, new Date()].map((moment) =>
    formatResetDay(quotaResetsOn(moment)),
  );
  return [...new Set(days)];
}

// A pattern for the whole of exactly one of texts, such as the account
// page's reset line with any of resetDaysSince's days.
function exactlyOneOf(texts: readonly string[]): RegExp {
  const escaped = texts.map((text) => text.replaceAll(REGEXP_SYNTAX, "\\$&"));
  return new RegExp(`^(?:${escaped.join("|")})$`, "u");
}

export { exactlyOneOf, resetDaysSince };
