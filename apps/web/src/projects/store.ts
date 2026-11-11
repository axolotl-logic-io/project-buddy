// Projects, stored in Postgres. A project is its owner's alone
// (src/accounts/owner-scope.ts): every function takes the acting user first
// and reads only their own projects. An id from outside the code, such as a
// route parameter, is looked up as a string; anything malformed, unknown or
// another user's is not found.
import { and, desc, eq } from "drizzle-orm";
import { projectOwnedBy } from "@/accounts/owner-scope.ts";
import { getDb } from "@/db/client.ts";
import { projects } from "@/db/tables/projects-and-chats.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import { type ProjectId, parseProjectId, type UserId } from "@/ids.ts";
import type { ProjectName } from "@/projects/project-name.ts";
import { QUEST_STATUS, type QuestStatus } from "@/projects/quest-status.ts";

interface Project {
  id: ProjectId;
  name: string;
  createdAt: Date;
  status: QuestStatus;
  statusRevision: number;
  // Whether it is the user's Dailies quest (src/conversations/dailies.ts).
  dailies: boolean;
}

interface ProjectRow {
  readonly id: string;
  readonly name: string;
  readonly createdAt: Date;
  readonly status: string;
  readonly statusRevision: number;
  readonly dailies: boolean;
}

// The columns a project is read from. Select only the fields this store
// uses, so a later release can drop retired columns while this build is
// still live.
const PROJECT_COLUMNS: {
  readonly status: typeof projects.status;
  readonly statusRevision: typeof projects.statusRevision;
  readonly id: typeof projects.id;
  readonly name: typeof projects.name;
  readonly createdAt: typeof projects.createdAt;
  readonly dailies: typeof projects.dailies;
} = {
  status: projects.status,
  statusRevision: projects.statusRevision,
  id: projects.id,
  name: projects.name,
  createdAt: projects.createdAt,
  dailies: projects.dailies,
};

// Rows as projects. A row whose id is not a UUID is skipped, though the uuid
// column never holds one.
function toProjects(rows: readonly ProjectRow[]): Project[] {
  return rows.flatMap(
    ({ id, name, createdAt, status, statusRevision, dailies }) => {
      const projectId = parseProjectId(id);
      if (projectId === undefined) {
        return [];
      }
      return [
        {
          id: projectId,
          name,
          createdAt,
          status: QUEST_STATUS.parse(status),
          statusRevision,
          dailies,
        },
      ];
    },
  );
}

export type { Project };

// The user's projects, newest first.
export function listProjects(user: UserId): Promise<Project[]> {
  return withAppErrors("listProjects", async () =>
    toProjects(
      await getDb()
        .select(PROJECT_COLUMNS)
        .from(projects)
        .where(projectOwnedBy(user))
        .orderBy(desc(projects.createdAt)),
    ),
  );
}

// The user's project with this id, or undefined if the id is malformed,
// unknown or another user's.
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
        .select(PROJECT_COLUMNS)
        .from(projects)
        .where(and(eq(projects.id, projectId), projectOwnedBy(user))),
    ),
  );
  return project;
}

// A new project of the owner's, with no conversation. The site starts every
// quest with its conversation (src/conversations/start-quest.ts); tests make
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
        dailies: projects.dailies,
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
