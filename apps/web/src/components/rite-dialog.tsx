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
import { usePerformanceStart } from "@/components/performance-start.ts";
import { Button } from "@/components/ui/button.tsx";
import { Alert } from "@/components/ui/form-message.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import type { List } from "@/lists/list-store.ts";
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

// Why the server refused the last performance, and the rite it was of.
interface Refusal {
  readonly problem: string;
  readonly riteId: string;
}

// The dialog's content. It mounts each time the dialog opens, so each
// choice starts afresh, or from the refused one.
function RiteForm({
  list,
  rites,
  refusal,
  onPerform,
}: {
  readonly list: List;
  readonly rites: readonly Rite[];
  readonly refusal: Refusal | undefined;
  readonly onPerform: (rite: Rite) => void;
}): JSX.Element {
  const perform = useCallback(
    (event: SubmitEvent<HTMLFormElement>): void => {
      event.preventDefault();
      const riteId = new FormData(event.currentTarget).get("riteId");
      const rite = rites.find(({ id }) => id === riteId);
      if (rite !== undefined) {
        onPerform(rite);
      }
    },
    [onPerform, rites],
  );
  const first = refusal?.riteId ?? rites[0]?.id;
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
          first={first}
        />
        <RiteGroup legend={COPY.own} rites={own} list={list} first={first} />
        {refusal !== undefined && <Alert>{refusal.problem}</Alert>}
        <div className="flex flex-wrap justify-end gap-2">
          <Dialog.Close asChild={true}>
            <Button variant="quiet">{COPY.cancel}</Button>
          </Dialog.Close>
          <Button type="submit">{PERFORMANCE_COPY.start}</Button>
        </div>
      </form>
    </>
  );
}

// A list card's Perform a rite button and the modal dialog it opens, where
// the user chooses one of their rites, built in or their own, each shown
// with its first message for the list, and performs it on the list. The
// first rite is chosen when it opens. Performing it closes the dialog and
// shows the performance at once, after the list sections, with focus on its
// name; if the server refuses it, the performance goes and the dialog opens
// again with that rite chosen and says why. Escape, Cancel, the close
// button or a click beside it closes it.
function RiteDialog({
  list,
  rites,
}: {
  readonly list: List;
  readonly rites: readonly Rite[];
}): JSX.Element {
  const { start } = usePerformanceStart();
  const [open, setOpen] = useState(false);
  const [refusal, setRefusal] = useState<Refusal | undefined>();
  const performedRef = useRef<boolean>(false);
  const perform = useCallback(
    (rite: Rite): void => {
      performedRef.current = true;
      setOpen(false);
      setRefusal(undefined);
      start(rite, list, (problem: string): void => {
        setRefusal({ problem, riteId: rite.id });
        setOpen(true);
      });
    },
    [list, start],
  );
  const changeOpen = useCallback((next: boolean): void => {
    performedRef.current = false;
    if (!next) {
      setRefusal(undefined);
    }
    setOpen(next);
  }, []);
  const placeFocus = useCallback((event: Event): void => {
    if (!performedRef.current) {
      return;
    }
    event.preventDefault();
    // The page scrolls to the performance's composer, so focus doesn't
    // scroll it.
    (
      document.querySelector<HTMLElement>("[data-performance-heading]") ??
      document.querySelector<HTMLElement>("[data-quest-overview-heading]")
    )?.focus({ preventScroll: true });
  }, []);
  return (
    <Dialog.Root open={open} onOpenChange={changeOpen}>
      <Dialog.Trigger asChild={true}>
        <Button
          variant="quiet"
          className="rite-open"
          aria-label={QUEST_OVERVIEW_COPY.performRiteOn(list.name)}
          title={QUEST_OVERVIEW_COPY.performRiteOn(list.name)}
        >
          <Icon name="candle" />
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content
          className="dialog-panel rite-dialog"
          onCloseAutoFocus={placeFocus}
        >
          <RiteForm
            list={list}
            rites={rites}
            refusal={refusal}
            onPerform={perform}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export { RiteDialog };
