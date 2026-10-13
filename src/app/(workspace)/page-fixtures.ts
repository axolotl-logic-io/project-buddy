// Stored projects and chats for the page tests, shaped as the project and chat
// stores return them, with fixed canonical UUID ids from the id fixtures.
import type { ChatWithProject } from "@/chats/chat-rows.ts";
import { chatIdFixture, projectIdFixture } from "@/id-fixtures.ts";
import type { Project } from "@/projects/store.ts";

const FOX_PROJECT: Project = {
  id: projectIdFixture("6f1c2a8e-3b4d-4e5f-8a9b-0c1d2e3f4a5b"),
  name: "Low-poly fox",
  createdAt: new Date("2026-10-09T12:00:00Z"),
};

const DONUT_PROJECT: Project = {
  id: projectIdFixture("1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d"),
  name: "Donut",
  createdAt: new Date("2026-10-10T12:00:00Z"),
};

// A chat in the fox project, not named yet.
const FOX_CHAT: ChatWithProject = {
  id: chatIdFixture("9e8d7c6b-5a4f-4e3d-9c2b-1a0f9e8d7c6b"),
  projectId: FOX_PROJECT.id,
  projectName: FOX_PROJECT.name,
  personaId: "mr-tee",
  name: undefined,
  renamedByHand: false,
  createdAt: new Date("2026-10-11T12:00:00Z"),
};

export { DONUT_PROJECT, FOX_CHAT, FOX_PROJECT };
