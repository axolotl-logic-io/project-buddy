// The only access predicates: every query on user data builds its where
// from these, so a row that the acting user may not reach is never read or
// written, and a foreign id reads as not found, exactly as an unknown id
// does.
//
// A project belongs to its owner, the user who made it, and to no one else.
// Everything reached through a project is open to its owner alone: its
// chats, their messages, images and activity sessions, its memory (with its
// notes), its plan and its milestones. A standalone chat, which is in no
// project, and what is reached through it are open to the user the chat
// names alone. A historical project_members or project_invitations row
// grants nothing: no predicate reads either table. An own prompt, a
// construct or an activity, a gold balance and its ledger, an image
// generation's claim and a push subscription belong to their user alone,
// and an unread mark on a chat to the user it marks the chat for. A
// transfer of gold changes the payee's balance too, only by adding to it
// (goldBalancesOfTransfer).
//
// A Marketplace listing is the one row every signed-in user may read, by
// design, while it is listed: its name, kind, description, seller and
// price, never its parts. Only its seller updates or unlists it, and sees
// it once unlisted. Beside a listing, every signed-in user sees its
// seller's name and nothing else of theirs. A purchase is its buyer's; a
// seller counts the buyers of their listings without learning who they are.
//
// Each predicate is SQL for a where clause or a join, on the table it names.
import {
  and,
  eq,
  exists,
  inArray,
  isNull,
  ne,
  type SQL,
  sql,
} from "drizzle-orm";
import { QueryBuilder } from "drizzle-orm/pg-core";
import { activitySessions } from "@/db/tables/activity-sessions.ts";
import { batteryPurchases } from "@/db/tables/battery-purchases.ts";
import { chatUnreads } from "@/db/tables/chat-unreads.ts";
import {
  constructAssetGrants,
  constructGenerations,
} from "@/db/tables/construct-visuals.ts";
import { goldBalances, goldLedger } from "@/db/tables/gold.ts";
import { imageGenerations } from "@/db/tables/image-generations.ts";
import { images } from "@/db/tables/images.ts";
import { listings, purchases } from "@/db/tables/listings.ts";
import { memoryVersions } from "@/db/tables/memory-versions.ts";
import { milestones } from "@/db/tables/milestones.ts";
import { orbBalances, orbLedger } from "@/db/tables/orbs.ts";
import { ownPrompts } from "@/db/tables/own-prompts.ts";
import { planVersions } from "@/db/tables/plan-versions.ts";
import { chats, messages, projects } from "@/db/tables/projects-and-chats.ts";
import { pushSubscriptions } from "@/db/tables/push-subscriptions.ts";
import { questTransfers } from "@/db/tables/quest-transfers.ts";
import { replyRuns } from "@/db/tables/reply-runs.ts";
import { replyUsage } from "@/db/tables/reply-usage.ts";
import { users } from "@/db/tables/users.ts";
import type { ProjectId, UserId } from "@/ids.ts";

// A `projects` row of owner's: one owner made, which only they may read or
// change.
function projectOwnedBy(owner: UserId): SQL {
  return eq(projects.userId, owner);
}

// The ids of owner's projects, as a subquery, which drizzle parenthesizes.
function ownedProjectIds(owner: UserId): SQL {
  return sql`${new QueryBuilder()
    .select({ id: projects.id })
    .from(projects)
    .where(projectOwnedBy(owner))}`;
}

// A `chats` row open to user: a standalone chat of theirs, or a chat in a
// project of theirs.
function chatOpenTo(user: UserId): SQL {
  return sql`(${eq(chats.userId, user)} or ${inArray(chats.projectId, ownedProjectIds(user))})`;
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

// An `images` row of a chat open to user.
function imageOpenTo(user: UserId): SQL {
  return inArray(images.chatId, openChatIds(user));
}

// A `chat_unreads` row of owner's: owner's own mark on a chat, which no one
// else's opening clears.
function chatUnreadOwnedBy(owner: UserId): SQL {
  return eq(chatUnreads.userId, owner);
}

// An `activity_sessions` row of a chat open to user.
function activitySessionOpenTo(user: UserId): SQL {
  return inArray(activitySessions.chatId, openChatIds(user));
}

// A `memory_versions` row of a project of user's.
function memoryVersionOpenTo(user: UserId): SQL {
  return inArray(memoryVersions.projectId, ownedProjectIds(user));
}

// A `milestones` row of a project of user's.
function milestoneOpenTo(user: UserId): SQL {
  return inArray(milestones.projectId, ownedProjectIds(user));
}

// A `plan_versions` row of a project of user's.
function planVersionOpenTo(user: UserId): SQL {
  return inArray(planVersions.projectId, ownedProjectIds(user));
}

// True when the project is owner's, whatever table the query reads: for an
// insert … select, which writes a row only into a project of theirs.
function ownsProject(owner: UserId, projectId: ProjectId): SQL {
  return exists(
    new QueryBuilder()
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, projectId), projectOwnedBy(owner))),
  );
}

// A `buddies` (own prompts) row of owner's: an own prompt of owner's, a construct or an
// activity.
function ownPromptOwnedBy(owner: UserId): SQL {
  return eq(ownPrompts.userId, owner);
}

// An orb balance belongs to its user alone.
function orbBalanceOwnedBy(owner: UserId): SQL {
  return eq(orbBalances.userId, owner);
}
function orbBalancesOfTransfer(payer: UserId, payee: UserId): SQL {
  return inArray(orbBalances.userId, [payer, payee]);
}
function orbLedgerOwnedBy(owner: UserId): SQL {
  return eq(orbLedger.userId, owner);
}

// A `gold_balances` row of owner's: the gold owner's model calls spend.
function goldBalanceOwnedBy(owner: UserId): SQL {
  return eq(goldBalances.userId, owner);
}

// The `gold_balances` rows a transfer of gold from payer to payee changes:
// the payer's, which only they may pay from, and the payee's, which the
// transfer only adds to.
function goldBalancesOfTransfer(payer: UserId, payee: UserId): SQL {
  return inArray(goldBalances.userId, [payer, payee]);
}

// A `gold_ledger` row of owner's: a grant or transfer that changed owner's
// gold.
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

// A `push_subscriptions` row of owner's: a browser where owner turned
// notifications on.
function pushSubscriptionOwnedBy(owner: UserId): SQL {
  return eq(pushSubscriptions.userId, owner);
}

// A `listings` row that every signed-in user may read: one still listed in
// the Marketplace.
function listingListed(): SQL {
  return isNull(listings.unlistedAt);
}

// A `listings` row of seller's, which only seller may update or unlist.
function listingSoldBy(seller: UserId): SQL {
  return eq(listings.sellerId, seller);
}

// A `listings` row that user may read: a listed one, or their own, listed
// or not.
function listingOpenTo(user: UserId): SQL {
  return sql`(${listingListed()} or ${listingSoldBy(user)})`;
}

// A `listings` row that buyer may buy: a listed one of someone else's.
function listingBuyableBy(buyer: UserId): SQL {
  return sql`(${listingListed()} and ${ne(listings.sellerId, buyer)})`;
}

// A `users` row that is the seller of the `listings` row it is joined to:
// for reading the seller's name, which every signed-in user may see beside
// a listing they may read, and nothing else of theirs.
function sellerOfListing(): SQL {
  return eq(users.id, listings.sellerId);
}

// A `purchases` row of buyer's: a listing they bought.
function purchaseMadeBy(buyer: UserId): SQL {
  return eq(purchases.buyerId, buyer);
}

// A `purchases` row of one of seller's listings, which seller may count.
function purchaseOfListingSoldBy(seller: UserId): SQL {
  return inArray(
    purchases.listingId,
    sql`${new QueryBuilder()
      .select({ id: listings.id })
      .from(listings)
      .where(listingSoldBy(seller))}`,
  );
}

// An owned destination grants access to the image identity metadata, including
// a bought copy's original description, but never another payer's costs.
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

function questTransferOwnedBy(user: UserId): SQL {
  return sql`(${eq(questTransfers.userId, user)} and ${inArray(questTransfers.sourceChatId, new QueryBuilder().select({ id: chats.id }).from(chats).where(chatOpenTo(user)))})`;
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
  activitySessionOpenTo,
  batteryPurchasesOwnedBy,
  chatOpenTo,
  chatUnreadOwnedBy,
  constructGenerationOwnedBy,
  constructGenerationVisualOpenTo,
  generationOpenTo,
  generationOwnedBy,
  goldBalanceOwnedBy,
  goldBalancesOfTransfer,
  goldLedgerOwnedBy,
  imageOpenTo,
  listingBuyableBy,
  listingListed,
  listingOpenTo,
  listingSoldBy,
  memoryVersionOpenTo,
  messageOpenTo,
  milestoneOpenTo,
  orbBalanceOwnedBy,
  orbBalancesOfTransfer,
  orbLedgerOwnedBy,
  ownPromptOwnedBy,
  ownsProject,
  planVersionOpenTo,
  projectOwnedBy,
  purchaseMadeBy,
  purchaseOfListingSoldBy,
  pushSubscriptionOwnedBy,
  questTransferOwnedBy,
  replyRunOpenTo,
  replyRunOwnedBy,
  replyUsageOwnedBy,
  sellerOfListing,
};
