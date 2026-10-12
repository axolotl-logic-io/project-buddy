"use client";

import { Collapsible } from "radix-ui";
import {
  type ChangeEvent,
  type JSX,
  useActionState,
  useCallback,
  useState,
} from "react";
import { CHAT_NAME_MAX_LENGTH } from "@/chats/chat-name.ts";
import { Button } from "@/components/ui/button.tsx";
import { TextField } from "@/components/ui/field.tsx";
import { FormStatus } from "@/components/ui/form-message.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import type { ChatId } from "@/ids.ts";
import { COPY } from "@/ui/copy.ts";
import { type RenameChatState, renameChatAction } from "./actions.ts";

const IDLE: RenameChatState = { kind: "idle" };

// Her form to rename the chat, folded away until she opens it. Her text stays
// in the field whatever the action answers, so a refused name can be fixed.
// When the page brings a new name, a field she hasn't changed shows it.
export function RenameChatForm({
  chatId,
  name,
}: {
  chatId: ChatId;
  name: string | undefined;
}): JSX.Element {
  const [state, formAction, pending] = useActionState(renameChatAction, IDLE);
  const [shown, setShown] = useState(name);
  const [draft, setDraft] = useState(name ?? "");
  const updateDraft = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      setDraft(event.target.value);
    },
    [],
  );

  if (name !== shown) {
    setShown(name);
    if (draft === (shown ?? "")) {
      setDraft(name ?? "");
    }
  }

  let error: string | undefined;
  if (state.kind === "invalid") {
    error = state.message;
  }
  let status = "";
  if (state.kind === "renamed") {
    status = COPY.chatName.saved;
  }

  return (
    <Collapsible.Root className="flex flex-col gap-3">
      <Collapsible.Trigger asChild={true}>
        <Button className="self-start" variant="quiet">
          <Icon name="pencil" />
          {COPY.chatName.rename}
        </Button>
      </Collapsible.Trigger>
      <Collapsible.Content>
        <form action={formAction} className="card flex flex-col gap-3 p-4">
          <input name="chatId" type="hidden" value={chatId} />
          <TextField
            error={error}
            label={COPY.chatName.label}
            maxLength={CHAT_NAME_MAX_LENGTH}
            name="name"
            onChange={updateDraft}
            required={true}
            type="text"
            value={draft}
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button disabled={pending} type="submit">
              {COPY.chatName.save}
            </Button>
            <FormStatus>{status}</FormStatus>
          </div>
        </form>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}
