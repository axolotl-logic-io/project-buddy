"use client";

import { type JSX, useSyncExternalStore } from "react";
import { formatTime, type TimeDetail } from "@/components/time-format.ts";

// The zone of the time the server renders, the same on every server.
const SERVER_TIME_ZONE = "UTC";

// Set in the theme's body font, as the text around it, with tabular figures,
// so every digit is the same width, and kept on one line, so a narrow column
// never breaks a time apart ("11:38 / AM").
const TIME_CLASS = "font-body tabular-nums whitespace-nowrap";

function subscribeToNothing(): () => void {
  return (): void => {
    // Whether the page is hydrated never changes once it is.
  };
}

function hydrated(): boolean {
  return true;
}

function notHydrated(): boolean {
  return false;
}

// An instant in the zone of the browser that shows it. The server renders it
// in UTC but unseen, so it keeps its room in the line without showing a
// wrong time; once hydrated, it shows the browser's time. The placeholder is
// about as wide as the local time: both have the same format and tabular
// figures, so the line shifts on hydration by no more than the difference
// between two words, such as "AM" and "PM", a few pixels at most.
function LocalTime({
  dateTime,
  detail,
}: {
  readonly dateTime: Date;
  readonly detail: TimeDetail;
}): JSX.Element {
  const isHydrated = useSyncExternalStore(
    subscribeToNothing,
    hydrated,
    notHydrated,
  );
  if (!isHydrated) {
    return (
      <time
        className={`invisible ${TIME_CLASS}`}
        dateTime={dateTime.toISOString()}
      >
        {formatTime(dateTime, detail, SERVER_TIME_ZONE)}
      </time>
    );
  }
  return (
    <time className={TIME_CLASS} dateTime={dateTime.toISOString()}>
      {formatTime(dateTime, detail, undefined)}
    </time>
  );
}

export { LocalTime };
