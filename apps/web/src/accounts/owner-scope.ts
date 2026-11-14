import { and, eq, exists, inArray, type SQL, sql } from "drizzle-orm";
import { QueryBuilder } from "drizzle-orm/pg-core";
import { constructGenerations } from "@/db/tables/construct-visuals.ts";
import { imageGenerations } from "@/db/tables/image-generations.ts";
import { images } from "@/db/tables/images.ts";
import { milestones } from "@/db/tables/milestones.ts";
import { ownPrompts } from "@/db/tables/own-prompts.ts";
import { planVersions } from "@/db/tables/plan-versions.ts";
import { questIdeas } from "@/db/tables/quest-ideas.ts";
import { questNotes } from "@/db/tables/quest-notes.ts";
import { chats, messages, quests } from "@/db/tables/quests-and-chats.ts";
import { replyRuns } from "@/db/tables/reply-runs.ts";
import { spellMessageResults } from "@/db/tables/spell-message-results.ts";
import type { QuestId, UserId } from "@/ids.ts";

// A `quests` row of owner's: one owner made, which only they may read or
// change.
function questOwnedBy(owner: UserId): SQL {
  return eq(quests.userId, owner);
}

// The ids of owner's quests, as a subquery, which drizzle parenthesizes.
function ownedQuestIds(owner: UserId): SQL {
  return sql`${new QueryBuilder()
    .select({ id: quests.id })
    .from(quests)
    .where(questOwnedBy(owner))}`;
}

// A `chats` row open to user: a standalone chat of theirs, or a chat in a
// quest of theirs.
function chatOpenTo(user: UserId): SQL {
  return sql`(${eq(chats.userId, user)} or ${inArray(chats.questId, ownedQuestIds(user))})`;
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

// A `milestones` row of a quest of user's.
function milestoneOpenTo(user: UserId): SQL {
  return inArray(milestones.questId, ownedQuestIds(user));
}

// A `plan_versions` row of a quest of user's.
function planVersionOpenTo(user: UserId): SQL {
  return inArray(planVersions.questId, ownedQuestIds(user));
}

function ideaOpenTo(user: UserId): SQL {
  return inArray(questIdeas.questId, ownedQuestIds(user));
}

// A `quest_notes` row of a quest of user's.
function noteOpenTo(user: UserId): SQL {
  return inArray(questNotes.questId, ownedQuestIds(user));
}

// True when the quest is owner's, whatever table the query reads: for an
// insert … select, which writes a row only into a quest of theirs.
function ownsQuest(owner: UserId, questId: QuestId): SQL {
  return exists(
    new QueryBuilder()
      .select({ id: quests.id })
      .from(quests)
      .where(and(eq(quests.id, questId), questOwnedBy(owner))),
  );
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
  ownPromptOwnedBy,
  ownsQuest,
  planVersionOpenTo,
  questOwnedBy,
  replyRunOpenTo,
  replyRunOwnedBy,
  spellResultOpenTo,
};
