import { getBuddy } from "@/buddies/index.ts";
import type { ChatName } from "@/chats/chat-name.ts";
import type { CentralChat, ChatInProject } from "@/chats/chat-rows.ts";
import { chatNameFixture } from "../chats/chat-name-fixtures.ts";
import { chatIdFixture, projectIdFixture } from "../id-fixtures.ts";

const PROJECT_CHAT: ChatInProject & { name: ChatName } = {
  kind: "project",
  id: chatIdFixture(),
  projectId: projectIdFixture(),
  projectName: "Low-poly fox",
  isInterviewChat: false,
  buddy: getBuddy("mr-tee"),
  name: chatNameFixture("Beveling the donut"),
  renamedByHand: false,
  createdAt: new Date("2026-10-09T12:00:00Z"),
};

const CENTRAL_CHAT: CentralChat = {
  kind: "central",
  id: chatIdFixture(),
  buddy: getBuddy("hippy"),
  name: undefined,
  renamedByHand: false,
  createdAt: new Date("2026-10-10T12:00:00Z"),
};

export { CENTRAL_CHAT, PROJECT_CHAT };
