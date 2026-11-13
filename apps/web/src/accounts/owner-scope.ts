import { and, eq, exists, inArray, type SQL, sql } from "drizzle-orm";
import { QueryBuilder } from "drizzle-orm/pg-core";
import { batteryPurchases } from "@/db/tables/battery-purchases.ts";
import {
  constructAssetGrants,
  constructGenerations,
} from "@/db/tables/construct-visuals.ts";
import { goldBalances, goldLedger } from "@/db/tables/gold.ts";
import { imageGenerations } from "@/db/tables/image-generations.ts";
import { images } from "@/db/tables/images.ts";
import { milestones } from "@/db/tables/milestones.ts";
import { ownPrompts } from "@/db/tables/own-prompts.ts";
import { planVersions } from "@/db/tables/plan-versions.ts";
import { questIdeas } from "@/db/tables/quest-ideas.ts";
import { chats, messages, quests } from "@/db/tables/quests-and-chats.ts";
import { replyRuns } from "@/db/tables/reply-runs.ts";
import { replyUsage } from "@/db/tables/reply-usage.ts";
import { spellMessageResults } from "@/db/tables/spell-message-results.ts";
import { users } from "@/db/tables/users.ts";
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

// A `gold_balances` row of owner's: the gold owner's model calls spend.
function goldBalanceOwnedBy(owner: UserId): SQL {
  return eq(goldBalances.userId, owner);
}

// A `gold_ledger` row of owner's: a grant or historical transfer that
// changed owner's gold.
function goldLedgerOwnedBy(owner: UserId): SQL {
  return eq(goldLedger.userId, owner);
}

// An `image_generations` row that owner claimed, whose cost is owner's.
function constructGenerationOwnedBy(owner: UserId): SQL {
  return eq(constructGenerations.userId, owner);
}

function generationOwnedBy(owner: UserId): SQL {
  return eq(imageGenerations.userId, owner);
}

// An `image_generations` row of a chat open to user, whose image they may
// see, whoever claimed it.
function generationOpenTo(user: UserId): SQL {
  return inArray(imageGenerations.chatId, openChatIds(user));
}

// An owned destination grants access to the image identity metadata, but
// never another payer's costs.
function constructGenerationVisualOpenTo(user: UserId): SQL {
  return exists(
    new QueryBuilder()
      .select({ id: constructAssetGrants.id })
      .from(constructAssetGrants)
      .innerJoin(
        ownPrompts,
        eq(ownPrompts.id, constructAssetGrants.constructId),
      )
      .where(
        and(
          ownPromptOwnedBy(user),
          sql`${constructGenerations.visual}->'canonical'->>'assetId' = ${constructAssetGrants.assetId}::text`,
        ),
      ),
  );
}

function replyUsageOwnedBy(user: UserId): SQL {
  return eq(replyUsage.userId, user);
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

function accountOwnedBy(owner: UserId): SQL {
  return eq(users.id, owner);
}

function batteryPurchasesOwnedBy(owner: UserId): SQL {
  return eq(batteryPurchases.userId, owner);
}

export {
  accountOwnedBy,
  batteryPurchasesOwnedBy,
  chatOpenTo,
  constructGenerationOwnedBy,
  constructGenerationVisualOpenTo,
  generationOpenTo,
  generationOwnedBy,
  goldBalanceOwnedBy,
  goldLedgerOwnedBy,
  ideaOpenTo,
  imageOpenTo,
  messageOpenTo,
  milestoneOpenTo,
  ownPromptOwnedBy,
  ownsQuest,
  planVersionOpenTo,
  questOwnedBy,
  replyRunOpenTo,
  replyRunOwnedBy,
  replyUsageOwnedBy,
  spellResultOpenTo,
};
