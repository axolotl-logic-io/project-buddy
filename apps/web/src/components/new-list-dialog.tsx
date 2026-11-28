"use client";

import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  type JSX,
  type ReactNode,
  type SubmitEvent,
  type SyntheticEvent,
  useCallback,
  useId,
  useState,
  useTransition,
} from "react";
import { FormDialog } from "@/components/form-dialog.tsx";
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

// The types New list offers, in this order; Zotero Collection only to the
// quest's owner.
const TYPES: readonly ListType[] = [
  "task",
  "plain",
  "quick-note",
  "tally",
  "zotero-collection",
];

// The dialog's forms are in the add box's form in React's tree, so their
// submits stop here instead of reaching it.
function stopSubmit(event: SyntheticEvent): void {
  event.stopPropagation();
}

// The name of a list of one of the item types, and Create list.
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
        name="name"
        required={true}
      />
      {refused !== undefined && (
        <Alert>
          <span>{refused}</span>
        </Alert>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button aria-busy={making} disabled={making} type="submit">
          {COPY.create}
        </Button>
        <FormStatus>{status}</FormStatus>
      </div>
    </form>
  );
}

// New list in the add box, and its dialog: the new list's type, then its
// name, or Zotero setup for a Zotero Collection. Opening and closing it
// makes nothing; only its forms do. It opens by itself on Zotero
// Collection when the page shows Zotero setup, as when Zotero sends the
// owner back.
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
  const groupId = useId();
  const setupShown = zotero?.setup !== undefined;
  const [open, setOpen] = useState(setupShown);
  const [type, setType] = useState<ListType>(() => {
    if (setupShown) {
      return "zotero-collection";
    }
    return "task";
  });
  const [loading, startLoading] = useTransition();
  const changeOpen = useCallback(
    (next: boolean): void => {
      setOpen(next);
      if (next) {
        return;
      }
      setType("task");
      if (zotero !== undefined && zotero.setup !== undefined) {
        router.replace(zotero.back, { scroll: false });
      }
    },
    [router, zotero],
  );
  const choose = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      const next = LIST_TYPE.safeParse(event.currentTarget.value).data;
      if (next === undefined) {
        return;
      }
      setType(next);
      if (
        next === "zotero-collection" &&
        zotero !== undefined &&
        zotero.setup === undefined
      ) {
        startLoading(() => {
          router.replace(zotero.href, { scroll: false });
        });
      }
    },
    [router, zotero],
  );
  const made = useCallback(
    (before: readonly ListId[], name: string): void => {
      setOpen(false);
      setType("task");
      onMade(before, name);
    },
    [onMade],
  );
  const types = TYPES.filter(
    (option) => option !== "zotero-collection" || zotero !== undefined,
  );
  let body: ReactNode;
  if (type !== "zotero-collection") {
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
      <p className="zotero-hint" role="status">
        {COPY.loadingZotero}
      </p>
    );
  }
  return (
    <FormDialog
      title={COPY.title}
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
      <div className="new-list" onSubmit={stopSubmit}>
        <fieldset className="new-list-types">
          <legend id={groupId}>{LISTS_COPY.fields.type}</legend>
          {types.map((option) => (
            <label key={option} className="new-list-type">
              <input
                type="radio"
                name={groupId}
                value={option}
                checked={option === type}
                onChange={choose}
              />
              <span className="new-list-type-text">
                <span className="new-list-type-name">
                  {LISTS_COPY.types[option]}
                </span>
                <span className="new-list-type-hint">{COPY.hints(option)}</span>
              </span>
            </label>
          ))}
        </fieldset>
        {body}
      </div>
    </FormDialog>
  );
}

export { NewListDialog };
