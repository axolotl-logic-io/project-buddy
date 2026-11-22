// Stored quests, and chats for the page tests, shaped as the quest and chat
// stores return them, with fixed canonical UUID ids from the id fixtures.

import type { Chat } from "@/chats/chat-rows.ts";
import { getConstruct } from "@/constructs/index.ts";
import type { Conversation } from "@/conversations/conversation-store.ts";
import type { Quest } from "@/quests/store.ts";
import { chatIdFixture, questIdFixture } from "../../../support/id-fixtures.ts";

const FOX_QUEST: Quest = {
  id: questIdFixture("6f1c2a8e-3b4d-4e5f-8a9b-0c1d2e3f4a5b"),
  name: "Low-poly fox",
  createdAt: new Date("2026-10-09T12:00:00Z"),
  status: "active",
  statusRevision: 0,
  dailies: false,
  sharing: { kind: "personal" },
};

// A chat in the fox quest.
const FOX_CHAT: Chat = {
  id: chatIdFixture("9e8d7c6b-5a4f-4e3d-9c2b-1a0f9e8d7c6b"),
  quest: { id: FOX_QUEST.id, name: FOX_QUEST.name },
  construct: getConstruct("lumen"),
  createdAt: new Date("2026-10-11T12:00:00Z"),
};

// The fox quest's one conversation, in its default activity.
const FOX_CONVERSATION: Conversation = FOX_CHAT;

export { FOX_CHAT, FOX_CONVERSATION, FOX_QUEST };
