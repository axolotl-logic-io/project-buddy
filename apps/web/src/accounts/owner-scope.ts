// The only access predicates: every query on user data builds its where
// from these, so a row that the acting user may not reach is never read or
// written, and a foreign id reads as not found, exactly as an unknown id
// does.
//
// A quest belongs to its owner, the user who made it, and is open to its
// owner and its accepted members (quest_members). Everything reached
// through a quest is open to everyone the quest is open to: its
// conversation, the conversation's messages, images, spell results and
// reply runs, its Tasks, Ideas, milestones and Quick Notes, and the quest's
// members and pending invitations, which any of them may see, add to or
// remove. The owner is never a member row, so no one can remove them. The
// one action left to the owner alone is finding a quest as their Dailies.
//
// A pending quest invitation is not membership: it opens nothing of the
// quest to its invitee but the quest's name, the inviter's name and the
// invitation itself, which the invitee alone may accept or decline.
//
// Own prompts (constructs and spells) and image generation claims belong to
// their user alone. So does a timer presence report; the one read across
// users is how many other accounts follow a schedule, a count that names no
// one and reaches no quest (src/timer/presence-store.ts).
//
// A conversation keeps a snapshot of its construct and its active spell, so
// a member sees the snapshot of an own construct or spell used in the
// quest, never the definition itself.
//
// Each predicate is SQL for a where clause or a join, on the table it names.
import { and, eq, exists, inArray, type SQL, sql } from "drizzle-orm";
import { QueryBuilder } from "drizzle-orm/pg-core";
import { constructGenerations } from "@/db/tables/construct-visuals.ts";
import { imageGenerations } from "@/db/tables/image-generations.ts";
import { images } from "@/db/tables/images.ts";
import { milestones } from "@/db/tables/milestones.ts";
import { ownPrompts } from "@/db/tables/own-prompts.ts";
import { questIdeas } from "@/db/tables/quest-ideas.ts";
import { questInvitations, questMembers } from "@/db/tables/quest-members.ts";
import { questNotes } from "@/db/tables/quest-notes.ts";
import { chats, messages, quests } from "@/db/tables/quests-and-chats.ts";
import { replyRuns } from "@/db/tables/reply-runs.ts";
import { spellMessageResults } from "@/db/tables/spell-message-results.ts";
import { tasksVersions } from "@/db/tables/tasks-versions.ts";
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

// A `chats` row open to user: a chat in a quest open to them. A standalone
// chat that an older build made is open to no one.
function chatOpenTo(user: UserId): SQL {
  return inArray(chats.questId, openQuestIds(user));
}

// The ids of the chats open to user, as a subquery.
function openChatIds(user: UserId): SQL {
  return sql`${new QueryBuilder()
    .select({ id: chats.id })
    .from(chats)
    .where(chatOpenTo(user))}`;
}

// A `messages` row in a chat open to user.
function messageOpenTo(user: UserId): SQL {
  return inArray(messages.chatId, openChatIds(user));
}

function spellResultOpenTo(user: UserId): SQL {
  return inArray(spellMessageResults.chatId, openChatIds(user));
}

// An `images` row of a chat open to user.
function imageOpenTo(user: UserId): SQL {
  return inArray(images.chatId, openChatIds(user));
}

// A `milestones` row of a quest open to user.
function milestoneOpenTo(user: UserId): SQL {
  return inArray(milestones.questId, openQuestIds(user));
}

// A `tasks_versions` row of a quest open to user.
function tasksVersionOpenTo(user: UserId): SQL {
  return inArray(tasksVersions.questId, openQuestIds(user));
}

// A `quest_ideas` row of a quest open to user.
function ideaOpenTo(user: UserId): SQL {
  return inArray(questIdeas.questId, openQuestIds(user));
}

// A `quest_notes` row of a quest open to user.
function noteOpenTo(user: UserId): SQL {
  return inArray(questNotes.questId, openQuestIds(user));
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

function ownPromptOwnedBy(owner: UserId): SQL {
  return eq(ownPrompts.userId, owner);
}

// An `image_generations` row that owner claimed, whose cost is owner's.
function constructGenerationOwnedBy(owner: UserId): SQL {
  return eq(constructGenerations.userId, owner);
}

// An `image_generations` row of a chat open to user, whose image they may
// see, whoever claimed it.
function generationOpenTo(user: UserId): SQL {
  return inArray(imageGenerations.chatId, openChatIds(user));
}

function replyRunOpenTo(user: UserId): SQL {
  return inArray(
    replyRuns.chatId,
    new QueryBuilder()
      .select({ id: chats.id })
      .from(chats)
      .where(chatOpenTo(user)),
  );
}

// A `timer_presence` row of owner's: their own report.
function timerPresenceOwnedBy(owner: UserId): SQL {
  return eq(timerPresence.userId, owner);
}

function replyRunOwnedBy(user: UserId): SQL {
  return and(replyRunOpenTo(user), eq(replyRuns.userId, user)) ?? sql`false`;
}

export {
  chatOpenTo,
  constructGenerationOwnedBy,
  generationOpenTo,
  ideaOpenTo,
  imageOpenTo,
  messageOpenTo,
  milestoneOpenTo,
  noteOpenTo,
  opensQuest,
  ownPromptOwnedBy,
  questInvitationOpenTo,
  questInvitationTo,
  questMemberOpenTo,
  questOpenTo,
  questOwnedBy,
  questPendingFor,
  replyRunOpenTo,
  replyRunOwnedBy,
  spellResultOpenTo,
  tasksVersionOpenTo,
  timerPresenceOwnedBy,
};
