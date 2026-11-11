"use client";

import type { JSX, ReactNode } from "react";
import { FormDialog } from "@/components/form-dialog.tsx";
import { QuestStartChoices } from "@/components/quest-start.tsx";
import type { ConstructId } from "@/constructs/index.ts";
import type { OwnPromptId } from "@/ids.ts";
import type { QuestCreationChoices } from "@/projects/quest-creation-choices.ts";
import { START_WORK_COPY } from "@/ui/copy/start-work.ts";

// A Construct's start action: its trigger and a dialog with the one premade
// quest start, that construct already chosen, open on Do a thing, the
// general starting point. Closing it makes and spends nothing.
export function StartWorkDialog({
  construct,
  choices,
  trigger,
}: {
  readonly construct: {
    readonly id: ConstructId | OwnPromptId;
    readonly name: string;
  };
  readonly choices: QuestCreationChoices;
  readonly trigger?: ReactNode;
}): JSX.Element {
  return (
    <FormDialog
      closeLabel={START_WORK_COPY.closeDialog}
      title={START_WORK_COPY.constructDialogHeading(construct.name)}
      trigger={trigger}
    >
      <QuestStartChoices
        choices={choices}
        initialChoice="do"
        preset={{ constructId: construct.id }}
      />
    </FormDialog>
  );
}
