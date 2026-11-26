"use client";

import { Dialog } from "radix-ui";
import {
  type JSX,
  type SubmitEvent,
  useCallback,
  useId,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button.tsx";
import { Alert } from "@/components/ui/form-message.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import type { QuestId } from "@/ids.ts";
import type { List } from "@/lists/list-store.ts";
import { startPerformanceAction } from "@/performances/performance-actions.ts";
import { type Rite, riteFirstMessage } from "@/rites/rite.ts";
import { PERFORMANCE_COPY } from "@/ui/copy/performances.ts";
import { QUEST_OVERVIEW_COPY } from "@/ui/copy/quest-overview.ts";

const COPY: typeof QUEST_OVERVIEW_COPY.rite = QUEST_OVERVIEW_COPY.rite;

// One group of rites, built in or the user's own, each a choice with its
// first message for the list.
function RiteGroup({
  legend,
  rites,
  list,
  first,
}: {
  readonly legend: string;
  readonly rites: readonly Rite[];
  readonly list: List;
  // The rite chosen when the dialog opens.
  readonly first: string | undefined;
}): JSX.Element | undefined {
  const groupId = useId();
  if (rites.length === 0) {
    return undefined;
  }
  return (
    <fieldset className="rite-group">
      <legend className="rite-group-label">{legend}</legend>
      {rites.map((rite) => (
        <label
          key={rite.id}
          className="rite-option"
          htmlFor={`${groupId}-${rite.id}`}
        >
          <input
            id={`${groupId}-${rite.id}`}
            type="radio"
            name="riteId"
            value={rite.id}
            defaultChecked={rite.id === first}
            required={true}
          />
          <span className="rite-option-name">{rite.name}</span>
          <q className="rite-option-message">{riteFirstMessage(rite, list)}</q>
        </label>
      ))}
    </fieldset>
  );
}

// The dialog's content. It mounts each time the dialog opens, so each
// choice starts afresh.
function RiteForm({
  questId,
  list,
  rites,
  onPerformed,
}: {
  readonly questId: QuestId;
  readonly list: List;
  readonly rites: readonly Rite[];
  readonly onPerformed: () => void;
}): JSX.Element {
  const [problem, setProblem] = useState<string | undefined>(undefined);
  const [pending, setPending] = useState(false);
  const perform = useCallback(
    async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();
      setPending(true);
      setProblem(undefined);
      let refused: string | undefined = PERFORMANCE_COPY.unavailable;
      try {
        refused = await startPerformanceAction({
          questId,
          riteId: new FormData(event.currentTarget).get("riteId"),
          listId: list.id,
        });
      } catch {
        refused = PERFORMANCE_COPY.unavailable;
      }
      setPending(false);
      if (refused === undefined) {
        onPerformed();
        return;
      }
      setProblem(refused);
    },
    [list.id, onPerformed, questId],
  );
  const builtIn = rites.filter(({ source }) => source === "built-in");
  const own = rites.filter(({ source }) => source === "own");
  return (
    <>
      <div className="rite-dialog-head">
        <Dialog.Title className="section-heading">
          {QUEST_OVERVIEW_COPY.performRite}
        </Dialog.Title>
        <Dialog.Close asChild={true}>
          <Button aria-label={COPY.close} variant="quiet">
            <Icon name="close" />
          </Button>
        </Dialog.Close>
      </div>
      <Dialog.Description className="rite-dialog-list">
        {COPY.on(list.name)}
      </Dialog.Description>
      <form className="rite-dialog-form" onSubmit={perform}>
        <RiteGroup
          legend={COPY.builtIn}
          rites={builtIn}
          list={list}
          first={rites[0]?.id}
        />
        <RiteGroup
          legend={COPY.own}
          rites={own}
          list={list}
          first={rites[0]?.id}
        />
        {problem !== undefined && <Alert>{problem}</Alert>}
        <div className="flex flex-wrap justify-end gap-2">
          <Dialog.Close asChild={true}>
            <Button variant="quiet">{COPY.cancel}</Button>
          </Dialog.Close>
          <Button type="submit" aria-busy={pending} disabled={pending}>
            {PERFORMANCE_COPY.start}
          </Button>
        </div>
      </form>
    </>
  );
}

// A list card's Perform a rite button and the modal dialog it opens, where
// the user chooses one of their rites, built in or their own, each shown
// with its first message for the list, and performs it on the list. The
// first rite is chosen when it opens. A refused performance keeps the
// dialog open and says why. Escape, Cancel, the close button or a click
// beside it closes it. Once the rite is performed the button is gone, so
// focus goes to the quest's title, just above the performance.
function RiteDialog({
  questId,
  list,
  rites,
}: {
  readonly questId: QuestId;
  readonly list: List;
  readonly rites: readonly Rite[];
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const performedRef = useRef<boolean>(false);
  const performed = useCallback((): void => {
    performedRef.current = true;
    setOpen(false);
  }, []);
  const changeOpen = useCallback((next: boolean): void => {
    performedRef.current = false;
    setOpen(next);
  }, []);
  const placeFocus = useCallback((event: Event): void => {
    if (!performedRef.current) {
      return;
    }
    event.preventDefault();
    document
      .querySelector<HTMLElement>("[data-quest-overview-heading]")
      ?.focus();
  }, []);
  return (
    <Dialog.Root open={open} onOpenChange={changeOpen}>
      <Dialog.Trigger asChild={true}>
        <Button
          variant="secondary"
          className="rite-open"
          aria-label={QUEST_OVERVIEW_COPY.performRiteOn(list.name)}
        >
          <Icon name="candle" />
          {QUEST_OVERVIEW_COPY.performRite}
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content
          className="dialog-panel rite-dialog"
          onCloseAutoFocus={placeFocus}
        >
          <RiteForm
            questId={questId}
            list={list}
            rites={rites}
            onPerformed={performed}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export { RiteDialog };
