import { getBuddy } from "@/buddies/index.ts";
import type { ChatName } from "@/chats/chat-name.ts";
import type { Chat, ProjectChat } from "@/chats/chat-rows.ts";
import { chatNameFixture } from "../chats/chat-name-fixtures.ts";
import { chatIdFixture, projectIdFixture } from "../id-fixtures.ts";

const PROJECT_CHAT: ProjectChat & { name: ChatName } = {
  id: chatIdFixture(),
  project: { id: projectIdFixture(), name: "Low-poly fox" },
  isInterviewChat: false,
  buddy: getBuddy("mr-tee"),
  name: chatNameFixture("Beveling the donut"),
  renamedByHand: false,
  createdAt: new Date("2026-10-09T12:00:00Z"),
};

const STANDALONE_CHAT: Chat = {
  id: chatIdFixture(),
  project: undefined,
  isInterviewChat: false,
  buddy: getBuddy("hippy"),
  name: undefined,
  renamedByHand: false,
  createdAt: new Date("2026-10-10T12:00:00Z"),
};

export { PROJECT_CHAT, STANDALONE_CHAT };
