"use client";

import {
  type ChangeEvent,
  type JSX,
  useActionState,
  useCallback,
  useState,
} from "react";
import { CHAT_NAME_MAX_LENGTH } from "@/chats/chat-name.ts";
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

  return (
    <details className="text-sm">
      <summary className="cursor-pointer">{COPY.chatName.rename}</summary>
      <form action={formAction} className="flex flex-col gap-2 pt-2">
        <input name="chatId" type="hidden" value={chatId} />
        <div className="flex items-end gap-2">
          <label className="flex flex-1 flex-col gap-1">
            <span className="font-medium">{COPY.chatName.label}</span>
            <input
              className="rounded border border-line px-2 py-1"
              maxLength={CHAT_NAME_MAX_LENGTH}
              name="name"
              onChange={updateDraft}
              required={true}
              type="text"
              value={draft}
            />
          </label>
          <button className="button-primary" disabled={pending} type="submit">
            {COPY.chatName.save}
          </button>
        </div>
        {state.kind === "invalid" && (
          <p className="error-text" role="alert">
            {state.message}
          </p>
        )}
        {state.kind === "renamed" && (
          <p className="text-muted" role="status">
            {COPY.chatName.saved}
          </p>
        )}
      </form>
    </details>
  );
}
