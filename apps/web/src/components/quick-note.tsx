"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dialog } from "radix-ui";
import {
  type ChangeEvent,
  type JSX,
  type MouseEvent,
  type SyntheticEvent,
  useCallback,
  useId,
  useRef,
  useState,
} from "react";
import { closePanelAround } from "@/components/close-panel-around.ts";
import { Button } from "@/components/ui/button.tsx";
import { SelectField, TextAreaField } from "@/components/ui/field.tsx";
import { Alert, FormStatus, Notice } from "@/components/ui/form-message.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import { checkNoteText, type NoteQuest } from "@/notes/note.ts";
import { listNoteQuestsAction, saveNoteAction } from "@/notes/note-actions.ts";
import { QUICK_NOTE_COPY } from "@/ui/copy/notes.ts";
import { QUEST_SHARING_COPY } from "@/ui/copy/quest-members.ts";

const QUEST_PATH = /^\/quests\/(?<questId>[^/]+)$/u;

// The quest a new Quick Note goes to: the quest whose page is open, if it is
// one of the offered quests, or else the newest.
function chosenQuest(quests: readonly NoteQuest[], pathname: string): string {
  const { questId } = QUEST_PATH.exec(pathname)?.groups ?? {};
  if (quests.some((quest) => quest.id === questId) && questId !== undefined) {
    return questId;
  }
  return quests[0]?.id ?? "";
}

// The site panel's Quick Note item and its dialog. Choosing the item closes
// the panel's drawer and opens a modal dialog with a choice of the user's
// Active quests and the Quick Note's text. A saved Quick Note clears the text and
// keeps the quest chosen, ready for the next one. Closing the dialog returns
// focus to the panel's button, or to Quick Note in a docked panel. Saving
// makes no model request.
function QuickNote(): JSX.Element {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [quests, setQuests] = useState<readonly NoteQuest[] | undefined>();
  const [questId, setQuestId] = useState("");
  const [text, setText] = useState("");
  const [textProblem, setTextProblem] = useState<string | undefined>();
  const [failure, setFailure] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>();
  const [pending, setPending] = useState(false);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const introId = useId();

  const openDialog = useCallback(
    (event: MouseEvent<HTMLButtonElement>): void => {
      // Closing the site panel's drawer gives focus back to its button,
      // where closing this dialog returns it. A docked panel stays open,
      // and focus returns to Quick Note, which a click doesn't focus in
      // Safari.
      returnFocusRef.current = event.currentTarget;
      if (closePanelAround(event)) {
        const { activeElement } = document;
        if (activeElement instanceof HTMLElement) {
          returnFocusRef.current = activeElement;
        }
      }
      setQuests(undefined);
      setTextProblem(undefined);
      setFailure(undefined);
      setStatus(undefined);
      setOpen(true);
      listNoteQuestsAction()
        .then((offered) => {
          setQuests(offered);
          setQuestId(chosenQuest(offered, pathname));
        })
        .catch(() => setFailure(QUICK_NOTE_COPY.failed));
    },
    [pathname],
  );
  const restoreFocus = useCallback((event: Event): void => {
    event.preventDefault();
    returnFocusRef.current?.focus();
  }, []);
  const closeDialog = useCallback((): void => setOpen(false), []);
  const chooseQuest = useCallback(
    (event: ChangeEvent<HTMLSelectElement>): void =>
      setQuestId(event.target.value),
    [],
  );
  const changeText = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>): void =>
      setText(event.target.value),
    [],
  );
  const save = useCallback(
    (event: SyntheticEvent<HTMLFormElement>): void => {
      event.preventDefault();
      setFailure(undefined);
      setStatus(undefined);
      const checked = checkNoteText(text);
      if ("problem" in checked) {
        setTextProblem(QUICK_NOTE_COPY.problem(checked.problem));
        return;
      }
      setTextProblem(undefined);
      setPending(true);
      const questName =
        quests?.find((quest) => quest.id === questId)?.name ?? "";
      saveNoteAction({ questId, text })
        .then((result) => {
          if (result.kind === "problem") {
            setFailure(result.text);
            return;
          }
          setText("");
          setStatus(QUICK_NOTE_COPY.saved(questName));
        })
        .catch(() => setFailure(QUICK_NOTE_COPY.failed))
        .finally(() => setPending(false));
    },
    [questId, quests, text],
  );

  let saveLabel: string = QUICK_NOTE_COPY.save;
  if (pending === true) {
    saveLabel = QUICK_NOTE_COPY.saving;
  }
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Button className="w-full justify-start" onClick={openDialog}>
        <Icon name="plus" />
        {QUICK_NOTE_COPY.panelItem}
      </Button>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content
          aria-describedby={introId}
          className="dialog-panel"
          onCloseAutoFocus={restoreFocus}
        >
          <div className="flex items-center justify-between gap-3">
            <Dialog.Title className="section-heading">
              {QUICK_NOTE_COPY.heading}
            </Dialog.Title>
            <Dialog.Close asChild={true}>
              <Button
                aria-label={QUICK_NOTE_COPY.close}
                className="min-w-(--target-size)"
                variant="secondary"
              >
                <Icon name="close" />
              </Button>
            </Dialog.Close>
          </div>
          <p className="text-muted" id={introId}>
            {QUICK_NOTE_COPY.intro}
          </p>
          {quests === undefined && failure === undefined && (
            <p className="text-muted">{QUICK_NOTE_COPY.loading}</p>
          )}
          {quests?.length === 0 && (
            <Notice>
              {QUICK_NOTE_COPY.noQuests}{" "}
              <Link href="/quests" onClick={closeDialog}>
                {QUICK_NOTE_COPY.noQuestsLink}
              </Link>
            </Notice>
          )}
          {quests !== undefined && quests.length > 0 && (
            <form
              className="flex flex-col gap-3"
              noValidate={true}
              onSubmit={save}
            >
              <SelectField
                label={QUICK_NOTE_COPY.questLabel}
                name="questId"
                onChange={chooseQuest}
                value={questId}
              >
                {quests.map((quest) => (
                  <option key={quest.id} value={quest.id}>
                    {QUEST_SHARING_COPY.option(quest.name, quest.sharing)}
                  </option>
                ))}
              </SelectField>
              <TextAreaField
                error={textProblem}
                hint={QUICK_NOTE_COPY.textHint}
                label={QUICK_NOTE_COPY.textLabel}
                name="text"
                onChange={changeText}
                rows={4}
                value={text}
              />
              <Button
                className="self-start"
                aria-busy={pending}
                disabled={pending}
                type="submit"
              >
                {saveLabel}
              </Button>
            </form>
          )}
          {failure !== undefined && <Alert>{failure}</Alert>}
          <FormStatus>{status}</FormStatus>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export { QuickNote };
