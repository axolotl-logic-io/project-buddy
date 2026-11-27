import type { ListType } from "@/lists/list.ts";
import { LISTS_COPY } from "./lists.ts";

const VOWEL_START = /^[aeiou]/u;

// "a task", "an item": a list item's noun, after its article.
function oneOf(type: ListType): string {
  const { one } = LISTS_COPY.nouns(type);
  if (VOWEL_START.test(one)) {
    return `an ${one}`;
  }
  return `a ${one}`;
}

// The page for one of a quest's lists: its name, the box that searches
// and adds its items, its open items and those done. The quest overview's
// add box shares the box's field and hints.
const LIST_PAGE_COPY = {
  // The link back to the quest, named for it.
  back: (quest: string): string => `Back to ${quest}`,
  // The box's field, which filters the list as it is typed in and adds
  // its text as an item on Enter.
  search: (type: ListType): string => `Search or add ${oneOf(type)}`,
  searchIn: (type: ListType, list: string): string =>
    `Search or add ${oneOf(type)} to ${list}`,
  add: "Add",
  hint: (type: ListType): string =>
    `Type to find ${oneOf(type)}. Enter adds it if it isn’t there.`,
  // Under the field while it holds text that no item has exactly.
  matches: (type: ListType, count: number, text: string): string => {
    const adds = `Enter adds “${text}” as a new ${LISTS_COPY.nouns(type).one}.`;
    if (count === 0) {
      return adds;
    }
    if (count === 1) {
      return `1 match. ${adds}`;
    }
    return `${count} matches. ${adds}`;
  },
  // Under the field while it holds an item's text exactly, which Enter
  // won't add again.
  already: (text: string, done: boolean): string => {
    if (done) {
      return `“${text}” is already done. Escape clears the search.`;
    }
    return `“${text}” is already on the list. Escape clears the search.`;
  },
  // In place of the list while nothing matches the search.
  noMatch: (type: ListType, text: string): string =>
    `No ${LISTS_COPY.nouns(type).one} matches “${text}”.`,
  added: (text: string, list: string): string => `Added “${text}” to ${list}.`,
};

export { LIST_PAGE_COPY };
