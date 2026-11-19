// How the site writes an instant: in English, in a given zone or in the zone
// of whoever runs it.

// How much of an instant a time shows: its day, as in "Oct 12, 2026", or
// its day and minute, as in "Oct 12, 2026, 08:16 PM".
type TimeDetail = "day" | "minute";

// The day and the hour are zero-padded and every month is three letters, so a
// time of each detail is always as long: the server's UTC placeholder and the
// browser's local time have the same length (#58). The day and the clock are
// written apart and joined with a comma, because engines join them
// differently: WebKit writes "Oct 12, 2026 at 08:16 PM".
const DAY_FORMAT: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "2-digit",
  year: "numeric",
};
const CLOCK_FORMAT: Intl.DateTimeFormatOptions = {
  hour: "2-digit",
  minute: "2-digit",
};
const LOCAL_DAY = new Intl.DateTimeFormat("en", DAY_FORMAT);
const LOCAL_CLOCK = new Intl.DateTimeFormat("en", CLOCK_FORMAT);
const UTC_DAY = new Intl.DateTimeFormat("en", {
  ...DAY_FORMAT,
  timeZone: "UTC",
});
const UTC_CLOCK = new Intl.DateTimeFormat("en", {
  ...CLOCK_FORMAT,
  timeZone: "UTC",
});

// Stands for the time in a copy text, such as
// QUESTS_COPY.created(TIME_SLOT), to mark where CopyWithTime puts the time.
// A private-use character, which no copy text holds.
const TIME_SLOT = "\u{E001}";

// The instant in UTC for server rendering or in the browser’s own zone.
function formatTime(
  dateTime: Date,
  detail: TimeDetail,
  timeZone: "UTC" | undefined,
): string {
  let day = LOCAL_DAY;
  let clock = LOCAL_CLOCK;
  if (timeZone === "UTC") {
    day = UTC_DAY;
    clock = UTC_CLOCK;
  }
  const date = day.format(dateTime);
  if (detail === "day") {
    return date;
  }
  return `${date}, ${clock.format(dateTime)}`;
}

export type { TimeDetail };
export { formatTime, TIME_SLOT };
