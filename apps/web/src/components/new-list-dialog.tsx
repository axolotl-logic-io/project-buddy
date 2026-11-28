"use client";

import { useRouter } from "next/navigation";
import { Dialog } from "radix-ui";
import {
  type ChangeEvent,
  type JSX,
  type ReactNode,
  type SubmitEvent,
  type SyntheticEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
} from "react";
import { FormDialog } from "@/components/form-dialog.tsx";
import { NewListBackContext } from "@/components/new-list-back-context.ts";
import { NewListFoot } from "@/components/new-list-foot.tsx";
import type { NewListZotero } from "@/components/new-list-zotero.ts";
import { Button } from "@/components/ui/button.tsx";
import { TextField } from "@/components/ui/field.tsx";
import { Alert, FormStatus } from "@/components/ui/form-message.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import type { QuestId } from "@/ids.ts";
import { LIST_TYPE, type ListId, type ListType } from "@/lists/list.ts";
import { saveListAction } from "@/lists/list-actions.ts";
import { LISTS_COPY } from "@/ui/copy/lists.ts";
import { QUEST_OVERVIEW_COPY } from "@/ui/copy/quest-overview.ts";

const COPY: typeof QUEST_OVERVIEW_COPY.newList = QUEST_OVERVIEW_COPY.newList;

// The kinds New list offers, in this order; Zotero Collection only to the
// quest's owner.
const TYPES: readonly ListType[] = [
  "task",
  "plain",
  "quick-note",
  "tally",
  "zotero-collection",
];

// The dialog's two steps: the kind of list, then what that kind needs.
type Step = "kind" | "details";

// What takes focus when a step opens, in this order of preference: its
// chosen kind, a name field, a collection, else its first button.
const STEP_STARTS = [
  "input:checked",
  "input:not([type])",
  ".zotero-collection input",
  "button",
];

function focusStepStart(step: HTMLElement | null): void {
  for (const selector of STEP_STARTS) {
    const start = step?.querySelector<HTMLElement>(selector);
    if (start !== null && start !== undefined) {
      start.focus();
      return;
    }
  }
}

// The dialog's forms are in the add box's form in React's tree, so their
// submits stop here instead of reaching it.
function stopSubmit(event: SyntheticEvent): void {
  event.stopPropagation();
}

// Where the dialog is, as a numbered pair: Kind, then Details, with the
// current step's number filled.
function StepMarks({ step }: { readonly step: Step }): JSX.Element {
  const steps: readonly (readonly [Step, string])[] = [
    ["kind", COPY.kind],
    ["details", COPY.details],
  ];
  return (
    <ol className="new-list-steps" aria-label={COPY.steps}>
      {steps.map(([each, name], index) => {
        let current: "step" | undefined;
        if (each === step) {
          current = "step";
        }
        return (
          <li key={each} className="new-list-step" aria-current={current}>
            <span className="new-list-step-number" aria-hidden="true">
              {index + 1}
            </span>
            {name}
          </li>
        );
      })}
    </ol>
  );
}

// The first step: the kinds of list as tiles, then Cancel and Next.
function KindStep({
  types,
  type,
  onChoose,
  onNext,
}: {
  readonly types: readonly ListType[];
  readonly type: ListType;
  readonly onChoose: (type: ListType) => void;
  readonly onNext: () => void;
}): JSX.Element {
  const groupId = useId();
  const choose = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      const next = LIST_TYPE.safeParse(event.currentTarget.value).data;
      if (next !== undefined) {
        onChoose(next);
      }
    },
    [onChoose],
  );
  const next = useCallback(
    (event: SubmitEvent<HTMLFormElement>): void => {
      event.preventDefault();
      onNext();
    },
    [onNext],
  );
  return (
    <form className="new-list-form" onSubmit={next}>
      <fieldset className="new-list-kinds">
        <legend className="sr-only">{COPY.kindLegend}</legend>
        {types.map((option) => (
          <label key={option} className="new-list-kind" data-kind={option}>
            <input
              type="radio"
              name={groupId}
              value={option}
              checked={option === type}
              onChange={choose}
            />
            <Icon className="new-list-kind-icon" name={`list-${option}`} />
            <span className="new-list-kind-text">
              <span className="new-list-kind-name">
                {LISTS_COPY.types[option]}
              </span>
              <span className="new-list-kind-hint">{COPY.tiles(option)}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <NewListFoot>
        <Dialog.Close asChild={true}>
          <Button variant="quiet">{COPY.cancel}</Button>
        </Dialog.Close>
        <Button type="submit">
          {COPY.next}
          <Icon name="chevron-right" />
        </Button>
      </NewListFoot>
    </form>
  );
}

// The name of a list of one of the item kinds, then Back and Create list.
function ItemListForm({
  questId,
  type,
  known,
  onMade,
}: {
  readonly questId: QuestId;
  readonly type: ListType;
  readonly known: readonly ListId[];
  readonly onMade: (known: readonly ListId[], name: string) => void;
}): JSX.Element {
  const [making, setMaking] = useState<boolean>(false);
  const [refused, setRefused] = useState<string | undefined>();
  const make = useCallback(
    async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      form.set("questId", questId);
      form.set("type", type);
      const name = String(form.get("name") ?? "").trim();
      setRefused(undefined);
      setMaking(true);
      let result: Awaited<ReturnType<typeof saveListAction>> = {
        error: COPY.failed,
      };
      try {
        result = await saveListAction({}, form);
      } catch {
        // COPY.failed says the list wasn't made.
      }
      setMaking(false);
      if (result.saved !== true) {
        setRefused(result.error);
        return;
      }
      // known is the lists from before the action, in this render.
      onMade(known, name);
    },
    [known, onMade, questId, type],
  );
  let status = "";
  if (making) {
    status = COPY.creating;
  }
  return (
    <form className="new-list-form" onSubmit={make}>
      <TextField
        autoComplete="off"
        label={LISTS_COPY.fields.name}
        hint={COPY.hints(type)}
        name="name"
        required={true}
      />
      {refused !== undefined && (
        <Alert>
          <span>{refused}</span>
        </Alert>
      )}
      <FormStatus>{status}</FormStatus>
      <NewListFoot>
        <Button aria-busy={making} disabled={making} type="submit">
          {COPY.create}
        </Button>
      </NewListFoot>
    </form>
  );
}

// New list in the add box, and its dialog, in two steps: the new list's
// kind, then its name, or Zotero setup for a Zotero Collection. Opening
// and closing it makes nothing; only its forms do. It opens by itself on
// Zotero setup when the page shows it, as when Zotero sends the owner
// back.
function NewListDialog({
  questId,
  known,
  zotero,
  onMade,
}: {
  readonly questId: QuestId;
  // The quest's lists now.
  readonly known: readonly ListId[];
  // Zotero setup, for the quest's owner alone.
  readonly zotero: NewListZotero | undefined;
  // Called when a list is made, with the lists there were before it.
  readonly onMade: (known: readonly ListId[], name: string) => void;
}): JSX.Element {
  const router = useRouter();
  const setupShown = zotero?.setup !== undefined;
  const [open, setOpen] = useState(setupShown);
  const [type, setType] = useState<ListType>(() => {
    if (setupShown) {
      return "zotero-collection";
    }
    return "task";
  });
  const [step, setStep] = useState<Step>(() => {
    if (setupShown) {
      return "details";
    }
    return "kind";
  });
  const [loading, startLoading] = useTransition();
  const stepRef = useRef<HTMLDivElement>(null);
  const movedRef = useRef<boolean>(false);
  // A new step's first control takes focus, as the button that moved
  // there is gone.
  useEffect(() => {
    if (!movedRef.current) {
      return;
    }
    movedRef.current = false;
    focusStepStart(stepRef.current);
  });
  const changeOpen = useCallback(
    (next: boolean): void => {
      setOpen(next);
      if (next) {
        return;
      }
      setType("task");
      setStep("kind");
      if (zotero !== undefined && zotero.setup !== undefined) {
        router.replace(zotero.back, { scroll: false });
      }
    },
    [router, zotero],
  );
  const toDetails = useCallback((): void => {
    movedRef.current = true;
    setStep("details");
    if (
      type === "zotero-collection" &&
      zotero !== undefined &&
      zotero.setup === undefined
    ) {
      startLoading(() => {
        router.replace(zotero.href, { scroll: false });
      });
    }
  }, [router, type, zotero]);
  const toKind = useCallback((): void => {
    movedRef.current = true;
    setStep("kind");
  }, []);
  const made = useCallback(
    (before: readonly ListId[], name: string): void => {
      setOpen(false);
      setType("task");
      setStep("kind");
      onMade(before, name);
    },
    [onMade],
  );
  const types = TYPES.filter(
    (option) => option !== "zotero-collection" || zotero !== undefined,
  );
  let body: ReactNode;
  if (step === "kind") {
    body = (
      <KindStep
        types={types}
        type={type}
        onChoose={setType}
        onNext={toDetails}
      />
    );
  } else if (type !== "zotero-collection") {
    body = (
      <ItemListForm
        key={type}
        questId={questId}
        type={type}
        known={known}
        onMade={made}
      />
    );
  } else if (zotero?.setup !== undefined && !loading) {
    body = zotero.setup;
  } else {
    body = (
      <>
        <p className="zotero-hint" role="status">
          {COPY.loadingZotero}
        </p>
        <NewListFoot />
      </>
    );
  }
  let title: string = COPY.title;
  if (step === "details") {
    title = COPY.titleOf(type);
  }
  let back: (() => void) | undefined;
  if (step === "details") {
    back = toKind;
  }
  return (
    <FormDialog
      title={title}
      closeLabel={COPY.close}
      open={open}
      onOpenChange={changeOpen}
      trigger={
        <Button variant="quiet" className="add-box-new">
          <Icon name="plus" />
          {QUEST_OVERVIEW_COPY.addBox.newList}
        </Button>
      }
    >
      <div className="new-list" onSubmit={stopSubmit} ref={stepRef}>
        <StepMarks step={step} />
        <NewListBackContext value={back}>{body}</NewListBackContext>
      </div>
    </FormDialog>
  );
}

export { NewListDialog };
