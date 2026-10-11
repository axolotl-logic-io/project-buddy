"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createProject } from "@/projects/store.ts";
import { COPY } from "@/ui/copy.ts";

const CREATE_PROJECT_FORM = z.object({
  name: z.string().trim().min(1),
});

// The new-project form's state: as first shown, or after a submission
// without a name. A storage failure throws, for the error boundary.
export type CreateProjectState =
  | { readonly kind: "idle" }
  | { readonly kind: "invalid"; readonly message: string };

// Creates the project and opens it, or asks for a name.
export async function createProjectAction(
  _state: CreateProjectState,
  formData: FormData,
): Promise<CreateProjectState> {
  const form = CREATE_PROJECT_FORM.safeParse(Object.fromEntries(formData));
  if (!form.success) {
    return { kind: "invalid", message: COPY.projects.needsName };
  }

  const project = await createProject(form.data.name);
  return redirect(`/projects/${project.id}`);
}
