"use client";

import { createContext, type JSX, type ReactNode, use } from "react";
import { FormDialog } from "@/components/form-dialog.tsx";
import { QuestStartChoices } from "@/components/quest-start.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import type { QuestCreationChoices } from "@/projects/quest-creation-choices.ts";
import { QUEST_FROM_CHAT_COPY } from "@/ui/copy/start-work.ts";

// What Turn Chat into a quest offers inside Chat; none outside it.
const ChatQuestChoicesContext = createContext<QuestCreationChoices | undefined>(
  undefined,
);

// Makes Turn Chat into a quest available to everything in Chat, its own
// button and the construct's offers in its messages alike.
export function ChatQuestChoices({
  choices,
  children,
}: {
  readonly choices: QuestCreationChoices;
  readonly children: ReactNode;
}): JSX.Element {
  return (
    <ChatQuestChoicesContext value={choices}>
      {children}
    </ChatQuestChoicesContext>
  );
}

// Turn Chat into a quest, one of the two ways to create a quest: a button and
// the dialog it opens with the shared quest start on Do a thing, its Journal
// the draft (journal) and, when the construct offered one, its name.
// The user chooses a construct and optionally fills in Why before starting.
// Closing it makes and spends nothing.
// The new quest gets the summary and optional Why; the Chat stays private and
// unchanged. Outside Chat it shows nothing.
export function QuestFromChat({
  journal,
  name,
}: {
  readonly journal: string;
  readonly name?: string;
}): JSX.Element | null {
  const choices = use(ChatQuestChoicesContext);
  if (choices === undefined) {
    return null;
  }
  let label: string | undefined;
  if (name !== undefined) {
    label = QUEST_FROM_CHAT_COPY.openOffer(name);
  }
  return (
    <FormDialog
      closeLabel={QUEST_FROM_CHAT_COPY.closeDialog}
      title={QUEST_FROM_CHAT_COPY.heading}
      trigger={
        <Button aria-label={label} variant="secondary">
          <Icon name="plus" />
          {QUEST_FROM_CHAT_COPY.open}
        </Button>
      }
    >
      <p className="text-muted">{QUEST_FROM_CHAT_COPY.intro}</p>
      <QuestStartChoices
        choices={choices}
        initialChoice="do"
        presentation="inline"
        preset={{ name, journal }}
      />
    </FormDialog>
  );
}
