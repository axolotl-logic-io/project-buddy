// How often a project's construct checks in: off, the default, or one of the
// schedules the user picks on the project's page.
import { z } from "zod";

const CHECK_IN_FREQUENCIES = [
  "off",
  "daily",
  "few-times-a-week",
  "weekly",
] as const;

type CheckInFrequency = (typeof CHECK_IN_FREQUENCIES)[number];

// A schedule that checks in, which is every frequency but off.
type CheckInSchedule = Exclude<CheckInFrequency, "off">;

// The days between one check-in and the next on each schedule. "A few times
// a week" is every other day.
const CHECK_IN_DAYS: Readonly<Record<CheckInSchedule, number>> = {
  daily: 1,
  "few-times-a-week": 2,
  weekly: 7,
};

const CHECK_IN_FREQUENCY = z.enum(CHECK_IN_FREQUENCIES);

// The frequency value names, or undefined for anything else.
function parseCheckInFrequency(value: unknown): CheckInFrequency | undefined {
  return CHECK_IN_FREQUENCY.safeParse(value).data;
}

export type { CheckInFrequency, CheckInSchedule };
export {
  CHECK_IN_DAYS,
  CHECK_IN_FREQUENCIES,
  CHECK_IN_FREQUENCY,
  parseCheckInFrequency,
};
