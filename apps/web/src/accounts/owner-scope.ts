// Access predicates for quests and the records reached through them.
// Pending invitations grant access to the invitation, while rites and days
// are personal to their owner.
import { and, eq, exists, inArray, type SQL, sql } from "drizzle-orm";
import { QueryBuilder } from "drizzle-orm/pg-core";
import { conjurations, performances, rites } from "@/db/tables/performances.ts";
import { questDays } from "@/db/tables/quest-days.ts";
import { questInvitations, questMembers } from "@/db/tables/quest-members.ts";
import { quests } from "@/db/tables/quests.ts";
import { signedInDays } from "@/db/tables/signed-in-days.ts";
import { spaceChanges } from "@/db/tables/space-changes.ts";
import { murmlings, spaces } from "@/db/tables/spaces.ts";
import { timerPresence } from "@/db/tables/timer-presence.ts";
import type { QuestId, UserId } from "@/ids.ts";

// A `quests` row of owner's: one owner made, which only they may use as
// their Dailies.
function questOwnedBy(owner: UserId): SQL {
  return eq(quests.userId, owner);
}

// A `quests` row open to user: their own, or one they accepted an
// invitation to.
function questOpenTo(user: UserId): SQL {
  return sql`(${questOwnedBy(user)} or ${exists(
    new QueryBuilder()
      .select({ questId: questMembers.questId })
      .from(questMembers)
      .where(
        and(eq(questMembers.questId, quests.id), eq(questMembers.userId, user)),
      ),
  )})`;
}

// The ids of the quests open to user, as a subquery, which drizzle
// parenthesizes.
function openQuestIds(user: UserId): SQL {
  return sql`${new QueryBuilder()
    .select({ id: quests.id })
    .from(quests)
    .where(questOpenTo(user))}`;
}

// A `quests` row that invitee has a pending invitation to: open to them
// for its name alone, in Pending, until they accept it.
function questPendingFor(invitee: UserId): SQL {
  return exists(
    new QueryBuilder()
      .select({ id: questInvitations.id })
      .from(questInvitations)
      .where(
        and(
          eq(questInvitations.questId, quests.id),
          eq(questInvitations.inviteeId, invitee),
        ),
      ),
  );
}

function spaceOpenTo(user: UserId): SQL {
  return inArray(spaces.questId, openQuestIds(user));
}

function murmlingOpenTo(user: UserId): SQL {
  return inArray(murmlings.questId, openQuestIds(user));
}

function performanceOpenTo(user: UserId): SQL {
  return inArray(performances.questId, openQuestIds(user));
}

function conjurationOpenTo(user: UserId): SQL {
  return inArray(
    conjurations.performanceId,
    new QueryBuilder()
      .select({ id: performances.id })
      .from(performances)
      .where(performanceOpenTo(user)),
  );
}

function riteOwnedBy(user: UserId): SQL {
  return eq(rites.userId, user);
}

function spaceChangeOpenTo(user: UserId): SQL {
  return inArray(
    spaceChanges.spaceId,
    new QueryBuilder()
      .select({ id: spaces.id })
      .from(spaces)
      .where(spaceOpenTo(user)),
  );
}

function questDayOwnedBy(user: UserId): SQL {
  return inArray(
    questDays.questId,
    new QueryBuilder()
      .select({ id: quests.id })
      .from(quests)
      .where(questOwnedBy(user)),
  );
}

// True when the quest is open to user, whatever table the query reads: for
// an insert … select, which writes a row only into a quest open to them.
function opensQuest(user: UserId, questId: QuestId): SQL {
  return exists(
    new QueryBuilder()
      .select({ id: quests.id })
      .from(quests)
      .where(and(eq(quests.id, questId), questOpenTo(user))),
  );
}

// A `quest_members` row of a quest open to user, who may see the member
// and remove them, themselves included.
function questMemberOpenTo(user: UserId): SQL {
  return inArray(questMembers.questId, openQuestIds(user));
}

// A `quest_invitations` row of a quest open to user, who may see it, send
// it again or withdraw it.
function questInvitationOpenTo(user: UserId): SQL {
  return inArray(questInvitations.questId, openQuestIds(user));
}

// A `quest_invitations` row to invitee, which invitee alone may accept or
// decline.
function questInvitationTo(invitee: UserId): SQL {
  return eq(questInvitations.inviteeId, invitee);
}

// A `timer_presence` row of owner's: their own report.
function timerPresenceOwnedBy(owner: UserId): SQL {
  return eq(timerPresence.userId, owner);
}

// A visiting date belongs to its account alone, regardless of membership.
function signedInDayOwnedBy(owner: UserId): SQL {
  return eq(signedInDays.userId, owner);
}

export {
  conjurationOpenTo,
  murmlingOpenTo,
  opensQuest,
  performanceOpenTo,
  questDayOwnedBy,
  questInvitationOpenTo,
  questInvitationTo,
  questMemberOpenTo,
  questOpenTo,
  questOwnedBy,
  questPendingFor,
  riteOwnedBy,
  signedInDayOwnedBy,
  spaceChangeOpenTo,
  spaceOpenTo,
  timerPresenceOwnedBy,
};
