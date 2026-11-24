// "use_case_tally_lists": the amounts a tally takes, and how they show,
// with decimal places only when they aren't 0.

import { describe, expect, test } from "vitest";
import {
  formatAmount,
  parseAmount,
  plainAmount,
  TALLY_DAYS,
  tallyDays,
} from "@/tallies/tally.ts";

describe("use_case_tally_lists", () => {
  test("an amount may be fractional or negative, with 12 digits before the point and 6 after", () => {
    expect(
      ["12", " 2.5 ", "-3", "+4", "-.25", "7.", "123456789012.123456"].map(
        parseAmount,
      ),
    ).toEqual(["12", "2.5", "-3", "4", "-.25", "7.", "123456789012.123456"]);
    expect(
      ["", "-", ".", "1e3", "1,000", "1.1234567", "1000000000000", "abc"].map(
        parseAmount,
      ),
    ).toEqual(Array.from({ length: 8 }, () => undefined));
  });

  test("an amount shows decimal places only when they aren't 0, and every digit", () => {
    expect(
      [
        "2.000000",
        "2.500000",
        "-0.250000",
        "1234.5",
        "123456789012.123456",
      ].map(formatAmount),
    ).toEqual(["2", "2.5", "-0.25", "1,234.5", "123,456,789,012.123456"]);
    expect(["2.000000", "-0.250000", "12", "0"].map(plainAmount)).toEqual([
      "2",
      "-0.25",
      "12",
      "0",
    ]);
  });

  test("a tally's days fill in 0 where it has no total", () => {
    expect(
      tallyDays(
        { days: [{ date: "2026-11-22", total: "3" }] },
        "2026-11-24",
        TALLY_DAYS,
      ),
    ).toEqual([
      { date: "2026-11-18", total: "0" },
      { date: "2026-11-19", total: "0" },
      { date: "2026-11-20", total: "0" },
      { date: "2026-11-21", total: "0" },
      { date: "2026-11-22", total: "3" },
      { date: "2026-11-23", total: "0" },
      { date: "2026-11-24", total: "0" },
    ]);
  });
});
