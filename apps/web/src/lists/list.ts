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

// Every item in a list has the list's type.
const LIST_TYPE = z.enum(["plain", "task", "quick-note", "tally"]);
type ListType = z.infer<typeof LIST_TYPE>;

const LIST_SETTINGS = z.object({
  name: LIST_WORD,
  type: LIST_TYPE,
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

export type { ListId, ListSettings, ListType };
export {
  LIST_ID,
  LIST_SETTINGS,
  LIST_TYPE,
  listItemLimit,
  listItemText,
  STARTING_LISTS,
};
