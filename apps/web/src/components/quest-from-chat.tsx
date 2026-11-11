"use client";

import type { JSX } from "react";
import { FormDialog } from "@/components/form-dialog.tsx";
import { QuestStartChoices } from "@/components/quest-start.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import type { QuestCreationChoices } from "@/projects/quest-creation-choices.ts";
import { QUEST_FROM_CHAT_COPY } from "@/ui/copy/start-work.ts";

// Chat's Start a quest from this: a button and the dialog it opens with the
// premade quest start on Do a thing, its Journal the draft summary of the
// Chat, editable with the rest of the quest before the user confirms. Closing it makes and spends nothing. The new quest gets
// only what she confirms; the Chat stays private and unchanged.
export function QuestFromChat({
  choices,
  summary,
}: {
  readonly choices: QuestCreationChoices;
  readonly summary: string;
}): JSX.Element {
  return (
    <FormDialog
      closeLabel={QUEST_FROM_CHAT_COPY.closeDialog}
      title={QUEST_FROM_CHAT_COPY.heading}
      trigger={
        <Button variant="secondary">
          <Icon name="plus" />
          {QUEST_FROM_CHAT_COPY.open}
        </Button>
      }
    >
      <p className="text-muted">{QUEST_FROM_CHAT_COPY.intro}</p>
      <QuestStartChoices
        choices={choices}
        initialChoice="do"
        preset={{ journal: summary }}
      />
    </FormDialog>
  );
}
