// The only ownership predicates: every query on user data builds its where
// from these, so a row of another user's is never read or written, and a
// foreign id reads as not found, exactly as an unknown id does. A project
// belongs to its user; its chats, their messages and its memory belong to
// the project's user, reached through the project; a standalone chat, which
// is in no project, and its messages belong to the user the chat names; a
// chat's activity sessions belong to the chat's owner; an own prompt, a buddy
// or an activity, belongs to its user. Each predicate is SQL for a where clause or a join, on
// the table it names.
import { and, eq, exists, inArray, type SQL, sql } from "drizzle-orm";
import { QueryBuilder } from "drizzle-orm/pg-core";
import { activitySessions } from "@/db/tables/activity-sessions.ts";
import { buddies } from "@/db/tables/buddies.ts";
import { imageGenerations } from "@/db/tables/image-generations.ts";
import { images } from "@/db/tables/images.ts";
import { memoryVersions } from "@/db/tables/memory-versions.ts";
import { monthlySpend } from "@/db/tables/monthly-spend.ts";
import { chats, messages, projects } from "@/db/tables/projects-and-chats.ts";
import type { ProjectId, UserId } from "@/ids.ts";

// The ids of owner's projects, as a subquery, which drizzle parenthesizes.
function ownedProjectIds(owner: UserId): SQL {
  return sql`${new QueryBuilder()
    .select({ id: projects.id })
    .from(projects)
    .where(projectOwnedBy(owner))}`;
}

// The ids of owner's chats, as a subquery, which drizzle parenthesizes.
function ownedChatIds(owner: UserId): SQL {
  return sql`${new QueryBuilder()
    .select({ id: chats.id })
    .from(chats)
    .where(chatOwnedBy(owner))}`;
}

// A `projects` row of owner's.
function projectOwnedBy(owner: UserId): SQL {
  return eq(projects.userId, owner);
}

// A `chats` row of owner's: a standalone chat of owner's, or a chat in one
// of owner's projects.
function chatOwnedBy(owner: UserId): SQL {
  return sql`(${eq(chats.userId, owner)} or ${inArray(chats.projectId, ownedProjectIds(owner))})`;
}

// A `messages` row in one of owner's chats.
function messageOwnedBy(owner: UserId): SQL {
  return inArray(messages.chatId, ownedChatIds(owner));
}

// An `activity_sessions` row of one of owner's chats.
function activitySessionOwnedBy(owner: UserId): SQL {
  return inArray(activitySessions.chatId, ownedChatIds(owner));
}

// A `memory_versions` row of one of owner's projects.
function memoryVersionOwnedBy(owner: UserId): SQL {
  return inArray(memoryVersions.projectId, ownedProjectIds(owner));
}

// A `monthly_spend` row of owner's: what owner's Claude calls cost in one
// month.
function monthlySpendOwnedBy(owner: UserId): SQL {
  return eq(monthlySpend.userId, owner);
}

// A `buddies` row of owner's: an own prompt of owner's, a buddy or an
// activity.
function ownPromptOwnedBy(owner: UserId): SQL {
  return eq(buddies.userId, owner);
}

// True when the project is owner's, whatever table the query reads: for an
// insert … select, which writes a row only into what owner owns.
function ownsProject(owner: UserId, projectId: ProjectId): SQL {
  return exists(
    new QueryBuilder()
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, projectId), projectOwnedBy(owner))),
  );
}

function imageOwnedBy(owner: UserId): SQL {
  return inArray(images.chatId, ownedChatIds(owner));
}

function generationOwnedBy(owner: UserId): SQL {
  return eq(imageGenerations.userId, owner);
}

export {
  activitySessionOwnedBy,
  chatOwnedBy,
  generationOwnedBy,
  imageOwnedBy,
  memoryVersionOwnedBy,
  messageOwnedBy,
  monthlySpendOwnedBy,
  ownPromptOwnedBy,
  ownsProject,
  projectOwnedBy,
};
