import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { projects } from "@/db/schema";
import { withAppErrors } from "@/errors/app-error";

export type Project = typeof projects.$inferSelect;

export async function listProjects(): Promise<Project[]> {
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

export async function createProject(name: string): Promise<Project> {
  const [project] = await withAppErrors("createProject", () =>
    getDb().insert(projects).values({ name }).returning(),
  );
  return project;
}
