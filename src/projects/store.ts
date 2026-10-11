// Projects, stored in Postgres. An id from outside the code, such as a route
// parameter, is looked up as a string; anything malformed is not found.
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client.ts";
import { projects } from "@/db/tables/projects-and-chats.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import { type ProjectId, parseProjectId } from "@/ids.ts";

interface Project {
  id: ProjectId;
  name: string;
  createdAt: Date;
}

type ProjectRow = typeof projects.$inferSelect;

// Rows as projects. A row whose id is not a UUID is skipped, though the uuid
// column never holds one.
function toProjects(rows: readonly ProjectRow[]): Project[] {
  return rows.flatMap(({ id, name, createdAt }) => {
    const projectId = parseProjectId(id);
    if (projectId === undefined) {
      return [];
    }
    return [{ id: projectId, name, createdAt }];
  });
}

export type { Project };

export function listProjects(): Promise<Project[]> {
  return withAppErrors("listProjects", async () =>
    toProjects(
      await getDb().select().from(projects).orderBy(desc(projects.createdAt)),
    ),
  );
}

// The project with this id, or undefined if the id is malformed or unknown.
export async function getProject(id: string): Promise<Project | undefined> {
  const projectId = parseProjectId(id);
  if (projectId === undefined) {
    return undefined;
  }
  const [project] = await withAppErrors("getProject", async () =>
    toProjects(
      await getDb().select().from(projects).where(eq(projects.id, projectId)),
    ),
  );
  return project;
}

export function createProject(name: string): Promise<Project> {
  return withAppErrors("createProject", async () => {
    const [project] = toProjects(
      await getDb().insert(projects).values({ name }).returning(),
    );
    if (project === undefined) {
      throw new Error("Inserting a project returned no project");
    }
    return project;
  });
}
