"use client";

import { type JSX, useCallback, useEffect, useState } from "react";
import { useTimerPresence } from "@/components/timer/use-timer-presence.ts";
import { Button } from "@/components/ui/button.tsx";
import type { TimerPresence } from "@/timer/presence.ts";
import type { TimerSchedule } from "@/timer/schedule.ts";
import { TIMER_COPY } from "@/ui/copy/timer.ts";

// How long Copy link shows what became of the copy before it reads Copy
// link again.
const COPY_RESULT_MS = 2000;

type CopyResult = "idle" | "copied" | "failed";

const COPY_LABELS: Readonly<Record<CopyResult, string>> = {
  idle: TIMER_COPY.copyLink,
  copied: TIMER_COPY.copiedLabel,
  failed: TIMER_COPY.copyFailedLabel,
};

const COPY_STATUS: Readonly<Record<CopyResult, string>> = {
  idle: "",
  copied: TIMER_COPY.copied,
  failed: TIMER_COPY.copyFailed,
};

// What the trail says of the others following the schedule: nothing until
// the first report answers.
function othersText(presence: TimerPresence | undefined): string {
  if (presence === undefined) {
    return "";
  }
  if (presence.kind === "unavailable") {
    return TIMER_COPY.othersUnavailable;
  }
  return TIMER_COPY.others(presence.others);
}

// Copies the page's link. The button says for a moment whether it could,
// and a hidden status line says it to a screen reader.
function CopyLink(): JSX.Element {
  const [result, setResult] = useState<CopyResult>("idle");
  useEffect(() => {
    if (result === "idle") {
      return;
    }
    const timeout = setTimeout(() => setResult("idle"), COPY_RESULT_MS);
    return (): void => clearTimeout(timeout);
  }, [result]);
  const copy = useCallback((): void => {
    navigator.clipboard.writeText(globalThis.location.href).then(
      () => setResult("copied"),
      () => setResult("failed"),
    );
  }, []);
  return (
    <>
      <Button onClick={copy} variant="secondary">
        {COPY_LABELS[result]}
      </Button>
      <p className="sr-only" role="status">
        {COPY_STATUS[result]}
      </p>
    </>
  );
}

// How many others follow schedule, which reports the schedule as the
// page's presence.
function OthersFollowing({
  schedule,
}: {
  readonly schedule: TimerSchedule;
}): JSX.Element {
  const presence = useTimerPresence(schedule);
  return <p className="timer-others">{othersText(presence)}</p>;
}

// A running timer's tools at the right of the trail band: how many others
// follow its schedule and a button that copies its link. Presence belongs
// to accounts, so a signed-out visitor neither reports nor sees the count,
// only Copy link.
function TimerTrailTools({
  schedule,
  signedIn,
}: {
  readonly schedule: TimerSchedule;
  readonly signedIn: boolean;
}): JSX.Element {
  let others: JSX.Element | undefined;
  if (signedIn) {
    others = <OthersFollowing schedule={schedule} />;
  }
  return (
    <div className="timer-trail-tools">
      {others}
      <CopyLink />
    </div>
  );
}

export { TimerTrailTools };
