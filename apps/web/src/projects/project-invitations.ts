// Project invitations: a project's owner invites someone by their email
// address, and the invitee joins the project or declines. An invitation
// can't make an account, and reveals no one's: to an address with an
// account it is saved and emailed with a sign-in link that opens its page;
// to one with none it is saved by address alone and sent to no one, and
// waits for an account with that address, which only an admin's invitation
// makes. The owner sees the two the same, in the answer, the limits and the
// pending invitations. An invitation lasts until the invitee answers it, its
// owner revokes it, or a newer one to the same address replaces it.
//
// Every function takes the acting user first. Only the project's owner
// invites, sees the pending invitations and revokes them; only the invitee
// sees an invitation as theirs and answers it. Anything else, and any id or
// token that is malformed or unknown, is not found.
import { and, desc, eq, isNull, or, type SQL, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { after } from "next/server";
import {
  hashToken,
  linkOrigin,
  newToken,
  TOKEN_FORMAT,
} from "@/accounts/emailed-link.ts";
import {
  type Reservation,
  reserveProjectInvitation,
} from "@/accounts/invitation-send-limits.ts";
import {
  projectInvitationOwnedBy,
  projectInvitationTo,
  projectOwnedBy,
} from "@/accounts/owner-scope.ts";
import { newSignInLinkUrl } from "@/accounts/sign-in-links.ts";
import {
  findUserByEmail,
  normalizeEmail,
  type User,
} from "@/accounts/users-store.ts";
import { getDb } from "@/db/client.ts";
import { projectInvitations } from "@/db/tables/project-invitations.ts";
import { projects } from "@/db/tables/projects-and-chats.ts";
import { users } from "@/db/tables/users.ts";
import { projectInvitationEmail } from "@/email/project-invitation-email.ts";
import { sendEmail } from "@/email/send-email.ts";
import { logEmailFailure } from "@/errors/error-log.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import {
  type ProjectId,
  type ProjectInvitationId,
  parseProjectId,
  parseProjectInvitationId,
  type UserId,
} from "@/ids.ts";
import {
  addProjectMember,
  listProjectMembers,
} from "@/projects/members-store.ts";

// Where an invitation's page is: its token follows.
const PROJECT_INVITATION_PATH = "/projects/invitations";

// A pending invitation as its invitee sees it.
interface ProjectInvitation {
  readonly id: ProjectInvitationId;
  readonly project: { readonly id: ProjectId; readonly name: string };
  // Who sent it: their name, or their address if they have none.
  readonly inviter: string;
  readonly invitedAt: Date;
}

// A pending invitation as the project's owner sees it.
interface SentProjectInvitation {
  readonly id: ProjectInvitationId;
  // The invitee's address.
  readonly email: string;
  readonly invitedAt: Date;
}

// What inviting did: taken, which saves the invitation, and emails it if the
// address has an account, the inviter can't tell which; or
// refused, because the project isn't the inviter's, the address is the
// inviter's own or a member's, which the inviter already knows, or the
// inviter's limits are reached.
type InviteOutcome =
  | "taken"
  | "not-found"
  | "yourself"
  | "already-member"
  | "limited";

interface InviteRequest {
  readonly projectId: string;
  readonly email: string;
  readonly requestHeaders: Headers;
}

const inviters = alias(users, "inviters");

interface InvitationRow {
  readonly id: string;
  readonly projectId: string;
  readonly projectName: string;
  readonly inviterName: string | null;
  readonly inviterEmail: string;
  readonly invitedAt: Date;
}

// Rows as invitations. A row whose ids aren't UUIDs is skipped, though the
// uuid columns never hold one.
function toInvitations(rows: readonly InvitationRow[]): ProjectInvitation[] {
  return rows.flatMap((row) => {
    const id = parseProjectInvitationId(row.id);
    const projectId = parseProjectId(row.projectId);
    if (id === undefined || projectId === undefined) {
      return [];
    }
    return [
      {
        id,
        project: { id: projectId, name: row.projectName },
        inviter: row.inviterName ?? row.inviterEmail,
        invitedAt: row.invitedAt,
      },
    ];
  });
}

// The pending invitations to invitee, or those of them that match where,
// newest first.
function readInvitations(
  invitee: UserId,
  where?: SQL,
): Promise<ProjectInvitation[]> {
  return withAppErrors("read project invitations", async () =>
    toInvitations(
      await getDb()
        .select({
          id: projectInvitations.id,
          projectId: projects.id,
          projectName: projects.name,
          inviterName: inviters.name,
          inviterEmail: inviters.email,
          invitedAt: projectInvitations.createdAt,
        })
        .from(projectInvitations)
        .innerJoin(projects, eq(projects.id, projectInvitations.projectId))
        .innerJoin(inviters, eq(inviters.id, projectInvitations.inviterId))
        .where(
          and(
            where,
            projectInvitationTo(invitee),
            eq(projectInvitations.state, "pending"),
          ),
        )
        .orderBy(desc(projectInvitations.createdAt)),
    ),
  );
}

// The owner's project with this id, or undefined.
async function ownedProject(
  owner: UserId,
  id: string,
): Promise<{ id: ProjectId; name: string } | undefined> {
  const projectId = parseProjectId(id);
  if (projectId === undefined) {
    return undefined;
  }
  const [row] = await withAppErrors("read invited project", () =>
    getDb()
      .select({ name: projects.name })
      .from(projects)
      .where(and(eq(projects.id, projectId), projectOwnedBy(owner))),
  );
  if (row === undefined) {
    return undefined;
  }
  return { id: projectId, name: row.name };
}

// One invitation being made: who sends it, to which project, the normalized
// address it goes to, the account with that address, if any, and the origin
// of its email link.
interface Invitation {
  readonly inviter: User;
  readonly project: { readonly id: ProjectId; readonly name: string };
  readonly address: string;
  readonly invitee: User | undefined;
  readonly origin: string;
}

// Saves the invitation, by its invitee's account if they have one and by
// address otherwise, in place of any pending one to the same address for
// the project, and gives the token for its email link.
async function saveProjectInvitation({
  inviter,
  project,
  address,
  invitee,
}: Invitation): Promise<string> {
  const token = newToken();
  const tokenHash = await hashToken(token);
  const db = getDb();
  const toAddress = and(
    isNull(projectInvitations.inviteeId),
    eq(projectInvitations.inviteeEmail, address),
  );
  let named: { inviteeId: UserId } | { inviteeEmail: string } = {
    inviteeEmail: address,
  };
  let sameInvitee = toAddress;
  if (invitee !== undefined) {
    named = { inviteeId: invitee.id };
    sameInvitee = or(eq(projectInvitations.inviteeId, invitee.id), toAddress);
  }
  await withAppErrors("save project invitation", () =>
    db.batch([
      db
        .update(projectInvitations)
        .set({ state: "revoked" })
        .where(
          and(
            eq(projectInvitations.projectId, project.id),
            sameInvitee,
            eq(projectInvitations.state, "pending"),
          ),
        ),
      db.insert(projectInvitations).values({
        projectId: project.id,
        ...named,
        inviterId: inviter.id,
        tokenHash,
      }),
    ]),
  );
  return token;
}

// Emails the saved invitation, whose link holds the token, to invitee.
async function emailProjectInvitation(
  { inviter, project, origin }: Invitation,
  invitee: User,
  token: string,
): Promise<void> {
  const tokenHash = await hashToken(token);
  const { url } = await newSignInLinkUrl(
    invitee.id,
    origin,
    `${PROJECT_INVITATION_PATH}/${token}`,
  );
  await sendEmail(
    projectInvitationEmail({
      to: invitee.email,
      inviter: inviter.name ?? inviter.email,
      projectName: project.name,
      url: url.href,
      idempotencyKey: `project-invitation/${tokenHash}`,
    }),
  );
}

// Saves the invitation, then emails it if the address has an account. On
// failure it logs it and releases the reservation, so the inviter can send
// it again at once; an invitation saved before its email failed stays, as
// one to an address with no account does.
async function deliver(
  invitation: Invitation,
  reservation: Reservation,
): Promise<void> {
  try {
    const token = await saveProjectInvitation(invitation);
    if (invitation.invitee !== undefined) {
      await emailProjectInvitation(invitation, invitation.invitee, token);
    }
  } catch (error) {
    logEmailFailure("our-bug", "send project invitation", error);
    await reservation.release();
  }
}

// Invites the person with the address to the inviter's project, within the
// inviter's project invitation limits, and says what it did. Whether the
// address has an account changes nothing the inviter can see: it is taken
// either way, counts the same against the limits, takes as long, as the
// invitation is saved and emailed after the response is sent (after()), and
// shows the same in the pending invitations. Only an address with an account
// is emailed. A storage failure before the response throws; one after it is
// logged and frees its place in the limits.
async function inviteToProject(
  inviter: User,
  { projectId, email, requestHeaders }: InviteRequest,
): Promise<InviteOutcome> {
  const project = await ownedProject(inviter.id, projectId);
  if (project === undefined) {
    return "not-found";
  }
  const address = normalizeEmail(email);
  if (address === inviter.email) {
    return "yourself";
  }
  // The same queries run whether or not the address has an account.
  const [invitee, members] = await Promise.all([
    findUserByEmail(address),
    listProjectMembers(inviter.id, project.id),
  ]);
  if (
    invitee !== undefined &&
    members.some((member) => member.id === invitee.id)
  ) {
    return "already-member";
  }
  const reservation = await reserveProjectInvitation(inviter.id, address);
  if (reservation === undefined) {
    return "limited";
  }
  const invitation: Invitation = {
    inviter,
    project,
    address,
    invitee,
    origin: linkOrigin(requestHeaders),
  };
  after(() => deliver(invitation, reservation));
  return "taken";
}

// The owner's pending invitations to the project, newest first, or
// undefined unless the project is the owner's: only its owner sees them.
async function listSentProjectInvitations(
  owner: UserId,
  projectId: ProjectId,
): Promise<SentProjectInvitation[] | undefined> {
  const db = getDb();
  const [owned, rows] = await withAppErrors(
    "list sent project invitations",
    () =>
      db.batch([
        db
          .select({ id: projects.id })
          .from(projects)
          .where(and(eq(projects.id, projectId), projectOwnedBy(owner))),
        db
          .select({
            id: projectInvitations.id,
            email: sql<
              string | null
            >`coalesce(${users.email}, ${projectInvitations.inviteeEmail})`,
            invitedAt: projectInvitations.createdAt,
          })
          .from(projectInvitations)
          .leftJoin(users, eq(users.id, projectInvitations.inviteeId))
          .where(
            and(
              eq(projectInvitations.projectId, projectId),
              projectInvitationOwnedBy(owner),
              eq(projectInvitations.state, "pending"),
            ),
          )
          .orderBy(desc(projectInvitations.createdAt)),
      ]),
  );
  if (owned.length === 0) {
    return undefined;
  }
  return rows.flatMap(({ id, email, invitedAt }) => {
    const invitationId = parseProjectInvitationId(id);
    if (invitationId === undefined || email === null) {
      return [];
    }
    return [{ id: invitationId, email, invitedAt }];
  });
}

// Revokes the owner's pending invitation, so its invitee can no longer see
// or answer it. One that is answered, unknown or not the owner's is left as
// it is.
async function revokeProjectInvitation(
  owner: UserId,
  id: string,
): Promise<void> {
  const invitationId = parseProjectInvitationId(id);
  if (invitationId === undefined) {
    return;
  }
  await withAppErrors("revoke project invitation", () =>
    getDb()
      .update(projectInvitations)
      .set({ state: "revoked" })
      .where(
        and(
          eq(projectInvitations.id, invitationId),
          projectInvitationOwnedBy(owner),
          eq(projectInvitations.state, "pending"),
        ),
      ),
  );
}

// The invitee's pending invitations, newest first.
function listProjectInvitations(invitee: UserId): Promise<ProjectInvitation[]> {
  return readInvitations(invitee);
}

// The invitee's pending invitation whose email link holds the token, or
// undefined. Reading it changes nothing, so a mail program that opens the
// link answers nothing.
async function readProjectInvitation(
  invitee: UserId,
  token: string,
): Promise<ProjectInvitation | undefined> {
  if (!TOKEN_FORMAT.test(token)) {
    return undefined;
  }
  const tokenHash = await hashToken(token);
  const [invitation] = await readInvitations(
    invitee,
    eq(projectInvitations.tokenHash, tokenHash),
  );
  return invitation;
}

// Moves the invitee's invitation from one state to another, and gives its
// project's id, or undefined if it wasn't theirs in that state. Only one
// change claims it.
async function moveInvitation(
  invitee: UserId,
  id: ProjectInvitationId,
  from: "pending" | "accepted",
  to: "pending" | "accepted" | "declined",
): Promise<ProjectId | undefined> {
  const [row] = await withAppErrors("answer project invitation", () =>
    getDb()
      .update(projectInvitations)
      .set({ state: to })
      .where(
        and(
          eq(projectInvitations.id, id),
          projectInvitationTo(invitee),
          eq(projectInvitations.state, from),
        ),
      )
      .returning({ projectId: projectInvitations.projectId }),
  );
  return parseProjectId(row?.projectId ?? "");
}

// Accepts the invitee's pending invitation and makes them a member of its
// project, giving the project's id, or undefined if they have no such
// invitation. If joining fails, the invitation is pending again.
async function joinProject(
  invitee: UserId,
  id: string,
): Promise<ProjectId | undefined> {
  const invitationId = parseProjectInvitationId(id);
  if (invitationId === undefined) {
    return undefined;
  }
  const projectId = await moveInvitation(
    invitee,
    invitationId,
    "pending",
    "accepted",
  );
  if (projectId === undefined) {
    return undefined;
  }
  let joined: boolean;
  try {
    joined = await addProjectMember(invitee, projectId);
  } catch (error) {
    await moveInvitation(invitee, invitationId, "accepted", "pending");
    throw error;
  }
  if (!joined) {
    await moveInvitation(invitee, invitationId, "accepted", "pending");
    return undefined;
  }
  return projectId;
}

// Declines the invitee's pending invitation, which then no longer shows.
// Answers whether there was one.
async function declineProjectInvitation(
  invitee: UserId,
  id: string,
): Promise<boolean> {
  const invitationId = parseProjectInvitationId(id);
  if (invitationId === undefined) {
    return false;
  }
  const declined = await moveInvitation(
    invitee,
    invitationId,
    "pending",
    "declined",
  );
  return declined !== undefined;
}

export type {
  InviteOutcome,
  InviteRequest,
  ProjectInvitation,
  SentProjectInvitation,
};
export {
  declineProjectInvitation,
  inviteToProject,
  joinProject,
  listProjectInvitations,
  listSentProjectInvitations,
  readProjectInvitation,
  revokeProjectInvitation,
};
