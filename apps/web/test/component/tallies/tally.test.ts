// "use_case_tally_lists": the amounts a tally takes, how they show, with
// decimal places only when they aren't 0, and a change worked out in the
// browser before the server saves it.

import { describe, expect, test } from "vitest";
import { LIST_ID } from "@/lists/list.ts";
import { LIST_ITEM_ID } from "@/lists/list-item.ts";
import {
  formatAmount,
  parseAmount,
  plainAmount,
  TALLY_DAYS,
  type TallyQuest,
  tallyDays,
  withTallyChange,
} from "@/tallies/tally.ts";
import { questIdFixture } from "../../support/id-fixtures.ts";

const LIST = LIST_ID.parse("2f7d0c1e-5a3b-4c6d-8e9f-0a1b2c3d4e5f");
const WORDS = LIST_ITEM_ID.parse("9c1d2e3f-4a5b-4c6d-9e7f-8a9b0c1d2e3f");
const BOOKS = LIST_ITEM_ID.parse("3e4f5a6b-7c8d-4e9f-8a0b-1c2d3e4f5a6b");

const QUEST: TallyQuest = {
  quest: {
    id: questIdFixture("7a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d"),
    name: "Writing",
  },
  today: "2026-11-24",
  tallies: [
    {
      id: WORDS,
      listId: LIST,
      text: "Words written",
      days: [
        { date: "2026-11-23", total: "1500.500000" },
        { date: "2026-11-24", total: "250.000000" },
      ],
      sum: "1750.500000",
    },
    { id: BOOKS, listId: LIST, text: "Books read", days: [], sum: "0" },
  ],
};

function words(entry: TallyQuest): TallyQuest["tallies"][number] | undefined {
  return entry.tallies.find(({ id }) => id === WORDS);
}

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

  test("an increment adds to today's total and the sum, keeping every digit", () => {
    const changed = withTallyChange(QUEST, WORDS, {
      kind: "increment",
      amount: "-0.000001",
    });
    expect(words(changed)?.days).toContainEqual({
      date: "2026-11-24",
      total: "249.999999",
    });
    expect(words(changed)?.sum).toBe("1750.499999");
    expect(changed.tallies.find(({ id }) => id === BOOKS)).toBe(
      QUEST.tallies[1],
    );
  });

  test("an increment on a tally with no total today starts today's from 0", () => {
    const changed = withTallyChange(QUEST, BOOKS, {
      kind: "increment",
      amount: "2.5",
    });
    expect(changed.tallies.find(({ id }) => id === BOOKS)).toMatchObject({
      days: [{ date: "2026-11-24", total: "2.5" }],
      sum: "2.5",
    });
  });

  test("a new total replaces its date's and moves the sum by the difference", () => {
    const changed = withTallyChange(QUEST, WORDS, {
      kind: "set",
      date: "2026-11-23",
      total: "-12",
    });
    expect(words(changed)?.days).toContainEqual({
      date: "2026-11-23",
      total: "-12",
    });
    expect(words(changed)?.days).toContainEqual({
      date: "2026-11-24",
      total: "250.000000",
    });
    expect(words(changed)?.sum).toBe("238");
  });
});
