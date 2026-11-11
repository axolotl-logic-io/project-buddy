"use client";

import type { JSX, ReactNode } from "react";
import { FormDialog } from "@/components/form-dialog.tsx";
import { QuestStartChoices } from "@/components/quest-start.tsx";
import type { ConstructId } from "@/constructs/index.ts";
import type { OwnPromptId } from "@/ids.ts";
import {
  PREMADE_QUESTS,
  type PremadeQuestId,
} from "@/projects/premade-quests.ts";
import type { QuestCreationChoices } from "@/projects/quest-creation-choices.ts";
import { START_WORK_COPY } from "@/ui/copy/start-work.ts";

// What an Activity's or Construct's start action presets: that activity or
// construct, with its name.
type StartWith = {
  readonly name: string;
} & (
  | { readonly kind: "activity"; readonly id: string }
  | { readonly kind: "construct"; readonly id: ConstructId | OwnPromptId }
);

// The starting point a start action opens on: the one built on the chosen
// activity, if any but Dailies, the one ongoing quest, is; otherwise Do a
// thing, the general one.
function startingPoint(startWith: StartWith): PremadeQuestId {
  const fitting = PREMADE_QUESTS.find(
    ({ id, activityId }) =>
      id !== "dailies" &&
      startWith.kind === "activity" &&
      activityId === startWith.id,
  );
  return fitting?.id ?? "do";
}

// An Activity's or Construct's start action: its trigger and a dialog with
// the one premade quest start, with that activity or construct already
// chosen and the best-fitting starting point open. Closing it makes and
// spends nothing.
export function StartWorkDialog({
  startWith,
  choices,
  trigger,
}: {
  readonly startWith: StartWith;
  readonly choices: QuestCreationChoices;
  readonly trigger?: ReactNode;
}): JSX.Element {
  let title = START_WORK_COPY.activityDialogHeading(startWith.name);
  let preset: { readonly activityId?: string; readonly constructId?: string } =
    { activityId: startWith.id };
  if (startWith.kind === "construct") {
    title = START_WORK_COPY.constructDialogHeading(startWith.name);
    preset = { constructId: startWith.id };
  }
  return (
    <FormDialog
      closeLabel={START_WORK_COPY.closeDialog}
      title={title}
      trigger={trigger}
    >
      <QuestStartChoices
        choices={choices}
        initialChoice={startingPoint(startWith)}
        preset={preset}
      />
    </FormDialog>
  );
}
