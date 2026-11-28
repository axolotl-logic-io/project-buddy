// Domain ids, typed so a quest id cannot be passed where a user id is
// expected. Both are Postgres UUIDs. The parsers, and the schemas for zod
// objects that hold an id, are the only way to make one, so a UserId or
// QuestId is always a canonical lowercase UUID string.
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
// A performance's id. The browser makes a new performance's, so its
// composer shows before the server has saved it.
const PERFORMANCE_ID = z.guid().toLowerCase().brand<"PerformanceId">();

// A user's id, as `parseUserId` returns it.
type UserId = z.infer<typeof USER_ID>;

// A quest's id, as `parseQuestId` returns it.
type QuestId = z.infer<typeof QUEST_ID>;

type PerformanceId = z.infer<typeof PERFORMANCE_ID>;

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

// A new performance's id.
function newPerformanceId(): PerformanceId {
  return PERFORMANCE_ID.parse(crypto.randomUUID());
}

export type { PerformanceId, QuestId, UserId };
export {
  newPerformanceId,
  PERFORMANCE_ID,
  parseQuestId,
  parseUserId,
  QUEST_ID,
  USER_ID,
};
