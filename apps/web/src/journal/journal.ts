// Typed Journal sections and their shared editing rules, used by controls,
// commands and construct tools. Free notes remain in memory versions.
import { z } from "zod";

const GOAL_MAX_LENGTH = 2000;
const PREFERENCE_MAX_LENGTH = 200;
const MOST_PREFERENCES = 30;
const MOST_OPERATIONS = 40;
const LINE_BREAK = /[\r\n]/u;
const GOAL = z.string().trim().max(GOAL_MAX_LENGTH);
const PREFERENCE_TEXT = z
  .string()
  .trim()
  .min(1)
  .max(PREFERENCE_MAX_LENGTH)
  .refine((text) => !LINE_BREAK.test(text));
const NUMBER = z.number().int().positive();
const PREFERENCE = z.object({ number: NUMBER, text: PREFERENCE_TEXT });
const PREFERENCES = z.object({
  items: z.array(PREFERENCE).max(MOST_PREFERENCES),
  nextNumber: NUMBER,
});
const SECTION_KIND = z.enum(["goal", "preferences"]);
const CONTENT = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("goal"), text: GOAL }),
  z.object({ kind: z.literal("preferences"), ...PREFERENCES.shape }),
]);
const PREFERENCE_OPERATION = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("add"),
    text: PREFERENCE_TEXT,
    before: NUMBER.optional(),
  }),
  z.object({
    op: z.literal("change"),
    preference: NUMBER,
    text: PREFERENCE_TEXT,
  }),
  z.object({
    op: z.literal("move"),
    preference: NUMBER,
    before: NUMBER.optional(),
  }),
  z.object({ op: z.literal("remove"), preference: NUMBER }),
]);
const EDIT = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("goal"), text: GOAL }),
  z.object({
    kind: z.literal("preferences"),
    operations: z.array(PREFERENCE_OPERATION).min(1).max(MOST_OPERATIONS),
  }),
]);
type Content = z.infer<typeof CONTENT>;
type SectionKind = z.infer<typeof SECTION_KIND>;
type SectionEdit = z.infer<typeof EDIT>;
type PreferenceOperation = z.infer<typeof PREFERENCE_OPERATION>;
type Preference = z.infer<typeof PREFERENCE>;
type Preferences = z.infer<typeof PREFERENCES>;

const EMPTY_GOAL: Content = { kind: "goal", text: "" };
const EMPTY_PREFERENCES: Content = {
  kind: "preferences",
  items: [],
  nextNumber: 1,
};

function emptySection(kind: SectionKind): Content {
  if (kind === "goal") {
    return EMPTY_GOAL;
  }
  return EMPTY_PREFERENCES;
}

function changePreference(
  items: Preference[],
  operation: PreferenceOperation,
  nextNumber: number,
): boolean {
  let at = -1;
  if ("preference" in operation) {
    at = items.findIndex((item) => item.number === operation.preference);
  }
  switch (operation.op) {
    case "add": {
      const before = items.findIndex(
        (item) => item.number === operation.before,
      );
      if (operation.before !== undefined && before === -1) {
        return false;
      }
      let position = items.length;
      if (before !== -1) {
        position = before;
      }
      items.splice(position, 0, { number: nextNumber, text: operation.text });
      return true;
    }
    case "change": {
      if (at === -1) {
        return false;
      }
      items.splice(at, 1, {
        number: operation.preference,
        text: operation.text,
      });
      return true;
    }
    case "remove":
      if (at === -1) {
        return false;
      }
      items.splice(at, 1);
      return true;
    case "move": {
      const item = items[at];
      if (
        item === undefined ||
        (operation.before !== undefined &&
          !items.some((entry) => entry.number === operation.before))
      ) {
        return false;
      }
      if (operation.before === operation.preference) {
        return true;
      }
      items.splice(at, 1);
      let position = items.length;
      if (operation.before !== undefined) {
        position = items.findIndex(
          (entry) => entry.number === operation.before,
        );
      }
      items.splice(position, 0, item);
      return true;
    }
    default:
      return operation satisfies never;
  }
}

// All operations succeed together. A missing item or exceeded limit saves
// nothing; stable numbers are never reused, including after undo.
function applySectionEdit(
  content: Content,
  edit: SectionEdit,
): Content | undefined {
  if (content.kind !== edit.kind) {
    return undefined;
  }
  if (edit.kind === "goal") {
    return { kind: "goal", text: edit.text };
  }
  if (content.kind !== "preferences") {
    return undefined;
  }
  const items = [...content.items];
  let { nextNumber } = content;
  for (const operation of edit.operations) {
    if (!changePreference(items, operation, nextNumber)) {
      return undefined;
    }
    if (operation.op === "add") {
      nextNumber += 1;
    }
  }
  return CONTENT.safeParse({ kind: "preferences", items, nextNumber }).data;
}

function sameContent(left: Content, right: Content): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export type {
  Content,
  Preference,
  PreferenceOperation,
  Preferences,
  SectionEdit,
  SectionKind,
};
export {
  applySectionEdit,
  CONTENT,
  EDIT,
  emptySection,
  GOAL,
  GOAL_MAX_LENGTH,
  PREFERENCE_MAX_LENGTH,
  PREFERENCE_OPERATION,
  PREFERENCES,
  SECTION_KIND,
  sameContent,
};
