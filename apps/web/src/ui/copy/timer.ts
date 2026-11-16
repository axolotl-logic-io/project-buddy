// The text of the Timer: its setup page, the running timer, and the page
// for a timer link that names no schedule.
import { MINUTES_PER_HOUR, type TimerMinutes } from "@/timer/schedule.ts";
import { pageTitle } from "@/ui/copy/site.ts";

// "1 other" or "3 others".
function othersHere(others: number): string {
  if (others === 1) {
    return "1 other";
  }
  return `${others} others`;
}

// A duration in minutes as an option names it, with its hours when it is
// whole hours.
function minutesLabel(minutes: TimerMinutes): string {
  const hours = minutes / MINUTES_PER_HOUR;
  if (hours === 1) {
    return `${minutes} minutes (1 hour)`;
  }
  if (Number.isInteger(hours)) {
    return `${minutes} minutes (${hours} hours)`;
  }
  return `${minutes} minutes`;
}

const PHASES = { work: "Work", break: "Break" } as const;

export const TIMER_COPY = {
  heading: "Timer",
  title: pageTitle("Timer"),
  menuLink: "Timer",
  runningTitle: pageTitle("Running timer"),
  // A timer link's place in the trail when it names no schedule.
  unknownTrail: "Unknown timer",
  intro:
    "Work and take breaks on a repeating schedule. Share the timer's link and others follow the same schedule.",
  workLabel: "Work for",
  breakLabel: "Break for",
  minutes: minutesLabel,
  start: "Start",
  startHint: "Starts a new schedule now, beginning with work.",
  joinGlobal: "Join global timer",
  joinGlobalHint:
    "Joins the schedule everyone with these durations shares. It is already running, so you may join partway through work or a break.",
  scheduleName: (workMinutes: number, breakMinutes: number): string =>
    `Work ${workMinutes} · Break ${breakMinutes}`,
  phase: (kind: keyof typeof PHASES): string => PHASES[kind],
  remainingLabel: "Time left",
  // What a screen reader hears once, as each phase begins.
  phaseStarted: (kind: keyof typeof PHASES): string => `${PHASES[kind]} time.`,
  progressLabel: (kind: keyof typeof PHASES): string =>
    `${PHASES[kind]} progress`,
  // The count of others in the trail band.
  others: (others: number): string => `${othersHere(others)} here`,
  othersUnavailable: "Unknown others",
  copyLink: "Copy link",
  // What Copy link reads for a moment after a copy.
  copiedLabel: "Copied",
  copyFailedLabel: "Copy failed",
  // What a screen reader hears after a copy.
  copied: "Link copied.",
  copyFailed: "The link couldn't be copied. Copy it from the address bar.",
  invalidHeading: "This isn't a timer link",
  invalid:
    "This link doesn't name a timer the site can show. Timer links hold a preset work length, a preset break length and a start time that has already passed.",
  invalidAction: "Set up a timer",
} as const;
