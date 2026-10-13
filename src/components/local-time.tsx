"use client";

import { type JSX, useSyncExternalStore } from "react";
import { formatTime, type TimeDetail } from "@/components/time-format.ts";

// The zone of the time the server renders, the same on every server.
const SERVER_TIME_ZONE = "UTC";

// Set in the theme's monospace font with tabular figures, so two times of the
// same length are the same width.
const TIME_CLASS = "font-mono tabular-nums";

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
// as wide as the local time: both are fixed-length and set in the theme's
// monospace font, so the line does not shift on hydration.
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
