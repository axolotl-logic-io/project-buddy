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
import { useQuestAction } from "@/components/use-quest-action.ts";
import { checkQuickAddText } from "@/lists/quick-add.ts";
import {
  listQuickAddQuests,
  type QuickAddQuest,
  saveQuickAdd,
} from "@/lists/quick-add-actions.ts";
import { QUEST_SHARING_COPY } from "@/ui/copy/quest-members.ts";
import { QUICK_ADD_COPY } from "@/ui/copy/quick-add.ts";

const QUEST_PATH = /^\/quests\/(?<questId>[^/]+)$/u;

// The quest Quick Add adds to: the quest whose page is open, if it is
// one of the offered quests, or else the newest.
function chosenQuest(
  quests: readonly QuickAddQuest[],
  pathname: string,
): string {
  const { questId } = QUEST_PATH.exec(pathname)?.groups ?? {};
  if (quests.some((quest) => quest.id === questId) && questId !== undefined) {
    return questId;
  }
  return quests[0]?.id ?? "";
}

// The text to add and the list to add it to, in a quest Quick Add offers.
// Saving shows its notice and clears the text at once; a refusal brings the
// text back, unless a new one has been started, and says why.
function QuickAddForm({
  quests,
  questId,
}: {
  readonly quests: readonly QuickAddQuest[];
  readonly questId: string;
}): JSX.Element {
  const [chosenId, setQuestId] = useState(questId);
  const [listId, setListId] = useState(
    quests.find((quest) => quest.id === questId)?.lists[0]?.id ?? "",
  );
  const lists = quests.find(({ id }) => id === chosenId)?.lists ?? [];
  const [text, setText] = useState("");
  const [textProblem, setTextProblem] = useState<string | undefined>();
  const { start, busy, status, problem } = useQuestAction(
    saveQuickAdd,
    QUICK_ADD_COPY.failed,
  );
  const chooseQuest = useCallback(
    (event: ChangeEvent<HTMLSelectElement>): void => {
      const id = event.target.value;
      setQuestId(id);
      setListId(quests.find((quest) => quest.id === id)?.lists[0]?.id ?? "");
    },
    [quests],
  );
  const chooseList = useCallback(
    (event: ChangeEvent<HTMLSelectElement>): void => {
      setListId(event.target.value);
    },
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
      const checked = checkQuickAddText(text);
      if ("problem" in checked) {
        setTextProblem(QUICK_ADD_COPY.problem(checked.problem));
        return;
      }
      setTextProblem(undefined);
      const quest = quests.find(({ id }) => id === chosenId);
      const listName = quest?.lists.find(({ id }) => id === listId)?.name ?? "";
      const added = text;
      setText("");
      start(
        { questId: chosenId, listId, text: added },
        {
          status: QUICK_ADD_COPY.savedToList(quest?.name ?? "", listName),
          refused: (): void =>
            setText((typed) => {
              if (typed === "") {
                return added;
              }
              return typed;
            }),
        },
      );
    },
    [chosenId, quests, listId, text, start],
  );
  let saveLabel: string = QUICK_ADD_COPY.save;
  if (busy) {
    saveLabel = QUICK_ADD_COPY.saving;
  }
  return (
    <>
      <form className="flex flex-col gap-3" noValidate={true} onSubmit={save}>
        <SelectField
          label={QUICK_ADD_COPY.questLabel}
          name="questId"
          onChange={chooseQuest}
          value={chosenId}
        >
          {quests.map((quest) => (
            <option key={quest.id} value={quest.id}>
              {QUEST_SHARING_COPY.option(quest.name, quest.sharing)}
            </option>
          ))}
        </SelectField>
        <SelectField
          label={QUICK_ADD_COPY.listLabel}
          name="listId"
          value={listId}
          onChange={chooseList}
        >
          {lists.map(({ id, name }) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </SelectField>
        <TextAreaField
          error={textProblem}
          hint={QUICK_ADD_COPY.textHint}
          label={QUICK_ADD_COPY.textLabel}
          name="text"
          onChange={changeText}
          rows={4}
          value={text}
        />
        <Button
          className="self-start"
          aria-busy={busy}
          disabled={busy}
          type="submit"
        >
          {saveLabel}
        </Button>
      </form>
      {problem !== undefined && <Alert>{problem}</Alert>}
      <FormStatus>{status}</FormStatus>
    </>
  );
}

// The site panel's Quick Add item and its dialog. Choosing the item closes
// the panel's drawer and opens a modal dialog with a choice of the user's
// Active quests and the text to add. Saving clears the text and
// keeps the quest chosen, ready for the next one. Closing the dialog returns
// focus to the panel's button, or to Quick Add in a docked panel. Saving
// makes no model request.
function QuickAdd(): JSX.Element {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [quests, setQuests] = useState<readonly QuickAddQuest[] | undefined>();
  const [questId, setQuestId] = useState("");
  const [failure, setFailure] = useState<string | undefined>();
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const introId = useId();

  const openDialog = useCallback(
    (event: MouseEvent<HTMLButtonElement>): void => {
      // Closing the site panel's drawer gives focus back to its button,
      // where closing this dialog returns it. A docked panel stays open,
      // and focus returns to Quick Add, which a click doesn't focus in
      // Safari.
      returnFocusRef.current = event.currentTarget;
      if (closePanelAround(event)) {
        const { activeElement } = document;
        if (activeElement instanceof HTMLElement) {
          returnFocusRef.current = activeElement;
        }
      }
      setQuests(undefined);
      setFailure(undefined);
      setOpen(true);
      listQuickAddQuests()
        .then((offered) => {
          setQuests(offered);
          setQuestId(chosenQuest(offered, pathname));
        })
        .catch(() => setFailure(QUICK_ADD_COPY.failed));
    },
    [pathname],
  );
  const restoreFocus = useCallback((event: Event): void => {
    event.preventDefault();
    returnFocusRef.current?.focus();
  }, []);
  const closeDialog = useCallback((): void => setOpen(false), []);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Button className="w-full justify-start" onClick={openDialog}>
        <Icon name="plus" />
        {QUICK_ADD_COPY.panelItem}
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
              {QUICK_ADD_COPY.heading}
            </Dialog.Title>
            <Dialog.Close asChild={true}>
              <Button
                aria-label={QUICK_ADD_COPY.close}
                className="min-w-(--target-size)"
                variant="secondary"
              >
                <Icon name="close" />
              </Button>
            </Dialog.Close>
          </div>
          <p className="text-muted" id={introId}>
            {QUICK_ADD_COPY.intro}
          </p>
          {quests === undefined && failure === undefined && (
            <p className="text-muted">{QUICK_ADD_COPY.loading}</p>
          )}
          {quests?.length === 0 && (
            <Notice>
              {QUICK_ADD_COPY.noQuests}{" "}
              <Link href="/quests" onClick={closeDialog}>
                {QUICK_ADD_COPY.noQuestsLink}
              </Link>
            </Notice>
          )}
          {quests !== undefined && quests.length > 0 && (
            <QuickAddForm questId={questId} quests={quests} />
          )}
          {failure !== undefined && <Alert>{failure}</Alert>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export { QuickAdd };
