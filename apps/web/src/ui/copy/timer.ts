// The text of the Timer: its setup page, the running timer, and the page
// for a timer link that names no schedule.
import { TIMER_PRESENCE_EXPIRY_MINUTES } from "@/timer/presence.ts";
import { MINUTES_PER_HOUR, type TimerMinutes } from "@/timer/schedule.ts";
import { pageTitle } from "@/ui/copy/site.ts";

// "1 other person" or "3 other people".
function othersCount(others: number): string {
  if (others === 1) {
    return "1 other person";
  }
  return `${others} other people`;
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
  panelLink: "Timer",
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
  othersHeading: "Following this schedule",
  others: (others: number): string =>
    `${othersCount(others)} had this timer open in the last ${TIMER_PRESENCE_EXPIRY_MINUTES} minutes.`,
  noOthers: `No one else had this timer open in the last ${TIMER_PRESENCE_EXPIRY_MINUTES} minutes.`,
  othersLoading: "Checking who else follows this schedule…",
  othersUnavailable:
    "The count of others is unavailable right now. The timer keeps running.",
  shareHint:
    "Share this page's link. It holds only the schedule, never your quests or account.",
  copyLink: "Copy link",
  copied: "Link copied.",
  copyFailed: "The link couldn't be copied. Copy it from the address bar.",
  change: "Change timer",
  invalidHeading: "This isn't a timer link",
  invalid:
    "This link doesn't name a timer the site can show. Timer links hold a preset work length, a preset break length and a start time that has already passed.",
  invalidAction: "Set up a timer",
} as const;
