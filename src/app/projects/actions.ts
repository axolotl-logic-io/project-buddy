"use server";

import { redirect } from "next/navigation";
import { createProject } from "@/projects/store.ts";

export async function createProjectAction(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    throw new Error("A project needs a name.");
  }

  const project = await createProject(name);
  redirect(`/projects/${project.id}`);
}
