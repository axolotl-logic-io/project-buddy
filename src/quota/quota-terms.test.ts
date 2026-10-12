import { describe, expect, test } from "vitest";
import { userMessage } from "@/errors/app-error.ts";
import {
  quotaResetsOn,
  quotaUsedUpMessage,
  spendMonthOf,
} from "@/quota/quota-terms.ts";
import { QUOTA_COPY } from "@/ui/copy/chat.ts";

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

describe("quotaUsedUpMessage", () => {
  test("says the quota is used up and names the reset day in UTC", () => {
    expect(quotaUsedUpMessage(quotaResetsOn(LAST_SECOND_OF_OCTOBER))).toBe(
      `${userMessage("quota-used-up")} ${QUOTA_COPY.resetsOn("November 1, 2026")}`,
    );
  });
});
