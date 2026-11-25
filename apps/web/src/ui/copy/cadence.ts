import type { Cadence } from "@/streaks/streaks.ts";

interface CadenceWords {
  // The cadence on its own, as in "Repeats weekly" or "2 weekly".
  readonly adverb: string;
  // The period, as in "3-week streak".
  readonly one: string;
  readonly many: string;
  // Home's grid of the recurring tasks with this cadence, and when their
  // periods start.
  readonly heading: string;
  readonly starts: string;
}

const WORDS: Readonly<Record<Cadence, CadenceWords>> = {
  daily: {
    adverb: "daily",
    one: "day",
    many: "days",
    heading: "Every day",
    starts: "Starts again at midnight",
  },
  weekly: {
    adverb: "weekly",
    one: "week",
    many: "weeks",
    heading: "Every week",
    starts: "Starts again on Monday at midnight",
  },
  monthly: {
    adverb: "monthly",
    one: "month",
    many: "months",
    heading: "Every month",
    starts: "Starts again on the 1st at midnight",
  },
};

// How often a recurring task repeats, and the day, week or month it
// repeats in, wherever a task's cadence or its streak is shown.
const CADENCE_COPY = {
  words: (cadence: Cadence): CadenceWords => WORDS[cadence],
  // A task menu's choice of cadence, and the recurring badge's name.
  repeat: (cadence: Cadence): string => `Repeat ${WORDS[cadence].adverb}`,
  repeats: (cadence: Cadence): string => `Repeats ${WORDS[cadence].adverb}`,
  // A count of periods: "1 week", "3 weeks".
  periods: (cadence: Cadence, count: number): string => {
    const { one, many } = WORDS[cadence];
    if (count === 1) {
      return `${count} ${one}`;
    }
    return `${count} ${many}`;
  },
  // A streak's length as a modifier: "3-week streak".
  streak: (cadence: Cadence, count: number): string =>
    `${count}-${WORDS[cadence].one} streak`,
  // A week by its Monday, for screen readers and labels.
  weekOf: (monday: string): string => `week of ${monday}`,
} as const;

export { CADENCE_COPY };
