import { describe, expect, test } from "vitest";
import {
  formatResetDay,
  quotaResetsOn,
  spendMonthOf,
} from "@/quota/quota-terms.ts";

// This module's own source, to check what it imports.
const QUOTA_TERMS_SOURCE = Object.values(
  import.meta.glob<string>("./quota-terms.ts", {
    query: "?raw",
    import: "default",
    eager: true,
  }),
).join("");

// An import of anything, by path: the quota's terms are a domain module, so
// the UI's copy depends on them and not the other way round.
const IMPORTS = /\bfrom\s+["']|\bimport\s*\(|^\s*import\s+["']/mu;

// The last second of October 2026 in UTC, which is already November 1st
// east of UTC and still October 31st west of it.
const LAST_SECOND_OF_OCTOBER = new Date("2026-10-31T23:59:59.999Z");
const FIRST_MOMENT_OF_NOVEMBER = new Date("2026-11-01T00:00:00.000Z");

describe("spendMonthOf", () => {
  test("is the first day of the moment's month in UTC", () => {
    expect(spendMonthOf(new Date("2026-10-12T09:30:00Z"))).toBe("2026-10-01");
  });

  test("keeps the last second of a month in that month", () => {
    expect(spendMonthOf(LAST_SECOND_OF_OCTOBER)).toBe("2026-10-01");
    expect(spendMonthOf(FIRST_MOMENT_OF_NOVEMBER)).toBe("2026-11-01");
  });

  test("goes by UTC, not the offset the moment was written in", () => {
    expect(spendMonthOf(new Date("2026-11-01T01:00:00+02:00"))).toBe(
      "2026-10-01",
    );
  });

  test("turns December into January of the next year", () => {
    expect(spendMonthOf(new Date("2026-12-31T23:59:59Z"))).toBe("2026-12-01");
    expect(spendMonthOf(new Date("2027-01-01T00:00:00Z"))).toBe("2027-01-01");
  });
});

describe("quotaResetsOn", () => {
  test("is midnight UTC on the first of the next month", () => {
    expect(quotaResetsOn(new Date("2026-10-12T09:30:00Z"))).toEqual(
      FIRST_MOMENT_OF_NOVEMBER,
    );
  });

  test("on the last second of a month, is the next moment", () => {
    expect(quotaResetsOn(LAST_SECOND_OF_OCTOBER)).toEqual(
      FIRST_MOMENT_OF_NOVEMBER,
    );
  });

  test("at the first moment of a month, is a month away", () => {
    expect(quotaResetsOn(FIRST_MOMENT_OF_NOVEMBER)).toEqual(
      new Date("2026-12-01T00:00:00Z"),
    );
  });

  test("after December, is January 1st of the next year", () => {
    expect(quotaResetsOn(new Date("2026-12-15T12:00:00Z"))).toEqual(
      new Date("2027-01-01T00:00:00Z"),
    );
  });
});

describe("quota-terms.ts", () => {
  test("imports nothing, so the UI copy can use it without a cycle", () => {
    expect(QUOTA_TERMS_SOURCE).toContain("function quotaResetsOn");
    expect(QUOTA_TERMS_SOURCE).not.toMatch(IMPORTS);
  });
});

describe("formatResetDay", () => {
  test("names the day as a reader says it, such as November 1, 2026", () => {
    expect(formatResetDay(FIRST_MOMENT_OF_NOVEMBER)).toBe("November 1, 2026");
  });

  test("names UTC's day, wherever the reader is", () => {
    // Midnight UTC is still October 31st west of UTC.
    expect(formatResetDay(quotaResetsOn(LAST_SECOND_OF_OCTOBER))).toBe(
      "November 1, 2026",
    );
    expect(formatResetDay(new Date("2026-11-01T23:59:59Z"))).toBe(
      "November 1, 2026",
    );
  });
});
