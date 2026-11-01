"use client";

import {
  type ChangeEvent,
  type JSX,
  useActionState,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { CHAT_NAME_MAX_LENGTH } from "@/chats/chat-name.ts";
import { Button } from "@/components/ui/button.tsx";
import { Alert } from "@/components/ui/form-message.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import type { ChatId } from "@/ids.ts";
import { CHAT_COPY, CHAT_NAME_COPY } from "@/ui/copy/chat.ts";
import { type RenameChatState, renameChatAction } from "./actions.ts";

const IDLE: RenameChatState = { kind: "idle" };

// The editor retains refused text. Closing it discards the draft and errors.
function NameEditor({
  chatId,
  name,
  onClose,
}: {
  readonly chatId: ChatId;
  readonly name: string | undefined;
  readonly onClose: () => void;
}): JSX.Element {
  const errorId = useId();
  const [draft, setDraft] = useState(name ?? "");
  const save = useCallback(
    async (
      previous: RenameChatState,
      form: FormData,
    ): Promise<RenameChatState> => {
      const result = await renameChatAction(previous, form);
      if (result.kind === "renamed") {
        onClose();
      }
      return result;
    },
    [onClose],
  );
  const [state, formAction, pending] = useActionState(save, IDLE);
  const updateDraft = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      setDraft(event.target.value);
    },
    [],
  );
  const focusInput = useCallback((input: HTMLInputElement | null): void => {
    input?.focus();
  }, []);
  let error: string | undefined;
  if (state.kind === "invalid") {
    error = state.message;
  }
  return (
    <form
      action={formAction}
      className="flex min-w-0 flex-col gap-1.5"
      noValidate={true}
    >
      <input name="chatId" type="hidden" value={chatId} />
      <div className="flex min-w-0 items-center gap-1.5">
        <input
          aria-label={CHAT_NAME_COPY.label}
          aria-describedby={errorId}
          aria-invalid={state.kind === "invalid"}
          className="input-field min-h-(--target-size) min-w-0 flex-1 font-heading font-semibold text-section-heading"
          maxLength={CHAT_NAME_MAX_LENGTH}
          name="name"
          onChange={updateDraft}
          ref={focusInput}
          type="text"
          value={draft}
        />
        <Button
          aria-label={CHAT_NAME_COPY.save}
          className="min-w-(--target-size) shrink-0 justify-center"
          disabled={pending}
          type="submit"
        >
          <Icon name="check" />
        </Button>
        <Button
          aria-label={CHAT_NAME_COPY.cancel}
          className="min-w-(--target-size) shrink-0 justify-center"
          disabled={pending}
          onClick={onClose}
          variant="quiet"
        >
          <Icon name="close" />
        </Button>
      </div>
      <div id={errorId}>{error !== undefined && <Alert>{error}</Alert>}</div>
    </form>
  );
}

// The title owns the editor and returns keyboard focus to its pencil on close.
function RenameChatForm({
  chatId,
  name,
  buddyName,
}: {
  readonly chatId: ChatId;
  readonly name: string | undefined;
  readonly buddyName: string;
}): JSX.Element {
  const [editing, setEditing] = useState(false);
  const pencilRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef(false);
  useEffect(() => {
    if (editing === false && restoreFocusRef.current === true) {
      pencilRef.current?.focus();
      restoreFocusRef.current = false;
    }
  }, [editing]);
  const open = useCallback((): void => {
    setEditing(true);
  }, []);
  const close = useCallback((): void => {
    restoreFocusRef.current = true;
    setEditing(false);
  }, []);
  if (editing === true) {
    return (
      <div className="min-w-0">
        <NameEditor chatId={chatId} name={name} onClose={close} />
        <p className="chat-header-buddy">{CHAT_COPY.heading(buddyName)}</p>
      </div>
    );
  }
  return (
    <div className="flex min-w-0 items-start gap-3">
      <h1 className="chat-heading">
        <span className="chat-header-name">
          {name ?? CHAT_NAME_COPY.fallback}
        </span>{" "}
        <span className="chat-header-buddy">
          {CHAT_COPY.heading(buddyName)}
        </span>
      </h1>
      <Button
        className="min-w-(--target-size) shrink-0 justify-center"
        aria-label={CHAT_NAME_COPY.rename}
        aria-expanded={false}
        onClick={open}
        ref={pencilRef}
        variant="quiet"
      >
        <Icon name="pencil" />
      </Button>
    </div>
  );
}

export { RenameChatForm };
