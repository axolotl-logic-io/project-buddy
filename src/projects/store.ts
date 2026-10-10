import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client.ts";
import { projects } from "@/db/tables/projects-and-chats.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";

export type Project = typeof projects.$inferSelect;

export function listProjects(): Promise<Project[]> {
  return withAppErrors("listProjects", () =>
    getDb().select().from(projects).orderBy(desc(projects.createdAt)),
  );
}

export async function getProject(id: string): Promise<Project | undefined> {
  const [project] = await withAppErrors("getProject", () =>
    getDb().select().from(projects).where(eq(projects.id, id)),
  );
  return project;
}

export function createProject(name: string): Promise<Project> {
  return withAppErrors("createProject", async () => {
    const [project] = await getDb()
      .insert(projects)
      .values({ name })
      .returning();
    if (project === undefined) {
      throw new Error("Inserting a project returned no row");
    }
    return project;
  });
}
