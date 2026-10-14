// How the site writes an instant: in English, in a given zone or in the zone
// of whoever runs it.

// How much of an instant a time shows: its day, as in "Oct 12, 2026", or
// its day and minute, as in "Oct 12, 2026, 08:16 PM".
type TimeDetail = "day" | "minute";

// The day and the hour are zero-padded and every month is three letters, so a
// time of each detail is always as long: the server's UTC placeholder and the
// browser's local time have the same length (#58).
const TIME_FORMATS: Readonly<Record<TimeDetail, Intl.DateTimeFormatOptions>> = {
  day: { month: "short", day: "2-digit", year: "numeric" },
  minute: {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  },
};

// Stands for the time in a copy text, such as
// PROJECTS_COPY.created(TIME_SLOT), to mark where CopyWithTime puts the time.
// A private-use character, which no copy text holds.
const TIME_SLOT = "\u{E001}";

// The instant as the site shows it, in timeZone, or in the zone of whoever
// runs this (a browser's own) when timeZone is undefined.
function formatTime(
  dateTime: Date,
  detail: TimeDetail,
  timeZone: string | undefined,
): string {
  const options: Intl.DateTimeFormatOptions = { ...TIME_FORMATS[detail] };
  if (timeZone !== undefined) {
    options.timeZone = timeZone;
  }
  return new Intl.DateTimeFormat("en", options).format(dateTime);
}

export type { TimeDetail };
export { formatTime, TIME_SLOT };
