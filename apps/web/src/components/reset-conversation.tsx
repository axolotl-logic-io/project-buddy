"use client";

import type { JSX } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button.tsx";
import { resetConversationAction } from "@/conversations/reset-conversation-action.ts";
import type { ChatId } from "@/ids.ts";
import { QUEST_CONVERSATION_COPY } from "@/ui/copy/conversation.ts";

function ResetButton({ label }: { readonly label: string }): JSX.Element {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" disabled={pending}>
      {label}
    </Button>
  );
}

function ResetConversation({
  chatId,
  dailies = false,
}: {
  readonly chatId: ChatId;
  readonly dailies?: boolean;
}): JSX.Element {
  let label: string = QUEST_CONVERSATION_COPY.reset;
  if (dailies === true) {
    label = QUEST_CONVERSATION_COPY.resetDay;
  }
  return (
    <form action={resetConversationAction}>
      <input type="hidden" name="chatId" value={chatId} />
      <ResetButton label={label} />
    </form>
  );
}

export { ResetConversation };
