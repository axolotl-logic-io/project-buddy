"use client";

import type { JSX } from "react";
import { FormDialog } from "@/components/form-dialog.tsx";
import { NewProjectForm } from "@/components/new-project-form.tsx";
import type { QuestCreationChoices } from "@/projects/quest-creation-choices.ts";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";

// The Quests page's "Start Quest" button and the dialog it opens, which
// holds the new-project form.
export function NewProjectDialog({
  choices,
}: {
  readonly choices?: QuestCreationChoices;
}): JSX.Element {
  return (
    <FormDialog
      closeLabel={PROJECTS_COPY.closeNewProject}
      title={PROJECTS_COPY.newHeading}
    >
      <NewProjectForm choices={choices} cancel={true} />
    </FormDialog>
  );
}
