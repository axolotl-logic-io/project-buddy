// The people in a project: its owner, who made it, and its members, who
// joined it. Everyone in a project shares its chats, memory, notes and
// progress timeline (src/accounts/owner-scope.ts). Every function takes the
// acting user first: only someone in the project sees who is in it, only
// its owner removes a member, and a member leaves only themselves. Leaving
// or removal ends the member's access at once; their past messages stay in
// the project's chats. A project that is unknown, or that the acting user
// may not touch, reads as having no one, and changes nothing.
import { and, asc, eq, type SQL, sql } from "drizzle-orm";
import { QueryBuilder } from "drizzle-orm/pg-core";
import {
  membershipOf,
  projectJoinableBy,
  projectMemberOpenTo,
  projectMemberOwnedBy,
  projectOpenTo,
  projectOwnedBy,
} from "@/accounts/owner-scope.ts";
import { getDb } from "@/db/client.ts";
import { projectMembers } from "@/db/tables/project-members.ts";
import { projects } from "@/db/tables/projects-and-chats.ts";
import { users } from "@/db/tables/users.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import { type ProjectId, parseUserId, type UserId } from "@/ids.ts";

// What someone is in a project: its owner, or a member.
type ProjectRole = "owner" | "member";

// Someone in a project, as its Members section lists them.
interface ProjectMember {
  readonly id: UserId;
  // What they asked the buddy to call them, or undefined if they have no
  // name.
  readonly name: string | undefined;
  // Their email address, for those who may see it: the project's owner sees
  // everyone's; a member sees the address only of someone with no name, so
  // they can still tell who it is. Undefined for anyone else.
  readonly email: string | undefined;
  readonly role: ProjectRole;
  // When they joined: for the owner, when they made the project.
  readonly joinedAt: Date;
}

interface MemberRow {
  readonly id: string;
  readonly name: string | null;
  readonly email: string | null;
  readonly joinedAt: Date;
}

// Rows as people with role. A row whose id is not a UUID is skipped, though
// the uuid column never holds one.
function toMembers(
  rows: readonly MemberRow[],
  role: ProjectRole,
): ProjectMember[] {
  return rows.flatMap(({ id, name, email, joinedAt }) => {
    const userId = parseUserId(id);
    if (userId === undefined) {
      return [];
    }
    return [
      {
        id: userId,
        name: name ?? undefined,
        email: email ?? undefined,
        role,
        joinedAt,
      },
    ];
  });
}

// Makes member a member of the project, and says whether they are one now,
// which they stay if they were already. False, with nothing saved, if the
// project is unknown or member's own. It checks nothing else: only
// accepting a project invitation, which the member says yes to, calls it.
async function addProjectMember(
  member: UserId,
  projectId: ProjectId,
): Promise<boolean> {
  const added = await withAppErrors("addProjectMember", () =>
    getDb()
      .insert(projectMembers)
      .select(
        new QueryBuilder()
          .select({
            projectId: sql`${projects.id}`.as("project_id"),
            userId: sql`${member}::uuid`.as("user_id"),
            joinedAt: sql`now()`.as("joined_at"),
          })
          .from(projects)
          .where(and(eq(projects.id, projectId), projectJoinableBy(member))),
      )
      // Setting the row's own time again makes `returning` give an existing
      // member's row too, so joining twice keeps the first time.
      .onConflictDoUpdate({
        target: [projectMembers.projectId, projectMembers.userId],
        set: { joinedAt: sql`${projectMembers.joinedAt}` },
      })
      .returning({ userId: projectMembers.userId }),
  );
  return added.length > 0;
}

// The address of the person in a users row, as user may see it: everyone's
// for the project's owner, and for a member only that of someone with no
// name. Null otherwise, so the address never leaves the database. The query
// reads the project's row.
function shownEmail(user: UserId): SQL<string | null> {
  return sql<
    string | null
  >`case when ${projectOwnedBy(user)} or ${users.name} is null then ${users.email} end`;
}

// Who is in the project: its owner first, then its members, longest-standing
// first, with only the addresses user may see (ProjectMember). No one if
// user is not in it.
async function listProjectMembers(
  user: UserId,
  projectId: ProjectId,
): Promise<ProjectMember[]> {
  const db = getDb();
  const [owners, members] = await withAppErrors("listProjectMembers", () =>
    db.batch([
      db
        .select({
          id: users.id,
          name: users.name,
          email: shownEmail(user),
          joinedAt: projects.createdAt,
        })
        .from(projects)
        .innerJoin(users, eq(users.id, projects.userId))
        .where(and(eq(projects.id, projectId), projectOpenTo(user))),
      db
        .select({
          id: users.id,
          name: users.name,
          email: shownEmail(user),
          joinedAt: projectMembers.joinedAt,
        })
        .from(projectMembers)
        .innerJoin(users, eq(users.id, projectMembers.userId))
        .innerJoin(projects, eq(projects.id, projectMembers.projectId))
        .where(
          and(
            eq(projectMembers.projectId, projectId),
            projectMemberOpenTo(user),
          ),
        )
        .orderBy(asc(projectMembers.joinedAt), asc(projectMembers.userId)),
    ]),
  );
  return [...toMembers(owners, "owner"), ...toMembers(members, "member")];
}

// Takes member out of owner's project. Removing someone who is not a
// member, or from a project that is not owner's, changes nothing.
async function removeProjectMember(
  owner: UserId,
  projectId: ProjectId,
  member: UserId,
): Promise<void> {
  await withAppErrors("removeProjectMember", () =>
    getDb()
      .delete(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, member),
          projectMemberOwnedBy(owner),
        ),
      ),
  );
}

// Takes member out of the project. Leaving a project they are not a member
// of, including their own, which its owner can't leave, changes nothing.
async function leaveProject(
  member: UserId,
  projectId: ProjectId,
): Promise<void> {
  await withAppErrors("leaveProject", () =>
    getDb()
      .delete(projectMembers)
      .where(
        and(eq(projectMembers.projectId, projectId), membershipOf(member)),
      ),
  );
}

export type { ProjectMember, ProjectRole };
export {
  addProjectMember,
  leaveProject,
  listProjectMembers,
  removeProjectMember,
};
