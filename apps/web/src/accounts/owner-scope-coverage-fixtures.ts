// The arguments the owner-scope coverage test calls each store export with,
// for the owner OWNER.
import { DEFAULT_BUDDY_ID, getBuddy } from "@/buddies/index.ts";
import { chatNameFixture } from "@/chats/chat-name-fixtures.ts";
import type { NewMessage } from "@/chats/chat-rows.ts";
import {
  chatIdFixture,
  messageIdFixture,
  projectIdFixture,
  userBuddyIdFixture,
  userIdFixture,
} from "@/id-fixtures.ts";
import type { ProjectId } from "@/ids.ts";
import { MEMORY_VERSION_NUMBER } from "@/memory/memory.ts";

const OWNER = userIdFixture();
const PROJECT_ID = projectIdFixture();
const CHAT_ID = chatIdFixture();
const USER_BUDDY_ID = userBuddyIdFixture();
const BUDDY = getBuddy(DEFAULT_BUDDY_ID);
const NEW_CHAT: {
  readonly projectId: ProjectId;
  readonly buddy: typeof BUDDY;
} = { projectId: PROJECT_ID, buddy: BUDDY };
const MESSAGE: NewMessage = {
  id: messageIdFixture("m1"),
  role: "user",
  parts: [{ type: "text", text: "How do I bevel?" }],
};
const REPLY: NewMessage = {
  id: messageIdFixture("r1"),
  role: "assistant",
  parts: [{ type: "text", text: "Press Ctrl+B." }],
};
const CHAT_NAME = chatNameFixture("Beveling the donut");
const VERSION = MEMORY_VERSION_NUMBER.parse(1);
const BASED_ON = MEMORY_VERSION_NUMBER.parse(2);
const SPEND_MICRO_USD = 1200;
const NOW = new Date("2026-10-12T09:00:00Z");

export {
  BASED_ON,
  BUDDY,
  CHAT_ID,
  CHAT_NAME,
  MESSAGE,
  NEW_CHAT,
  NOW,
  OWNER,
  PROJECT_ID,
  REPLY,
  SPEND_MICRO_USD,
  USER_BUDDY_ID,
  VERSION,
};
