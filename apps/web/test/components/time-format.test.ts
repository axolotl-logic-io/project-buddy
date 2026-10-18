import { afterEach, describe, expect, test, vi } from "vitest";
import { formatTime, type TimeDetail } from "@/components/time-format.ts";

// 20:16 on October 12 in New York (EDT), and already October 13 in UTC: the
// release sweep's project, which showed "12:16 AM".
const EVENING_IN_NEW_YORK = new Date("2026-10-13T00:16:00Z");

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("formatTime", () => {
  test("writes the day and minute in the zone it is given", () => {
    expect(formatTime(EVENING_IN_NEW_YORK, "minute", "America/New_York")).toBe(
      "Oct 12, 2026, 08:16 PM",
    );
    expect(formatTime(EVENING_IN_NEW_YORK, "minute", "UTC")).toBe(
      "Oct 13, 2026, 12:16 AM",
    );
  });

  test("writes the day alone, the zone's own day", () => {
    expect(formatTime(EVENING_IN_NEW_YORK, "day", "America/New_York")).toBe(
      "Oct 12, 2026",
    );
    expect(formatTime(EVENING_IN_NEW_YORK, "day", "UTC")).toBe("Oct 13, 2026");
  });

  test("writes in the zone of whoever runs it when given none", () => {
    vi.stubEnv("TZ", "Asia/Tokyo");

    expect(formatTime(EVENING_IN_NEW_YORK, "minute", undefined)).toBe(
      "Oct 13, 2026, 09:16 AM",
    );
  });

  test("zero-pads a single-digit day and hour", () => {
    const earlyInTheMonth = new Date("2026-10-02T13:05:00Z");

    expect(formatTime(earlyInTheMonth, "minute", "UTC")).toBe(
      "Oct 02, 2026, 01:05 PM",
    );
    expect(formatTime(earlyInTheMonth, "minute", "America/New_York")).toBe(
      "Oct 02, 2026, 09:05 AM",
    );
    expect(formatTime(earlyInTheMonth, "day", "UTC")).toBe("Oct 02, 2026");
  });
});

// The 1st and 15th of every month at 03:07 UTC: a single-digit hour in UTC,
// and a double-digit one, or the day before, in the other zones.
const MONTHS = [
  "01",
  "02",
  "03",
  "04",
  "05",
  "06",
  "07",
  "08",
  "09",
  "10",
  "11",
  "12",
] as const;
const THROUGH_THE_YEAR = MONTHS.flatMap((month) =>
  ["01", "15"].map((day) => new Date(`2026-${month}-${day}T03:07:00Z`)),
);
const LENGTHS: Readonly<Record<TimeDetail, number>> = { day: 12, minute: 22 };
const OTHER_ZONES = ["America/New_York", "Asia/Tokyo", undefined] as const;
const LETTERS_AND_DIGITS = /[\p{L}\d]/gu;
const THREE_LETTER_MONTH = /^[A-Z][a-z]{2} /u;

// What is left of a time once its letters and digits are taken out.
function separators(time: string): string {
  return time.replace(LETTERS_AND_DIGITS, "");
}

describe("formatTime's width", () => {
  test("the UTC and local strings are the same length", () => {
    vi.stubEnv("TZ", "Asia/Kolkata");

    for (const instant of THROUGH_THE_YEAR) {
      for (const detail of ["day", "minute"] as const) {
        const inUtc = formatTime(instant, detail, "UTC");
        expect(inUtc).toHaveLength(LENGTHS[detail]);
        expect(inUtc).toMatch(THREE_LETTER_MONTH);
        for (const zone of OTHER_ZONES) {
          const local = formatTime(instant, detail, zone);
          expect(local).toHaveLength(inUtc.length);
          expect(separators(local)).toBe(separators(inUtc));
          expect(local).toMatch(THREE_LETTER_MONTH);
        }
      }
    }
  });
});
