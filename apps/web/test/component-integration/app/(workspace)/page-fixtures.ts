// Stored projects, chats and milestones for the page tests, shaped as the project and chat
// stores return them, with fixed canonical UUID ids from the id fixtures.

import { getBuddy, snapshotOf } from "@/buddies/index.ts";
import type { Chat, ProjectChat } from "@/chats/chat-rows.ts";
import type { Milestone } from "@/milestones/milestone.ts";
import type { ProjectMember } from "@/projects/members-store.ts";
import type { Project } from "@/projects/store.ts";
import {
  chatIdFixture,
  milestoneIdFixture,
  projectIdFixture,
  userIdFixture,
} from "../../../support/id-fixtures.ts";

const FOX_PROJECT: Project = {
  id: projectIdFixture("6f1c2a8e-3b4d-4e5f-8a9b-0c1d2e3f4a5b"),
  name: "Low-poly fox",
  createdAt: new Date("2026-10-09T12:00:00Z"),
  role: "owner",
  shared: false,
};

// A chat in the fox project, not named yet.
const FOX_CHAT: ProjectChat = {
  id: chatIdFixture("9e8d7c6b-5a4f-4e3d-9c2b-1a0f9e8d7c6b"),
  project: { id: FOX_PROJECT.id, name: FOX_PROJECT.name },
  buddy: snapshotOf(getBuddy("mr-tee")),
  name: undefined,
  renamedByHand: false,
  unread: false,
  createdAt: new Date("2026-10-11T12:00:00Z"),
};

// The fox project's milestones, from its chat: the newest, then an older
// one.
const FOX_TAIL_MILESTONE: Milestone = {
  id: milestoneIdFixture("2d3e4f5a-6b7c-4d8e-9f0a-1b2c3d4e5f6a"),
  chatId: FOX_CHAT.id,
  text: "Fixed the tail's edge loops",
  recordedAt: new Date("2026-10-13T12:00:00Z"),
};
const FOX_BODY_MILESTONE: Milestone = {
  id: milestoneIdFixture("7a8b9c0d-1e2f-4a3b-8c4d-5e6f7a8b9c0d"),
  chatId: FOX_CHAT.id,
  text: "Blocked out the head and body",
  recordedAt: new Date("2026-10-11T12:00:00Z"),
};

// The fox project's progress timeline, newest first.
const FOX_MILESTONES: readonly Milestone[] = [
  FOX_TAIL_MILESTONE,
  FOX_BODY_MILESTONE,
];

// A user's standalone chat, in no project, not named yet.
const STANDALONE_CHAT: Chat = {
  id: chatIdFixture("3c4d5e6f-7a8b-4c9d-8e0f-1a2b3c4d5e6f"),
  project: undefined,
  buddy: snapshotOf(getBuddy("mr-tee")),
  name: undefined,
  renamedByHand: false,
  unread: false,
  createdAt: new Date("2026-10-12T12:00:00Z"),
};

// The fox project's people, as a team project: its owner, with no name, and
// a member with one.
const FOX_OWNER: ProjectMember = {
  id: userIdFixture("8b7c6d5e-4f3a-4b2c-9d1e-0f9a8b7c6d5e"),
  name: undefined,
  email: "owner@example.com",
  role: "owner",
  joinedAt: FOX_PROJECT.createdAt,
};
const FOX_MEMBER: ProjectMember = {
  id: userIdFixture("3c4d5e6f-7a8b-4c9d-8e0f-1a2b3c4d5e6f"),
  name: "Alex",
  email: "alex@example.com",
  role: "member",
  joinedAt: new Date("2026-10-12T12:00:00Z"),
};

// The fox project shared with a member, and as that member sees it.
const FOX_TEAM_PROJECT: Project = { ...FOX_PROJECT, shared: true };
const FOX_PROJECT_AS_MEMBER: Project = {
  ...FOX_PROJECT,
  role: "member",
  shared: true,
};

export {
  FOX_BODY_MILESTONE,
  FOX_CHAT,
  FOX_MEMBER,
  FOX_MILESTONES,
  FOX_OWNER,
  FOX_PROJECT,
  FOX_PROJECT_AS_MEMBER,
  FOX_TAIL_MILESTONE,
  FOX_TEAM_PROJECT,
  STANDALONE_CHAT,
};
