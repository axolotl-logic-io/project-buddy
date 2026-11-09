"use server";

import { refresh } from "next/cache";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/auth/current-user.ts";
import { AppError } from "@/errors/app-error.ts";
import { PROJECT_ID } from "@/ids.ts";
import { PROJECT_NAME } from "@/projects/project-name.ts";
import { renameProject } from "@/projects/store.ts";

type RenameProjectState =
  | { readonly kind: "idle" }
  | { readonly kind: "saved"; readonly name: string }
  | { readonly kind: "invalid"; readonly message: string };

const RENAME_FORM = z.object({ projectId: PROJECT_ID, name: PROJECT_NAME });

async function renameProjectAction(
  _previous: RenameProjectState,
  form: FormData,
): Promise<RenameProjectState> {
  const user = await requireUser();
  const input = RENAME_FORM.safeParse(Object.fromEntries(form));
  if (!input.success) {
    return { kind: "invalid", message: input.error.issues[0]?.message ?? "" };
  }
  try {
    if (
      !(await renameProject(user.id, input.data.projectId, input.data.name))
    ) {
      notFound();
    }
    refresh();
    return { kind: "saved", name: input.data.name };
  } catch (error) {
    if (error instanceof AppError) {
      return { kind: "invalid", message: error.message };
    }
    throw error;
  }
}

export type { RenameProjectState };
export { renameProjectAction };
