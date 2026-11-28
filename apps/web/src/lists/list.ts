import { z } from "zod";

const LIST_WORD_MAX = 80;
const LIST_ITEM_LINE_MAX = 200;
const QUICK_NOTE_MAX = 1000;
const LINE_BREAK = /[\r\n\u2028\u2029]/u;
const LIST_WORD = z
  .string()
  .trim()
  .min(1)
  .max(LIST_WORD_MAX)
  .refine((value) => !LINE_BREAK.test(value), "Use one line.");
const LIST_ID = z.guid().toLowerCase().brand<"ListId">();
type ListId = z.infer<typeof LIST_ID>;

// The types of list whose list items people write. Every item in a list
// has the list's type, and a list can change between these types.
const ITEM_LIST_TYPE = z.enum(["plain", "task", "quick-note", "tally"]);
type ItemListType = z.infer<typeof ITEM_LIST_TYPE>;

// Every list type: the item list types, and the Zotero Collection list,
// whose read-only references Zotero supplies (src/zotero/).
const LIST_TYPE = z.enum([...ITEM_LIST_TYPE.options, "zotero-collection"]);
type ListType = z.infer<typeof LIST_TYPE>;

// The settings that a list of an item list type is saved with.
const LIST_SETTINGS = z.object({
  name: LIST_WORD,
  type: ITEM_LIST_TYPE,
});

type ListSettings = z.infer<typeof LIST_SETTINGS>;

const STARTING_LISTS: readonly ListSettings[] = [
  { name: "Tasks", type: "task" },
  { name: "Ideas", type: "plain" },
];

function listItemLimit(
  type: ListType,
): typeof LIST_ITEM_LINE_MAX | typeof QUICK_NOTE_MAX {
  if (type === "quick-note") {
    return QUICK_NOTE_MAX;
  }
  return LIST_ITEM_LINE_MAX;
}

function listItemText(type: ListType): z.ZodType<string> {
  if (type === "quick-note") {
    return z.string().trim().min(1).max(QUICK_NOTE_MAX);
  }
  return z
    .string()
    .trim()
    .min(1)
    .max(LIST_ITEM_LINE_MAX)
    .refine((value) => !LINE_BREAK.test(value), "Use one line.");
}

export type { ItemListType, ListId, ListSettings, ListType };
export {
  ITEM_LIST_TYPE,
  LIST_ID,
  LIST_SETTINGS,
  LIST_TYPE,
  LIST_WORD,
  listItemLimit,
  listItemText,
  STARTING_LISTS,
};
