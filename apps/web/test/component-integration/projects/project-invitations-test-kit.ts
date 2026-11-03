// For browser tests of pages that show project invitations: a stand-in for
// src/projects/project-invitations.ts, which a test file mounts with
//   vi.mock("@/projects/project-invitations.ts", () => import("./project-invitations-test-kit.ts"));
// By default no one has invitations, and the signed-in user owns the
// project, with none pending; a test sets other answers through vi.mocked.
import { vi } from "vitest";
import type * as invitations from "@/projects/project-invitations.ts";
import {
  projectIdFixture,
  projectInvitationIdFixture,
} from "../../support/id-fixtures.ts";

// A pending invitation to a project with a long name, as its invitee sees it.
const LONG_NAME_INVITATION: invitations.ProjectInvitation = {
  id: projectInvitationIdFixture("5d6e7f8a-9b0c-4d1e-8f2a-3b4c5d6e7f8a"),
  project: {
    id: projectIdFixture("8a9b0c1d-2e3f-4a5b-9c6d-7e8f9a0b1c2d"),
    name: "Seaturtlemodelwithanunbrokennamethatrunsonpastwhereaphonesscreenwouldend",
  },
  inviter: "a-very-long-address-of-the-inviter@example.com",
  invitedAt: new Date("2026-10-30T12:00:00Z"),
};

// A pending invitation the project's owner sent, to a long address.
const SENT_INVITATION: invitations.SentProjectInvitation = {
  id: projectInvitationIdFixture("1f2e3d4c-5b6a-4978-8695-a4b3c2d1e0f9"),
  email: "someone-with-a-very-long-address-indeed@example.com",
  invitedAt: new Date("2026-10-31T12:00:00Z"),
};

const listProjectInvitations = vi.fn<typeof invitations.listProjectInvitations>(
  () => Promise.resolve([]),
);
const listSentProjectInvitations = vi.fn<
  typeof invitations.listSentProjectInvitations
>(() => Promise.resolve([]));
const readProjectInvitation = vi.fn<typeof invitations.readProjectInvitation>(
  () => Promise.resolve(undefined),
);

export {
  LONG_NAME_INVITATION,
  listProjectInvitations,
  listSentProjectInvitations,
  readProjectInvitation,
  SENT_INVITATION,
};
