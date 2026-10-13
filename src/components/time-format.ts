// How the site writes an instant: in English, in a given zone or in the zone
// of whoever runs it.

// How much of an instant a time shows: its day, as in "Oct 12, 2026", or
// its day and minute, as in "Oct 12, 2026, 8:16 PM".
type TimeDetail = "day" | "minute";

const TIME_FORMATS: Readonly<Record<TimeDetail, Intl.DateTimeFormatOptions>> = {
  day: { dateStyle: "medium" },
  minute: { dateStyle: "medium", timeStyle: "short" },
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
