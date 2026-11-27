import type { ListItem } from "@/lists/list-item-store.ts";
import type { List } from "@/lists/list-store.ts";

// Whether an item's text holds the search, ignoring case.
function holds({ text }: ListItem, search: string): boolean {
  return text.toLocaleLowerCase().includes(search.toLocaleLowerCase());
}

// Whether an item has exactly this text, ignoring case.
function sameText({ text }: ListItem, search: string): boolean {
  return text.toLocaleLowerCase() === search.toLocaleLowerCase();
}

// What a list section shows of its list: a task list's open one-off tasks
// and every recurring task, done in its current period or not, and every
// item of any other list.
function shownItems(list: List, contents: readonly ListItem[]): ListItem[] {
  if (list.type !== "task") {
    return [...contents];
  }
  return contents.filter(
    ({ checkedOff, recurring }) => recurring || !checkedOff,
  );
}

export { holds, sameText, shownItems };
