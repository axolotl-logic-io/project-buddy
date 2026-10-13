import { afterEach, describe, expect, test, vi } from "vitest";
import { formatTime } from "@/components/time-format.ts";

// 20:16 on October 12 in New York (EDT), and already October 13 in UTC: the
// release sweep's project, which showed "12:16 AM".
const EVENING_IN_NEW_YORK = new Date("2026-10-13T00:16:00Z");

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("formatTime", () => {
  test("writes the day and minute in the zone it is given", () => {
    expect(formatTime(EVENING_IN_NEW_YORK, "minute", "America/New_York")).toBe(
      "Oct 12, 2026, 8:16 PM",
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
      "Oct 13, 2026, 9:16 AM",
    );
  });
});
