// Quest membership and quest invitations, stored in Postgres. A quest is
// open to its owner and its accepted members (src/accounts/owner-scope.ts).
// Anyone the quest is open to may invite people, see who is in it and
// remove a member or withdraw a pending invitation; no one can remove the
// owner, who is never a member row. A pending invitation opens nothing of
// the quest: only its invitee sees it, in Pending, and only they accept or
// decline it, one quest at a time.
//
// Inviting an address with no account creates an invited account for it
// at once (src/accounts/users-store.ts), and every later invitation to the
// address uses that account. Each invitation is emailed with an acceptance
// link of its own, which works for INVITATION_LINK_LIFETIME_DAYS and only
// once: following it signs the browser in as the invitee, completes an
// invited account's sign-up with the name they give, and accepts that one
// quest invitation.

import { and, asc, desc, eq, gt, inArray, ne, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { hashToken, newToken, TOKEN_FORMAT } from "@/accounts/emailed-link.ts";
import {
  questInvitationOpenTo,
  questInvitationTo,
  questMemberOpenTo,
  questOpenTo,
  questPendingFor,
} from "@/accounts/owner-scope.ts";
import { countQuestInvitation } from "@/accounts/rate-limits.ts";
import {
  completeSignUpIn,
  findOrInviteAccount,
  normalizeEmail,
} from "@/accounts/users-store.ts";
import type { SessionUser } from "@/auth/session-token.ts";
import { releaseRepliesOf } from "@/chats/store.ts";
import { getDb, inTransaction, type Transaction } from "@/db/client.ts";
import { questInvitations, questMembers } from "@/db/tables/quest-members.ts";
import { quests } from "@/db/tables/quests-and-chats.ts";
import { users } from "@/db/tables/users.ts";
import { EmailFailure, type EmailProblem } from "@/email/email-failure.ts";
import { questInvitationEmail } from "@/email/quest-invitation-email.ts";
import { sendEmail } from "@/email/send-email.ts";
import { logEmailFailure } from "@/errors/error-log.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import { parseQuestId, parseUserId, type QuestId, type UserId } from "@/ids.ts";
import { INVITATION_LINK_LIFETIME_DAYS } from "@/quests/membership.ts";
import { QUEST_STATUS, type QuestStatus } from "@/quests/quest-status.ts";
import { endRepliesOf } from "@/replies/reply-runs.ts";
import { SIGN_IN_LINK_PATH } from "@/routes.ts";

const MS_PER_DAY = 86_400_000;

// A person as others in a quest see them: their name, or their email
// address when they have given no name, as message authors are shown
// (src/chats/message-author.ts). A pending invitee is shown only by the
// address they were invited at, so inviting reveals nothing of an
// existing account, not even whether there is one.
interface QuestPerson {
  readonly id: UserId;
  readonly displayName: string;
}

// Who a quest is open to, and who is invited to it, as someone it is open
// to sees them.
interface QuestPeople {
  readonly owner: QuestPerson;
  // Accepted members, in the order they joined.
  readonly members: readonly (QuestPerson & { readonly joinedAt: Date })[];
  // Pending invitations, oldest first.
  readonly invited: readonly (QuestPerson & { readonly invitedAt: Date })[];
}

// A quest the user is invited to and hasn't accepted, as Pending lists it:
// the quest's name and who invited them, and nothing else of the quest.
interface PendingQuest {
  readonly questId: QuestId;
  readonly name: string;
  // Its status, the Quests tab it moves to once accepted.
  readonly status: QuestStatus;
  // The inviter's display name, or undefined if their account is gone.
  readonly invitedBy: string | undefined;
  readonly invitedAt: Date;
}

// What came of inviting an address to a quest:
// - invited: the invitation is pending and its link was emailed; a pending
//   invitation is sent again with a fresh link.
// - unsent: the invitation is pending but its email failed; inviting again
//   resends it.
// - in-quest: the address is the owner's or a member's; nothing changed.
// - limited: the inviter has sent too many invitations lately; nothing
//   changed. Only invitations that go out count, not refused requests.
// - not-found: the quest isn't open to the inviter, or is a Dailies quest,
//   which has no members.
type InviteResult =
  | { readonly kind: "invited" | "unsent" | "in-quest" }
  | { readonly kind: "limited" | "not-found" };

// What an acceptance link reads as before anyone continues: the quest it
// invites to, who invited, and the invitee's account, whose state says
// whether continuing needs a name.
interface InvitationLink {
  readonly questId: QuestId;
  readonly questName: string;
  readonly invitedBy: string | undefined;
  readonly inviteeEmail: string;
  readonly inviteeId: UserId;
  readonly needsName: boolean;
}

// What came of continuing from an acceptance link: the invitee to sign in
// and the quest they joined; or that an invited account needs a valid
// name first; or that the link no longer works.
type AcceptLinkResult =
  | {
      readonly kind: "accepted";
      readonly user: SessionUser;
      readonly questId: QuestId;
    }
  | { readonly kind: "needs-name" }
  | { readonly kind: "gone" };

// What inviteToQuest's transaction saved: a pending invitation with its
// new link, ready to email, or an answer with nothing to send.
type SavedInvitation =
  | {
      readonly kind: "pending";
      readonly questName: string;
      readonly invitedBy: string;
      // The owner's display name when someone else invites.
      readonly owner: string | undefined;
      // Whether the invitee's account is an invited one, not signed up.
      readonly invitedAccount: boolean;
      readonly token: string;
      readonly tokenHash: string;
    }
  | { readonly kind: "in-quest" | "not-found" | "limited" };

// The inviter, joined beside the invitee when a query reads both.
const inviters = alias(users, "inviters");

function displayName(name: string | null, email: string): string {
  return name ?? email;
}

function person(row: {
  readonly id: string;
  readonly name: string | null;
  readonly email: string;
}): QuestPerson | undefined {
  const id = parseUserId(row.id);
  if (id === undefined) {
    return undefined;
  }
  return { id, displayName: displayName(row.name, row.email) };
}

// The quest's name, inside tx, locked against concurrent invitations, if
// it is open to user and can have members: every quest but a Dailies.
async function lockedSharableQuest(
  tx: Transaction,
  user: UserId,
  questId: QuestId,
): Promise<{ readonly name: string; readonly ownerId: string } | undefined> {
  const [quest] = await tx
    .select({ name: quests.name, ownerId: quests.userId })
    .from(quests)
    .where(
      and(eq(quests.id, questId), questOpenTo(user), eq(quests.dailies, false)),
    )
    .for("no key update");
  return quest;
}

// Whether the normalized address is the account of the quest's owner or
// of one of its members, as viewer, whom the quest is open to, sees them.
// Looks the address up without creating an account for it.
async function isInQuest(
  tx: Transaction,
  viewer: UserId,
  {
    questId,
    ownerId,
    email,
  }: {
    readonly questId: QuestId;
    readonly ownerId: string;
    readonly email: string;
  },
): Promise<boolean> {
  const [account] = await tx
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email));
  if (account === undefined) {
    return false;
  }
  if (account.id === ownerId) {
    return true;
  }
  const [row] = await tx
    .select({ userId: questMembers.userId })
    .from(questMembers)
    .where(
      and(
        eq(questMembers.questId, questId),
        eq(questMembers.userId, account.id),
        questMemberOpenTo(viewer),
      ),
    );
  return row !== undefined;
}

// The people on an invitation, read together within the transaction.
async function invitationAccounts(
  tx: Transaction,
  ids: {
    readonly inviter: UserId;
    readonly owner: typeof users.$inferSelect.id;
    readonly invitee: UserId;
  },
): Promise<{
  readonly invitedBy: string;
  readonly owner: string | undefined;
  readonly invitedAccount: boolean;
}> {
  const rows = await tx
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      accountState: users.accountState,
    })
    .from(users)
    .where(inArray(users.id, [ids.inviter, ids.owner, ids.invitee]));
  const byId = new Map(rows.map((row) => [row.id, row]));
  const inviter = byId.get(ids.inviter);
  const invitee = byId.get(ids.invitee);
  let ownerName: string | undefined;
  if (ids.owner !== ids.inviter) {
    const owner = byId.get(ids.owner);
    ownerName = displayName(owner?.name ?? null, owner?.email ?? "");
  }
  return {
    invitedBy: displayName(inviter?.name ?? null, inviter?.email ?? ""),
    owner: ownerName,
    invitedAccount: invitee?.accountState === "invited",
  };
}

// Creates or replaces the pending invitation and its acceptance link.
async function savePendingInvitation(
  tx: Transaction,
  invitation: {
    readonly questId: QuestId;
    readonly inviteeId: UserId;
    readonly inviterId: UserId;
  },
  tokenHash: string,
  now: Date,
): Promise<void> {
  const linkExpiresAt = new Date(
    now.getTime() + INVITATION_LINK_LIFETIME_DAYS * MS_PER_DAY,
  );
  await tx
    .insert(questInvitations)
    .values({ ...invitation, tokenHash, linkExpiresAt })
    .onConflictDoUpdate({
      target: [questInvitations.questId, questInvitations.inviteeId],
      set: { tokenHash, linkExpiresAt, inviterId: invitation.inviterId },
    });
}

// What to log an unsent invitation email as.
function emailProblem(error: unknown): EmailProblem {
  if (error instanceof EmailFailure) {
    const { problem } = error;
    return problem;
  }
  return "our-bug";
}

// Invites the address to the quest, as inviter, and emails the invitee an
// acceptance link at origin. Creates an invited account for an address
// with none. See InviteResult.
async function inviteToQuest(
  inviter: UserId,
  request: {
    readonly questId: QuestId;
    readonly email: string;
    readonly origin: string;
  },
  now: Date,
): Promise<InviteResult> {
  const { questId, origin } = request;
  const email = normalizeEmail(request.email);
  const saved = await withAppErrors("invite to quest", () =>
    inTransaction(async (tx): Promise<SavedInvitation> => {
      const quest = await lockedSharableQuest(tx, inviter, questId);
      if (quest === undefined) {
        return { kind: "not-found" };
      }
      if (
        await isInQuest(tx, inviter, { questId, ownerId: quest.ownerId, email })
      ) {
        return { kind: "in-quest" };
      }
      // Only an invitation that would go out counts against the limit.
      if (!(await countQuestInvitation(tx, inviter, now))) {
        return { kind: "limited" };
      }
      const inviteeId = await findOrInviteAccount(tx, email);
      const token = newToken();
      const [tokenHash, accounts] = await Promise.all([
        hashToken(token),
        invitationAccounts(tx, {
          inviter,
          owner: quest.ownerId,
          invitee: inviteeId,
        }),
      ]);
      await savePendingInvitation(
        tx,
        { questId, inviteeId, inviterId: inviter },
        tokenHash,
        now,
      );
      return {
        kind: "pending",
        questName: quest.name,
        ...accounts,
        token,
        tokenHash,
      };
    }),
  );
  if (saved.kind !== "pending") {
    return saved;
  }
  const url = new URL(SIGN_IN_LINK_PATH, origin);
  url.searchParams.set("token", saved.token);
  try {
    await sendEmail(
      questInvitationEmail({
        to: email,
        url: url.href,
        questName: saved.questName,
        invitedBy: saved.invitedBy,
        owner: saved.owner,
        invitedAccount: saved.invitedAccount,
        idempotencyKey: `quest-invitation/${saved.tokenHash}`,
      }),
    );
  } catch (error) {
    logEmailFailure(emailProblem(error), "send quest invitation", error);
    return { kind: "unsent" };
  }
  return { kind: "invited" };
}

// The quest's owner, members and pending invitees, as user sees them;
// undefined unless the quest is open to user.
function listQuestPeople(
  user: UserId,
  questId: QuestId,
): Promise<QuestPeople | undefined> {
  return withAppErrors("list quest people", async () => {
    const db = getDb();
    const [[owner], members, invited] = await Promise.all([
      db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(quests)
        .innerJoin(users, eq(users.id, quests.userId))
        .where(and(eq(quests.id, questId), questOpenTo(user))),
      db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          joinedAt: questMembers.joinedAt,
        })
        .from(questMembers)
        .innerJoin(users, eq(users.id, questMembers.userId))
        .where(and(eq(questMembers.questId, questId), questMemberOpenTo(user)))
        .orderBy(asc(questMembers.joinedAt), asc(users.email)),
      db
        .select({
          id: users.id,
          email: users.email,
          invitedAt: questInvitations.createdAt,
        })
        .from(questInvitations)
        .innerJoin(users, eq(users.id, questInvitations.inviteeId))
        .where(
          and(
            eq(questInvitations.questId, questId),
            questInvitationOpenTo(user),
          ),
        )
        .orderBy(asc(questInvitations.createdAt), asc(users.email)),
    ]);
    if (owner === undefined) {
      return;
    }
    const ownerPerson = person(owner);
    if (ownerPerson === undefined) {
      return;
    }
    return {
      owner: ownerPerson,
      members: members.flatMap((row) => {
        const found = person(row);
        if (found === undefined) {
          return [];
        }
        return [{ ...found, joinedAt: row.joinedAt }];
      }),
      invited: invited.flatMap((row) => {
        const id = parseUserId(row.id);
        if (id === undefined) {
          return [];
        }
        return [{ id, displayName: row.email, invitedAt: row.invitedAt }];
      }),
    };
  });
}

// Removes someone from the quest, as user: a member, user included, or a
// pending invitee, whose invitation is withdrawn. Answers whether anyone
// was removed. The owner, a stranger to the quest, or a quest not open to
// user removes no one. What a removed member wrote stays in the quest; a
// reply their message is waiting for stops, so anyone left can ask for it
// again.
function removeFromQuest(
  user: UserId,
  request: { readonly questId: QuestId; readonly person: UserId },
): Promise<boolean> {
  return withAppErrors("remove from quest", () =>
    inTransaction(async (tx) => {
      const [member] = await tx
        .select({ userId: questMembers.userId })
        .from(questMembers)
        .where(
          and(
            eq(questMembers.questId, request.questId),
            eq(questMembers.userId, request.person),
            questMemberOpenTo(user),
          ),
        )
        .for("update");
      if (member !== undefined) {
        // Before the membership goes, while the quest is still open to
        // whoever removes, which may be the member leaving: a reply their
        // message awaits stops, and anyone left may ask for it again.
        await endRepliesOf(tx, user, {
          questId: request.questId,
          person: request.person,
        });
        await releaseRepliesOf(tx, user, {
          questId: request.questId,
          author: request.person,
        });
      }
      const members = await tx
        .delete(questMembers)
        .where(
          and(
            eq(questMembers.questId, request.questId),
            eq(questMembers.userId, request.person),
            questMemberOpenTo(user),
          ),
        )
        .returning({ userId: questMembers.userId });
      const invitations = await tx
        .delete(questInvitations)
        .where(
          and(
            eq(questInvitations.questId, request.questId),
            eq(questInvitations.inviteeId, request.person),
            questInvitationOpenTo(user),
          ),
        )
        .returning({ id: questInvitations.id });
      return members.length + invitations.length > 0;
    }),
  );
}

// The quests the user is invited to and hasn't accepted, newest invitation
// first.
function listPendingQuests(user: UserId): Promise<PendingQuest[]> {
  return withAppErrors("list pending quests", async () => {
    const rows = await getDb()
      .select({
        questId: quests.id,
        name: quests.name,
        status: quests.status,
        invitedAt: questInvitations.createdAt,
        inviterName: inviters.name,
        inviterEmail: inviters.email,
      })
      .from(questInvitations)
      .innerJoin(quests, eq(quests.id, questInvitations.questId))
      .leftJoin(inviters, eq(inviters.id, questInvitations.inviterId))
      .where(and(questInvitationTo(user), questPendingFor(user)))
      .orderBy(desc(questInvitations.createdAt), asc(quests.id));
    return rows.flatMap((row) => {
      const questId = parseQuestId(row.questId);
      if (questId === undefined) {
        return [];
      }
      let invitedBy: string | undefined;
      if (row.inviterEmail !== null) {
        invitedBy = displayName(row.inviterName, row.inviterEmail);
      }
      return [
        {
          questId,
          name: row.name,
          status: QUEST_STATUS.parse(row.status),
          invitedBy,
          invitedAt: row.invitedAt,
        },
      ];
    });
  });
}

// Accepts invitee's pending invitation to the quest inside tx, making them
// a member; answers whether there was one to accept. Their other
// invitations stay pending.
async function acceptInTransaction(
  tx: Transaction,
  invitee: UserId,
  questId: QuestId,
): Promise<boolean> {
  const accepted = await tx
    .delete(questInvitations)
    .where(
      and(eq(questInvitations.questId, questId), questInvitationTo(invitee)),
    )
    .returning({ id: questInvitations.id });
  if (accepted.length === 0) {
    return false;
  }
  await tx
    .insert(questMembers)
    .select(
      tx
        .select({
          questId: quests.id,
          userId: sql<string>`${invitee}::uuid`.as("user_id"),
          joinedAt: sql<Date>`now()`.as("joined_at"),
        })
        .from(quests)
        .where(and(eq(quests.id, questId), ne(quests.userId, invitee))),
    )
    .onConflictDoNothing();
  return true;
}

// Answers the user's pending invitation to the quest: accepting makes them
// a member, declining deletes it. Either way their other invitations stay
// pending. Answers whether there was an invitation to answer.
function answerInvitation(
  user: UserId,
  questId: QuestId,
  accept: boolean,
): Promise<boolean> {
  return withAppErrors("answer quest invitation", () =>
    inTransaction(async (tx) => {
      if (accept) {
        return acceptInTransaction(tx, user, questId);
      }
      const declined = await tx
        .delete(questInvitations)
        .where(
          and(eq(questInvitations.questId, questId), questInvitationTo(user)),
        )
        .returning({ id: questInvitations.id });
      return declined.length > 0;
    }),
  );
}

// The acceptance link holding the token, or undefined if it isn't one the
// site made, or has expired, been used, replaced or withdrawn. Opening a
// link reads it only.
async function readInvitationLink(
  token: string,
  now: Date,
): Promise<InvitationLink | undefined> {
  if (!TOKEN_FORMAT.test(token)) {
    return undefined;
  }
  const tokenHash = await hashToken(token);
  const [row] = await withAppErrors("read invitation link", () =>
    getDb()
      .select({
        questId: quests.id,
        questName: quests.name,
        inviteeId: users.id,
        inviteeEmail: users.email,
        accountState: users.accountState,
        inviterName: inviters.name,
        inviterEmail: inviters.email,
      })
      .from(questInvitations)
      .innerJoin(quests, eq(quests.id, questInvitations.questId))
      .innerJoin(users, eq(users.id, questInvitations.inviteeId))
      .leftJoin(inviters, eq(inviters.id, questInvitations.inviterId))
      .where(
        and(
          eq(questInvitations.tokenHash, tokenHash),
          gt(questInvitations.linkExpiresAt, now),
        ),
      ),
  );
  const questId = parseQuestId(row?.questId ?? "");
  const inviteeId = parseUserId(row?.inviteeId ?? "");
  if (row === undefined || questId === undefined || inviteeId === undefined) {
    return undefined;
  }
  let invitedBy: string | undefined;
  if (row.inviterEmail !== null) {
    invitedBy = displayName(row.inviterName, row.inviterEmail);
  }
  return {
    questId,
    questName: row.questName,
    invitedBy,
    inviteeEmail: row.inviteeEmail,
    inviteeId,
    needsName: row.accountState === "invited",
  };
}

// Continues from the acceptance link holding the token: completes an
// invited account's sign-up with name, accepts that one quest invitation,
// and answers the invitee to sign in. A signed-up invitee needs no name and
// keeps theirs. All or nothing.
async function acceptInvitationLink(
  token: string,
  now: Date,
  name: string,
): Promise<AcceptLinkResult> {
  if (!TOKEN_FORMAT.test(token)) {
    return { kind: "gone" };
  }
  const tokenHash = await hashToken(token);
  return withAppErrors("accept invitation link", () =>
    inTransaction(async (tx): Promise<AcceptLinkResult> => {
      const [row] = await tx
        .select({
          questId: questInvitations.questId,
          inviteeId: questInvitations.inviteeId,
        })
        .from(questInvitations)
        .where(
          and(
            eq(questInvitations.tokenHash, tokenHash),
            gt(questInvitations.linkExpiresAt, now),
          ),
        )
        .for("update");
      const questId = parseQuestId(row?.questId ?? "");
      const inviteeId = parseUserId(row?.inviteeId ?? "");
      if (questId === undefined || inviteeId === undefined) {
        return { kind: "gone" };
      }
      if ((await completeSignUpIn(tx, inviteeId, name)) === undefined) {
        return { kind: "needs-name" };
      }
      await acceptInTransaction(tx, inviteeId, questId);
      const [account] = await tx
        .select({ sessionEpoch: users.sessionEpoch })
        .from(users)
        .where(eq(users.id, inviteeId));
      if (account === undefined) {
        return { kind: "gone" };
      }
      return {
        kind: "accepted",
        user: { id: inviteeId, sessionEpoch: account.sessionEpoch },
        questId,
      };
    }),
  );
}

export type {
  AcceptLinkResult,
  InvitationLink,
  InviteResult,
  PendingQuest,
  QuestPeople,
  QuestPerson,
};
export {
  acceptInvitationLink,
  answerInvitation,
  inviteToQuest,
  listPendingQuests,
  listQuestPeople,
  readInvitationLink,
  removeFromQuest,
};
