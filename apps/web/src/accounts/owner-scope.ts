// The only access predicates: every query on user data builds its where
// from these, so a row that the acting user may not reach is never read or
// written, and a foreign id reads as not found, exactly as an unknown id
// does.
//
// A quest belongs to its owner, the user who made it, and is open to its
// owner and its accepted members (quest_members). Everything reached
// through a quest is open to everyone the quest is open to: its lists and
// their list items and changes, its tallies' totals on each date, its
// performances and their messages, and the quest's members and pending
// invitations, which any of them may see, add to or remove. The owner is never a member row, so no one can remove
// them. The quest's day starts at midnight in its owner's time zone, so
// reading a quest reads its owner's time zone too
// (src/lists/quest-today.ts), which names no one.
//
// A pending quest invitation is not membership: it opens nothing of the
// quest to its invitee but the quest's name, the inviter's name and the
// invitation itself, which the invitee alone may accept or decline.
//
// Own rites belong to their user alone, and so do events and a timer
// presence report, with one exception: everyone a quest is open to may see
// the dates its tasks were checked off, which give the tasks' streaks
// (src/streaks/streak-store.ts), and never who checked them off. The other
// read across users is how many other accounts follow a schedule, a count
// that names no one and reaches no quest (src/timer/presence-store.ts). A performance keeps a snapshot of its
// rite, so a member sees the snapshot of an own rite used in the quest,
// never the rite itself.
//
// Each predicate is SQL for a where clause or a join, on the table it names.
import { and, eq, exists, inArray, type SQL, sql } from "drizzle-orm";
import { QueryBuilder } from "drizzle-orm/pg-core";
import { events } from "@/db/tables/events.ts";
import { listChanges } from "@/db/tables/list-changes.ts";
import { listItems, lists } from "@/db/tables/lists.ts";
import {
  performanceMessages,
  performances,
  rites,
} from "@/db/tables/performances.ts";
import { questInvitations, questMembers } from "@/db/tables/quest-members.ts";
import { quests } from "@/db/tables/quests.ts";
import { signedInDays } from "@/db/tables/signed-in-days.ts";
import { tallyDays } from "@/db/tables/tallies.ts";
import { timerPresence } from "@/db/tables/timer-presence.ts";
import type { QuestId, UserId } from "@/ids.ts";

// A `quests` row of owner's: one owner made.
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

function listOpenTo(user: UserId): SQL {
  return inArray(lists.questId, openQuestIds(user));
}

function listItemOpenTo(user: UserId): SQL {
  return inArray(listItems.questId, openQuestIds(user));
}

// A `tally_days` row of a quest open to user: a tally's total on a date,
// which everyone in the quest may see and change.
function tallyDayOpenTo(user: UserId): SQL {
  return inArray(tallyDays.questId, openQuestIds(user));
}

function performanceOpenTo(user: UserId): SQL {
  return inArray(performances.questId, openQuestIds(user));
}

function performanceMessageOpenTo(user: UserId): SQL {
  return inArray(
    performanceMessages.performanceId,
    new QueryBuilder()
      .select({ id: performances.id })
      .from(performances)
      .where(performanceOpenTo(user)),
  );
}

function riteOwnedBy(user: UserId): SQL {
  return eq(rites.userId, user);
}

function listChangeOpenTo(user: UserId): SQL {
  return inArray(
    listChanges.listId,
    new QueryBuilder()
      .select({ id: lists.id })
      .from(lists)
      .where(listOpenTo(user)),
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

// An event's counts belong to the user who gained them, whatever quest
// they gained them in.
function eventOwnedBy(owner: UserId): SQL {
  return eq(events.userId, owner);
}

// A checking-off event in a quest open to user, for its task's streak:
// read its task and date alone, never who gained it.
function checkOffInQuestOpenTo(user: UserId): SQL {
  return sql`(${eq(events.event, "checking-off")} and ${inArray(
    events.questId,
    openQuestIds(user),
  )})`;
}

// A visiting date belongs to its account alone, regardless of membership.
function signedInDayOwnedBy(owner: UserId): SQL {
  return eq(signedInDays.userId, owner);
}

export {
  checkOffInQuestOpenTo,
  eventOwnedBy,
  listChangeOpenTo,
  listItemOpenTo,
  listOpenTo,
  opensQuest,
  performanceMessageOpenTo,
  performanceOpenTo,
  questInvitationOpenTo,
  questInvitationTo,
  questMemberOpenTo,
  questOpenTo,
  questOwnedBy,
  questPendingFor,
  riteOwnedBy,
  signedInDayOwnedBy,
  tallyDayOpenTo,
  timerPresenceOwnedBy,
};
