// Stored projects and chats for the page tests, shaped as the project and chat
// stores return them, with fixed canonical UUID ids from the id fixtures.

import { getBuddy, snapshotOf } from "@/buddies/index.ts";
import type { Chat, ProjectChat } from "@/chats/chat-rows.ts";
import type { Project } from "@/projects/store.ts";
import {
  chatIdFixture,
  projectIdFixture,
} from "../../../support/id-fixtures.ts";

const FOX_PROJECT: Project = {
  id: projectIdFixture("6f1c2a8e-3b4d-4e5f-8a9b-0c1d2e3f4a5b"),
  name: "Low-poly fox",
  createdAt: new Date("2026-10-09T12:00:00Z"),
};

// A chat in the fox project, not named yet.
const FOX_CHAT: ProjectChat = {
  id: chatIdFixture("9e8d7c6b-5a4f-4e3d-9c2b-1a0f9e8d7c6b"),
  project: { id: FOX_PROJECT.id, name: FOX_PROJECT.name },
  buddy: snapshotOf(getBuddy("mr-tee")),
  name: undefined,
  renamedByHand: false,
  createdAt: new Date("2026-10-11T12:00:00Z"),
};

// A user's standalone chat, in no project, not named yet.
const STANDALONE_CHAT: Chat = {
  id: chatIdFixture("3c4d5e6f-7a8b-4c9d-8e0f-1a2b3c4d5e6f"),
  project: undefined,
  buddy: snapshotOf(getBuddy("mr-tee")),
  name: undefined,
  renamedByHand: false,
  createdAt: new Date("2026-10-12T12:00:00Z"),
};

export { FOX_CHAT, FOX_PROJECT, STANDALONE_CHAT };
