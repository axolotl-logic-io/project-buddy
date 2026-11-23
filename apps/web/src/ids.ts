import { z } from "zod";

// 8-4-4-4-12 hex digits in any case, with nothing around them. Any version and
// variant, as Postgres accepts.
const CANONICAL_UUID =
  /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/iu;

const USER_ID = z
  .string()
  .regex(CANONICAL_UUID)
  .toLowerCase()
  .brand<"UserId">();
const QUEST_ID = z
  .string()
  .regex(CANONICAL_UUID)
  .toLowerCase()
  .brand<"QuestId">();
// A user's id, as `parseUserId` returns it.
type UserId = z.infer<typeof USER_ID>;

// A quest's id, as `parseQuestId` returns it.
type QuestId = z.infer<typeof QUEST_ID>;

// The value as a lowercase UserId, or undefined unless it is a canonical
// UUID.
function parseUserId(value: string): UserId | undefined {
  return USER_ID.safeParse(value).data;
}

// The value as a lowercase QuestId, or undefined unless it is a canonical
// UUID.
function parseQuestId(value: string): QuestId | undefined {
  return QUEST_ID.safeParse(value).data;
}

export type { QuestId, UserId };
export { parseQuestId, parseUserId, QUEST_ID, USER_ID };
