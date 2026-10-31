"use client";

import type { ComponentProps, JSX } from "react";
import { FormDialog } from "@/components/form-dialog.tsx";
import { NewProjectForm } from "@/components/new-project-form.tsx";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";

// The Projects page's "New project" button and the dialog it opens, which
// holds the new-project form.
export function NewProjectDialog(
  props: ComponentProps<typeof NewProjectForm>,
): JSX.Element {
  return (
    <FormDialog
      closeLabel={PROJECTS_COPY.closeNewProject}
      title={PROJECTS_COPY.newHeading}
    >
      <NewProjectForm {...props} />
    </FormDialog>
  );
}
