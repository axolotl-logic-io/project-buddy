"use client";

import { Dialog } from "radix-ui";
import { type JSX, type MouseEvent, useCallback, useState } from "react";
import { useFormStatus } from "react-dom";
import { FormDialog } from "@/components/form-dialog.tsx";
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
  quest = false,
  label = QUEST_CONVERSATION_COPY.reset,
}: {
  readonly chatId: ChatId;
  readonly label?: string;
  readonly quest?: boolean;
}): JSX.Element {
  const [portalContainer, setPortalContainer] = useState<
    HTMLElement | undefined
  >();
  const open = useCallback((event: MouseEvent<HTMLButtonElement>): void => {
    setPortalContainer(event.currentTarget.closest("dialog") ?? undefined);
  }, []);
  return (
    <FormDialog
      portalContainer={portalContainer}
      title={label}
      closeLabel={QUEST_CONVERSATION_COPY.cancel}
      trigger={
        <Button variant="secondary" onClick={open}>
          {label}
        </Button>
      }
    >
      <form action={resetConversationAction} className="flex flex-col gap-3">
        <p>{QUEST_CONVERSATION_COPY.confirmReset}</p>
        {quest === true && (
          <>
            <label>
              <input type="checkbox" name="clearSteps" />{" "}
              {QUEST_CONVERSATION_COPY.clearSteps}
            </label>
            <p className="text-muted">{QUEST_CONVERSATION_COPY.keepSteps}</p>
            <label>
              <input type="checkbox" name="clearIdeas" />{" "}
              {QUEST_CONVERSATION_COPY.clearIdeas}
            </label>
          </>
        )}
        <Dialog.Close asChild={true}>
          <Button variant="secondary">{QUEST_CONVERSATION_COPY.cancel}</Button>
        </Dialog.Close>
        <input type="hidden" name="chatId" value={chatId} />
        <ResetButton label={label} />
      </form>
    </FormDialog>
  );
}

export { ResetConversation };
