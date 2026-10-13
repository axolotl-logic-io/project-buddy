// Projects, stored in Postgres, each its owner's alone: every function takes
// the owner first and reads or writes only the owner's projects. An id from
// outside the code, such as a route parameter, is looked up as a string;
// anything malformed, unknown or another user's is not found.
import { and, desc, eq } from "drizzle-orm";
import { projectOwnedBy } from "@/accounts/owner-scope.ts";
import { getDb } from "@/db/client.ts";
import { projects } from "@/db/tables/projects-and-chats.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import {
  type ChatId,
  type ProjectId,
  parseChatId,
  parseProjectId,
  type UserId,
} from "@/ids.ts";

interface Project {
  id: ProjectId;
  name: string;
  // The chat startProject opened the project with, which starts its
  // interview; undefined for a project made before it was recorded, one made
  // without a chat, or once that chat is deleted.
  interviewChatId: ChatId | undefined;
  createdAt: Date;
}

type ProjectRow = typeof projects.$inferSelect;

// Rows as projects. A row whose id is not a UUID is skipped, though the uuid
// column never holds one.
function toProjects(rows: readonly ProjectRow[]): Project[] {
  return rows.flatMap(({ id, name, interviewChatId, createdAt }) => {
    const projectId = parseProjectId(id);
    if (projectId === undefined) {
      return [];
    }
    return [
      {
        id: projectId,
        name,
        interviewChatId: parseChatId(interviewChatId ?? ""),
        createdAt,
      },
    ];
  });
}

export type { Project };

// The owner's projects, newest first.
export function listProjects(owner: UserId): Promise<Project[]> {
  return withAppErrors("listProjects", async () =>
    toProjects(
      await getDb()
        .select()
        .from(projects)
        .where(projectOwnedBy(owner))
        .orderBy(desc(projects.createdAt)),
    ),
  );
}

// The owner's project with this id, or undefined if the id is malformed,
// unknown or another user's.
export async function getProject(
  owner: UserId,
  id: string,
): Promise<Project | undefined> {
  const projectId = parseProjectId(id);
  if (projectId === undefined) {
    return undefined;
  }
  const [project] = await withAppErrors("getProject", async () =>
    toProjects(
      await getDb()
        .select()
        .from(projects)
        .where(and(eq(projects.id, projectId), projectOwnedBy(owner))),
    ),
  );
  return project;
}

// A new project of the owner's, with no chats. The site starts every project
// with its first chat (src/chats/start-chat.ts); the end-to-end tests make
// empty ones.
export function createProject(owner: UserId, name: string): Promise<Project> {
  return withAppErrors("createProject", async () => {
    const [project] = toProjects(
      await getDb()
        .insert(projects)
        .values({ userId: owner, name })
        .returning(),
    );
    if (project === undefined) {
      throw new Error("Inserting a project returned no project");
    }
    return project;
  });
}
