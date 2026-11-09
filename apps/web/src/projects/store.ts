// Projects, stored in Postgres. A project is its owner's, and open to its
// owner and its members (src/accounts/owner-scope.ts): every function takes
// the acting user first and reads only the projects open to them. An id
// from outside the code, such as a route parameter, is looked up as a
// string; anything malformed, unknown or not open to the user is not found.
import { and, desc, eq, exists, type SQL, sql } from "drizzle-orm";
import { QueryBuilder } from "drizzle-orm/pg-core";
import { projectOpenTo, projectOwnedBy } from "@/accounts/owner-scope.ts";
import { getDb } from "@/db/client.ts";
import { projectMembers } from "@/db/tables/project-members.ts";
import { projects } from "@/db/tables/projects-and-chats.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import { type ProjectId, parseProjectId, type UserId } from "@/ids.ts";
import type { ProjectRole } from "@/projects/members-store.ts";
import type { ProjectName } from "@/projects/project-name.ts";
import { QUEST_STATUS, type QuestStatus } from "@/projects/quest-status.ts";

interface Project {
  id: ProjectId;
  name: string;
  createdAt: Date;
  status: QuestStatus;
  statusRevision: number;
  // What the acting user is in the project: its owner or a member.
  role: ProjectRole;
  // Whether it is a team project: one with members besides its owner.
  shared: boolean;
}

interface ProjectRow {
  readonly id: string;
  readonly name: string;
  readonly createdAt: Date;
  readonly status: string;
  readonly statusRevision: number;
  readonly owned: boolean;
  readonly shared: boolean;
}

// The columns a project is read from, for the acting user. Select only the
// fields this store uses, so a later release can drop retired columns while
// this build is still live.
function projectColumns(user: UserId): {
  readonly status: typeof projects.status;
  readonly statusRevision: typeof projects.statusRevision;
  readonly id: typeof projects.id;
  readonly name: typeof projects.name;
  readonly createdAt: typeof projects.createdAt;
  readonly owned: SQL<boolean>;
  readonly shared: SQL<boolean>;
} {
  return {
    status: projects.status,
    statusRevision: projects.statusRevision,
    id: projects.id,
    name: projects.name,
    createdAt: projects.createdAt,
    owned: sql<boolean>`${projectOwnedBy(user)}`,
    shared: sql<boolean>`${exists(
      new QueryBuilder()
        .select({ userId: projectMembers.userId })
        .from(projectMembers)
        .where(eq(projectMembers.projectId, projects.id)),
    )}`,
  };
}

function roleOf(owned: boolean): ProjectRole {
  if (owned) {
    return "owner";
  }
  return "member";
}

// Rows as projects. A row whose id is not a UUID is skipped, though the uuid
// column never holds one.
function toProjects(rows: readonly ProjectRow[]): Project[] {
  return rows.flatMap(
    ({ id, name, createdAt, owned, shared, status, statusRevision }) => {
      const projectId = parseProjectId(id);
      if (projectId === undefined) {
        return [];
      }
      return [
        {
          id: projectId,
          name,
          createdAt,
          role: roleOf(owned),
          shared,
          status: QUEST_STATUS.parse(status),
          statusRevision,
        },
      ];
    },
  );
}

export type { Project };

// The projects open to the user, their own and those they are a member of,
// newest first.
export function listProjects(user: UserId): Promise<Project[]> {
  return withAppErrors("listProjects", async () =>
    toProjects(
      await getDb()
        .select(projectColumns(user))
        .from(projects)
        .where(projectOpenTo(user))
        .orderBy(desc(projects.createdAt)),
    ),
  );
}

// The project with this id open to the user, or undefined if the id is
// malformed, unknown or not open to them.
export async function getProject(
  user: UserId,
  id: string,
): Promise<Project | undefined> {
  const projectId = parseProjectId(id);
  if (projectId === undefined) {
    return undefined;
  }
  const [project] = await withAppErrors("getProject", async () =>
    toProjects(
      await getDb()
        .select(projectColumns(user))
        .from(projects)
        .where(and(eq(projects.id, projectId), projectOpenTo(user))),
    ),
  );
  return project;
}

// A new project of the owner's, with no chats. The site starts every project
// with its first chat (src/chats/start-chat.ts); the end-to-end tests make
// empty ones.
export function createProject(
  owner: UserId,
  name: ProjectName,
): Promise<Project> {
  return withAppErrors("createProject", async () => {
    const [project] = toProjects(
      await getDb().insert(projects).values({ userId: owner, name }).returning({
        status: projects.status,
        statusRevision: projects.statusRevision,
        id: projects.id,
        name: projects.name,
        createdAt: projects.createdAt,
        owned: sql<boolean>`true`,
        shared: sql<boolean>`false`,
      }),
    );
    if (project === undefined) {
      throw new Error("Inserting a project returned no project");
    }
    return project;
  });
}

// Only the owner can rename a quest. Unknown or inaccessible ids change nothing.
export function renameProject(
  owner: UserId,
  id: ProjectId,
  name: ProjectName,
): Promise<boolean> {
  return withAppErrors("renameProject", async () => {
    const changed = await getDb()
      .update(projects)
      .set({ name })
      .where(and(eq(projects.id, id), projectOwnedBy(owner)))
      .returning({ id: projects.id });
    return changed.length > 0;
  });
}
