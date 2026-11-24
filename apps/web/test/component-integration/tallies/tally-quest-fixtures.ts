// A quest's tallies as a tally list and Home read them: today is 2026-11-24
// in UTC, with words written over the last days, one below zero, and books
// read with no day yet.
import { LIST_ID } from "@/lists/list.ts";
import { LIST_ITEM_ID } from "@/lists/list-item.ts";
import type { TallyQuest } from "@/tallies/tally.ts";
import { questIdFixture } from "../../support/id-fixtures.ts";

const WORDS = "Words written";
const BOOKS = "Books read";
const TALLY_LIST_ID = LIST_ID.parse("2f7d0c1e-5a3b-4c6d-8e9f-0a1b2c3d4e5f");
const WORDS_ID = LIST_ITEM_ID.parse("9c1d2e3f-4a5b-4c6d-9e7f-8a9b0c1d2e3f");
const BOOKS_ID = LIST_ITEM_ID.parse("3e4f5a6b-7c8d-4e9f-8a0b-1c2d3e4f5a6b");

const TALLY_QUEST: TallyQuest = {
  quest: {
    id: questIdFixture("7a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d"),
    name: "Writing",
  },
  today: "2026-11-24",
  tallies: [
    {
      id: WORDS_ID,
      listId: TALLY_LIST_ID,
      text: WORDS,
      days: [
        { date: "2026-11-21", total: "-12.000000" },
        { date: "2026-11-23", total: "1500.500000" },
        { date: "2026-11-24", total: "250.000000" },
      ],
      sum: "4738.500000",
    },
    {
      id: BOOKS_ID,
      listId: TALLY_LIST_ID,
      text: BOOKS,
      days: [],
      sum: "0",
    },
  ],
};

export { BOOKS, BOOKS_ID, TALLY_LIST_ID, TALLY_QUEST, WORDS, WORDS_ID };
