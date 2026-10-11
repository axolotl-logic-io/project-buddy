"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createProject } from "@/projects/store.ts";

const NEEDS_NAME = "A project needs a name.";

const CREATE_PROJECT_FORM = z.object({
  name: z.string({ error: NEEDS_NAME }).trim().min(1, { error: NEEDS_NAME }),
});

export async function createProjectAction(formData: FormData): Promise<void> {
  const form = CREATE_PROJECT_FORM.safeParse(Object.fromEntries(formData));
  if (!form.success) {
    throw new Error(z.prettifyError(form.error));
  }

  const project = await createProject(form.data.name);
  redirect(`/projects/${project.id}`);
}
