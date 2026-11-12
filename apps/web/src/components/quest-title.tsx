"use client";

import { Dialog } from "radix-ui";
import {
  type ChangeEvent,
  type JSX,
  type KeyboardEvent,
  useActionState,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button.tsx";
import { Alert, FormStatus } from "@/components/ui/form-message.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import type { QuestId } from "@/ids.ts";
import { QUEST_NAME_MAX_LENGTH } from "@/quests/quest-name.ts";
import {
  type RenameQuestState,
  renameQuestAction,
} from "@/quests/rename-quest-action.ts";
import type { Quest } from "@/quests/store.ts";
import { QUEST_COPY } from "@/ui/copy/quests.ts";

const IDLE: RenameQuestState = { kind: "idle" };

function preventDismiss(event: Event): void {
  event.preventDefault();
}

function TitleEditor({
  questId,
  name,
  onClose,
}: {
  readonly questId: QuestId;
  readonly name: string;
  readonly onClose: (name?: string) => void;
}): JSX.Element {
  const errorId = useId();
  const [draft, setDraft] = useState(name);
  const updateDraft = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      setDraft(event.target.value);
    },
    [],
  );
  const save = useCallback(
    async (
      previous: RenameQuestState,
      form: FormData,
    ): Promise<RenameQuestState> => {
      const result = await renameQuestAction(previous, form);
      if (result.kind === "saved") {
        onClose(result.name);
      }
      return result;
    },
    [onClose],
  );
  const [state, action, pending] = useActionState(save, IDLE);
  const focus = useCallback((input: HTMLInputElement | null): void => {
    input?.focus();
    input?.select();
  }, []);
  const cancel = useCallback((): void => onClose(), [onClose]);
  const cancelOnEscape = useCallback(
    (event: KeyboardEvent<HTMLElement>): void => {
      if (event.key === "Escape" && !pending) {
        event.preventDefault();
        onClose();
      }
    },
    [onClose, pending],
  );
  return (
    <form
      action={action}
      className="flex min-w-0 flex-col gap-2"
      noValidate={true}
    >
      <input type="hidden" name="questId" value={questId} />
      <input
        className="input-field quest-title-input"
        name="name"
        value={draft}
        onChange={updateDraft}
        maxLength={QUEST_NAME_MAX_LENGTH}
        aria-label={QUEST_COPY.titleLabel}
        aria-describedby={errorId}
        aria-invalid={state.kind === "invalid"}
        onKeyDown={cancelOnEscape}
        readOnly={pending}
        ref={focus}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending} onKeyDown={cancelOnEscape}>
          {QUEST_COPY.saveTitle}
        </Button>
        <Button
          variant="quiet"
          disabled={pending}
          onClick={cancel}
          onKeyDown={cancelOnEscape}
        >
          {QUEST_COPY.cancelTitle}
        </Button>
      </div>
      {state.kind === "invalid" && <Alert id={errorId}>{state.message}</Alert>}
    </form>
  );
}

// A pencil beside the quest's name in the trail band. Editing happens in a
// dialog so the navigation stays compact; saving returns focus to the pencil.
function QuestTitle({
  quest,
}: {
  readonly quest: Pick<Quest, "id" | "name">;
}): JSX.Element {
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState<string | undefined>(undefined);
  const renameRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef(false);
  useEffect(() => {
    if (editing === false && restoreFocusRef.current === true) {
      renameRef.current?.focus();
      restoreFocusRef.current = false;
    }
  }, [editing]);
  const open = useCallback((): void => {
    setSaved(undefined);
    setEditing(true);
  }, []);
  const close = useCallback((name?: string): void => {
    setSaved(name);
    restoreFocusRef.current = true;
    setEditing(false);
  }, []);
  let title = quest.name;
  if (saved !== undefined) {
    title = saved;
  }
  return (
    <div className="quest-title">
      <Dialog.Root open={editing} onOpenChange={setEditing}>
        <Dialog.Trigger asChild={true}>
          <Button
            ref={renameRef}
            variant="quiet"
            className="quest-title-edit"
            aria-label={QUEST_COPY.rename}
            title={QUEST_COPY.rename}
            onClick={open}
          >
            <Icon name="pencil" />
          </Button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content
            className="dialog-panel"
            aria-describedby={undefined}
            onEscapeKeyDown={preventDismiss}
            onPointerDownOutside={preventDismiss}
          >
            <Dialog.Title className="section-heading">
              {QUEST_COPY.titleLabel}
            </Dialog.Title>
            <TitleEditor questId={quest.id} name={title} onClose={close} />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <div className="sr-only">
        <FormStatus>{saved !== undefined && QUEST_COPY.titleSaved}</FormStatus>
      </div>
    </div>
  );
}

export { QuestTitle };
