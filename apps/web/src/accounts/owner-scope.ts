// The only access predicates: every query on user data builds its where
// from these, so a row that the acting user may not reach is never read or
// written, and a foreign id reads as not found, exactly as an unknown id
// does.
//
// A project belongs to its owner, the user who made it, and is open to its
// owner and its members (project_members), who share it as a team project.
// Everything reached through a project is open to everyone the project is
// open to: its chats, their messages, images and activity sessions, its
// memory (with its notes) and its milestones. Actions only the owner may
// take, such as setting check-ins or removing a member, use the "owned"
// predicates instead. A standalone chat, which is in no project, and what
// is reached through it are open to the user the chat names alone. An own
// prompt, a buddy or an activity, a month's spend, an image generation's
// claim and a push subscription belong to their user alone.
//
// Each predicate is SQL for a where clause or a join, on the table it names.
import { and, eq, exists, inArray, ne, type SQL, sql } from "drizzle-orm";
import { QueryBuilder } from "drizzle-orm/pg-core";
import { activitySessions } from "@/db/tables/activity-sessions.ts";
import { buddies } from "@/db/tables/buddies.ts";
import { imageGenerations } from "@/db/tables/image-generations.ts";
import { images } from "@/db/tables/images.ts";
import { memoryVersions } from "@/db/tables/memory-versions.ts";
import { milestones } from "@/db/tables/milestones.ts";
import { monthlySpend } from "@/db/tables/monthly-spend.ts";
import { projectMembers } from "@/db/tables/project-members.ts";
import { chats, messages, projects } from "@/db/tables/projects-and-chats.ts";
import { pushSubscriptions } from "@/db/tables/push-subscriptions.ts";
import type { ProjectId, UserId } from "@/ids.ts";

// A `projects` row of owner's: one owner made, which only they may manage.
function projectOwnedBy(owner: UserId): SQL {
  return eq(projects.userId, owner);
}

// A `projects` row open to user: their own, or a team project they are a
// member of.
function projectOpenTo(user: UserId): SQL {
  return sql`(${projectOwnedBy(user)} or ${exists(
    new QueryBuilder()
      .select({ projectId: projectMembers.projectId })
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, projects.id),
          eq(projectMembers.userId, user),
        ),
      ),
  )})`;
}

// The ids of owner's projects, as a subquery, which drizzle parenthesizes.
function ownedProjectIds(owner: UserId): SQL {
  return sql`${new QueryBuilder()
    .select({ id: projects.id })
    .from(projects)
    .where(projectOwnedBy(owner))}`;
}

// The ids of the projects open to user, as a subquery.
function openProjectIds(user: UserId): SQL {
  return sql`${new QueryBuilder()
    .select({ id: projects.id })
    .from(projects)
    .where(projectOpenTo(user))}`;
}

// A `chats` row open to user: a standalone chat of theirs, or a chat in a
// project open to them.
function chatOpenTo(user: UserId): SQL {
  return sql`(${eq(chats.userId, user)} or ${inArray(chats.projectId, openProjectIds(user))})`;
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

// An `activity_sessions` row of a chat open to user.
function activitySessionOpenTo(user: UserId): SQL {
  return inArray(activitySessions.chatId, openChatIds(user));
}

// A `memory_versions` row of a project open to user.
function memoryVersionOpenTo(user: UserId): SQL {
  return inArray(memoryVersions.projectId, openProjectIds(user));
}

// A `milestones` row of a project open to user.
function milestoneOpenTo(user: UserId): SQL {
  return inArray(milestones.projectId, openProjectIds(user));
}

// True when the project is open to user, whatever table the query reads:
// for an insert … select, which writes a row only into a project open to
// them.
function opensProject(user: UserId, projectId: ProjectId): SQL {
  return exists(
    new QueryBuilder()
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, projectId), projectOpenTo(user))),
  );
}

// A `projects` row that user could join as a member: any project but their
// own. Only accepting a project invitation joins one.
function projectJoinableBy(user: UserId): SQL {
  return ne(projects.userId, user);
}

// A `project_members` row of a project open to user, who may see who else
// is in it.
function projectMemberOpenTo(user: UserId): SQL {
  return inArray(projectMembers.projectId, openProjectIds(user));
}

// A `project_members` row of one of owner's projects, which owner may
// remove.
function projectMemberOwnedBy(owner: UserId): SQL {
  return inArray(projectMembers.projectId, ownedProjectIds(owner));
}

// A `project_members` row that makes user a member, which user may leave.
function membershipOf(user: UserId): SQL {
  return eq(projectMembers.userId, user);
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

// An `image_generations` row that owner claimed, whose cost is owner's.
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

export {
  activitySessionOpenTo,
  chatOpenTo,
  generationOpenTo,
  generationOwnedBy,
  imageOpenTo,
  membershipOf,
  memoryVersionOpenTo,
  messageOpenTo,
  milestoneOpenTo,
  monthlySpendOwnedBy,
  opensProject,
  ownPromptOwnedBy,
  projectJoinableBy,
  projectMemberOpenTo,
  projectMemberOwnedBy,
  projectOpenTo,
  projectOwnedBy,
  pushSubscriptionOwnedBy,
};
