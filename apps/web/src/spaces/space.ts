import { z } from "zod";

const SPACE_WORD_MAX = 80;
const MURMLING_LINE_MAX = 200;
const QUICK_NOTE_MAX = 1000;
const LINE_BREAK = /[\r\n\u2028\u2029]/u;
const SPACE_WORD = z
  .string()
  .trim()
  .min(1)
  .max(SPACE_WORD_MAX)
  .refine((value) => !LINE_BREAK.test(value), "Use one line.");
const SPACE_ID = z.guid().toLowerCase().brand<"SpaceId">();
type SpaceId = z.infer<typeof SPACE_ID>;

const MURMLING_TYPE = z.enum(["plain", "task", "quick-note"]);
type MurmlingType = z.infer<typeof MURMLING_TYPE>;

const SPACE_WORDS = z.object({
  name: SPACE_WORD,
  singular: SPACE_WORD,
  plural: SPACE_WORD,
  checkOff: SPACE_WORD,
  uncheck: SPACE_WORD,
  newType: MURMLING_TYPE,
});

type SpaceWords = z.infer<typeof SPACE_WORDS>;

const STARTING_SPACES: readonly SpaceWords[] = [
  {
    name: "Tasks",
    singular: "task",
    plural: "tasks",
    checkOff: "Complete",
    uncheck: "Reopen",
    newType: "task",
  },
  {
    name: "Ideas",
    singular: "idea",
    plural: "ideas",
    checkOff: "Complete",
    uncheck: "Reopen",
    newType: "plain",
  },
];

function murmlingLimit(
  type: MurmlingType,
): typeof MURMLING_LINE_MAX | typeof QUICK_NOTE_MAX {
  if (type === "quick-note") {
    return QUICK_NOTE_MAX;
  }
  return MURMLING_LINE_MAX;
}

function murmlingText(type: MurmlingType): z.ZodType<string> {
  if (type === "quick-note") {
    return z.string().trim().min(1).max(QUICK_NOTE_MAX);
  }
  return z
    .string()
    .trim()
    .min(1)
    .max(MURMLING_LINE_MAX)
    .refine((value) => !LINE_BREAK.test(value), "Use one line.");
}

export type { MurmlingType, SpaceId, SpaceWords };
export {
  MURMLING_TYPE,
  murmlingLimit,
  murmlingText,
  SPACE_ID,
  SPACE_WORDS,
  STARTING_SPACES,
};
