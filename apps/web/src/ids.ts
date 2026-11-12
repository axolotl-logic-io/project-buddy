// Domain ids, typed so a quest id cannot be passed where a chat id is
// expected. User, quest, chat, milestone and user construct ids are
// Postgres UUIDs. The parsers, and the
// schemas for zod objects that hold an id, are the only way to make one, so a
// QuestId or ChatId is always a canonical lowercase UUID string. A message
// id is the AI SDK's, which the browser makes and which is no UUID, so a
// MessageId is only known to be non-empty and at most MESSAGE_ID_MAX_LENGTH
// characters long.
import { z } from "zod";

// 8-4-4-4-12 hex digits in any case, with nothing around them. Any version and
// variant, as Postgres accepts.
const CANONICAL_UUID =
  /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/iu;

// The AI SDK's ids are 16 characters, with an optional short prefix. The
// limit only keeps a forged request from storing a huge id.
const MESSAGE_ID_MAX_LENGTH = 64;

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
const CHAT_ID = z
  .string()
  .regex(CANONICAL_UUID)
  .toLowerCase()
  .brand<"ChatId">();
const IMAGE_ID = z
  .string()
  .regex(CANONICAL_UUID)
  .toLowerCase()
  .brand<"ImageId">();
type ImageId = z.infer<typeof IMAGE_ID>;
function parseImageId(value: string): ImageId | undefined {
  return IMAGE_ID.safeParse(value).data;
}

const MILESTONE_ID = z
  .string()
  .regex(CANONICAL_UUID)
  .toLowerCase()
  .brand<"MilestoneId">();

const OWN_PROMPT_ID = z
  .string()
  .regex(CANONICAL_UUID)
  .toLowerCase()
  .brand<"OwnPromptId">();
const MESSAGE_ID = z
  .string()
  .min(1)
  .max(MESSAGE_ID_MAX_LENGTH)
  .brand<"MessageId">();

// A user's id, as `parseUserId` returns it.
type UserId = z.infer<typeof USER_ID>;

// A quest's id, as `parseQuestId` returns it.
type QuestId = z.infer<typeof QUEST_ID>;

// A chat's id, as `parseChatId` returns it.
type ChatId = z.infer<typeof CHAT_ID>;

// The id of a user's own prompt, a construct or an activity, as
// `parseOwnPromptId` returns it.
type OwnPromptId = z.infer<typeof OWN_PROMPT_ID>;

// A milestone's id, as `parseMilestoneId` returns it.
type MilestoneId = z.infer<typeof MILESTONE_ID>;

// A chat message's id, as `parseMessageId` returns it.
type MessageId = z.infer<typeof MESSAGE_ID>;

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

// The value as a lowercase ChatId, or undefined unless it is a canonical UUID.
function parseChatId(value: string): ChatId | undefined {
  return CHAT_ID.safeParse(value).data;
}

// The value as a lowercase OwnPromptId, or undefined unless it is a
// canonical UUID.
function parseOwnPromptId(value: string): OwnPromptId | undefined {
  return OWN_PROMPT_ID.safeParse(value).data;
}

// The value as a lowercase MilestoneId, or undefined unless it is a
// canonical UUID.
function parseMilestoneId(value: string): MilestoneId | undefined {
  return MILESTONE_ID.safeParse(value).data;
}

// The value as a MessageId, or undefined if it is empty or longer than
// MESSAGE_ID_MAX_LENGTH.
function parseMessageId(value: string): MessageId | undefined {
  return MESSAGE_ID.safeParse(value).data;
}

export type {
  ChatId,
  ImageId,
  MessageId,
  MilestoneId,
  OwnPromptId,
  QuestId,
  UserId,
};
export {
  CHAT_ID,
  IMAGE_ID,
  MESSAGE_ID,
  MESSAGE_ID_MAX_LENGTH,
  MILESTONE_ID,
  OWN_PROMPT_ID,
  parseChatId,
  parseImageId,
  parseMessageId,
  parseMilestoneId,
  parseOwnPromptId,
  parseQuestId,
  parseUserId,
  QUEST_ID,
  USER_ID,
};
