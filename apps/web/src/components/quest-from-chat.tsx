"use client";

import { createContext, type JSX, type ReactNode, use } from "react";
import { FormDialog } from "@/components/form-dialog.tsx";
import { QuestStartChoices } from "@/components/quest-start.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import { QUEST_FROM_CHAT_COPY } from "@/ui/copy/start-work.ts";

// What Turn Chat into a quest offers inside Chat; none outside it.
const ChatQuestChoicesContext = createContext(false);

// Makes Turn Chat into a quest available to everything in Chat, its own
// button and the construct's offers in its messages alike.
export function ChatQuestChoices({
  children,
}: {
  readonly children: ReactNode;
}): JSX.Element {
  return (
    <ChatQuestChoicesContext value={true}>{children}</ChatQuestChoicesContext>
  );
}

// Turn Chat into a quest, one of the two ways to create a quest: a button and
// the dialog it opens with the shared quest start on Do a thing, the starting context and, when the construct offered one, its name.
// The starting point assigns its construct; the user optionally fills in Why.
// Closing it makes and spends nothing.
// The new quest gets the summary and optional Why; the Chat stays private and
// unchanged. Outside Chat it shows nothing.
export function QuestFromChat({
  context,
  name,
}: {
  readonly context: string;
  readonly name?: string;
}): JSX.Element | null {
  const available = use(ChatQuestChoicesContext);
  if (available !== true) {
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
        initialChoice="do"
        presentation="inline"
        preset={{ name, context }}
      />
    </FormDialog>
  );
}
