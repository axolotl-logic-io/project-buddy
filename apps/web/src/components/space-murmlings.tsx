"use client";

import { type JSX, type SubmitEvent, useCallback } from "react";
import { LocalTime } from "@/components/local-time.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  AddListItem,
  EditableList,
  EditableListAction,
  EditableListRow,
  EditableListScope,
} from "@/components/ui/editable-list.tsx";
import type { EditorOptions } from "@/components/ui/editable-list-contract.ts";
import { SelectField } from "@/components/ui/field.tsx";
import { Alert, FormStatus } from "@/components/ui/form-message.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import { useQuestAction } from "@/components/use-quest-action.ts";
import {
  type DailiesDay,
  type StreakChain,
  streakChains,
} from "@/dailies/dailies.ts";
import type { QuestId } from "@/ids.ts";
import { MURMLING_CHANGE, type MurmlingChange } from "@/spaces/murmling.ts";
import { changeMurmlingAction } from "@/spaces/murmling-actions.ts";
import type { Murmling } from "@/spaces/murmling-store.ts";
import {
  MURMLING_TYPE,
  type MurmlingType,
  murmlingLimit,
  murmlingText,
  SPACE_ID,
} from "@/spaces/space.ts";
import type { Space } from "@/spaces/space-store.ts";
import { SPACES_COPY } from "@/ui/copy/spaces.ts";

interface SpaceMurmlingsProps {
  readonly questId: QuestId;
  readonly space: Space;
  readonly contents: readonly Murmling[];
  readonly destinations: readonly Space[];
  readonly days?: readonly DailiesDay[] | undefined;
}

type RunChange = (change: MurmlingChange) => Promise<boolean>;

function editorFor(noun: string, type: MurmlingType): EditorOptions {
  return {
    label: SPACES_COPY.editMurmling(noun),
    placeholder: SPACES_COPY.addMurmling(noun),
    save: SPACES_COPY.saveEdit,
    cancel: SPACES_COPY.cancelEdit,
    maxLength: murmlingLimit(type),
    multiline: type === "quick-note",
    validate: (value: string): ReturnType<EditorOptions["validate"]> => {
      const text = murmlingText(type).safeParse(value).data;
      if (text === undefined) {
        return { problem: SPACES_COPY.changeProblems["invalid-text"] };
      }
      return { text };
    },
  };
}

function MarkType({
  id,
  type,
  run,
}: {
  readonly id: Murmling["id"];
  readonly type: MurmlingType;
  readonly run: RunChange;
}): JSX.Element {
  const mark = useCallback(async (): Promise<void> => {
    await run({ kind: "type", id, type });
  }, [id, run, type]);
  return (
    <EditableListAction icon="checklist" onSelect={mark}>
      {SPACES_COPY.markAs(SPACES_COPY.types[type])}
    </EditableListAction>
  );
}

function MurmlingRow({
  item,
  space,
  destinations,
  run,
  busy,
  days,
  chain,
}: Omit<SpaceMurmlingsProps, "contents" | "questId"> & {
  readonly item: Murmling;
  readonly run: RunChange;
  readonly busy: boolean;
  readonly chain?: StreakChain | undefined;
}): JSX.Element {
  const { id, checkedOff } = item;
  const save = useCallback(
    (text: string): Promise<boolean> => run({ kind: "edit", id, text }),
    [id, run],
  );
  const remove = useCallback(async (): Promise<void> => {
    await run({ kind: "remove", id });
  }, [id, run]);
  const up = useCallback(async (): Promise<void> => {
    await run({ kind: "reorder", id, direction: "up" });
  }, [id, run]);
  const down = useCallback(async (): Promise<void> => {
    await run({ kind: "reorder", id, direction: "down" });
  }, [id, run]);
  const toggle = useCallback(async (): Promise<void> => {
    await run({ kind: "check", id, checkedOff: !checkedOff });
  }, [id, run, checkedOff]);
  const recurring = useCallback(async (): Promise<void> => {
    await run({ kind: "recurring", id, recurring: !item.recurring });
  }, [id, item.recurring, run]);
  const move = useCallback(
    async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();
      const destination = SPACE_ID.safeParse(
        new FormData(event.currentTarget).get("destination"),
      ).data;
      if (destination !== undefined) {
        await run({ kind: "move", id, destination });
      }
    },
    [id, run],
  );
  let recurringLabel = SPACES_COPY.makeRecurring;
  if (item.recurring) {
    ({ makeOneOff: recurringLabel } = SPACES_COPY);
  }
  let badge: JSX.Element | undefined;
  if (item.recurring) {
    badge = (
      <span role="img" aria-label={SPACES_COPY.recurring}>
        <Icon name="repeat" />
      </span>
    );
  }
  let checked: boolean | undefined;
  let toggleLabel = space.checkOff;
  let menuLabel: string | undefined;
  let detail: JSX.Element | undefined;
  let leading: JSX.Element | undefined;
  if (item.type === "task") {
    checked = checkedOff;
  }
  if (checkedOff) {
    toggleLabel = space.uncheck;
  }
  if (item.taskNumber !== null) {
    menuLabel = SPACES_COPY.taskNumber(item.taskNumber);
  }
  if (item.type === "quick-note") {
    leading = <LocalTime dateTime={item.createdAt} detail="day" />;
  }
  if (destinations.length > 0) {
    detail = (
      <details>
        <summary>{SPACES_COPY.moveTo}</summary>
        <form onSubmit={move} className="flex flex-wrap items-end gap-2">
          <SelectField label={SPACES_COPY.destination} name="destination">
            {destinations.map((destination) => (
              <option key={destination.id} value={destination.id}>
                {destination.name}
              </option>
            ))}
          </SelectField>
          <Button type="submit" variant="quiet" disabled={busy}>
            {SPACES_COPY.move}
          </Button>
        </form>
      </details>
    );
  }
  return (
    <EditableListRow
      id={id}
      text={item.text}
      editor={editorFor(space.singular, item.type)}
      editLabel={SPACES_COPY.editMurmling(space.singular)}
      actionsLabel={SPACES_COPY.actions(space.singular)}
      menuLabel={menuLabel}
      checked={checked}
      toggleLabel={toggleLabel}
      onToggle={toggle}
      disabled={busy}
      onSave={save}
      detail={
        <>
          {chain !== undefined && <Streak chain={chain} />}
          {detail}
        </>
      }
      badge={badge}
      leading={leading}
    >
      <EditableListAction icon="arrow-up" onSelect={up}>
        {SPACES_COPY.moveUp}
      </EditableListAction>
      <EditableListAction icon="arrow-down" onSelect={down}>
        {SPACES_COPY.moveDown}
      </EditableListAction>
      {MURMLING_TYPE.options
        .filter((type) => type !== item.type)
        .map((type) => (
          <MarkType key={type} type={type} id={id} run={run} />
        ))}
      {days !== undefined && item.type === "task" && (
        <EditableListAction icon="repeat" onSelect={recurring}>
          {recurringLabel}
        </EditableListAction>
      )}
      <EditableListAction icon="trash" onSelect={remove}>
        {SPACES_COPY.removeMurmling(space.singular)}
      </EditableListAction>
    </EditableListRow>
  );
}

function Streak({ chain }: { readonly chain: StreakChain }): JSX.Element {
  return (
    <span className="streak-chain">
      <span className="streak-links" aria-hidden="true">
        {Array.from({ length: chain.links }, (_, index) => index).map(
          (index) => {
            let mark = "today";
            if (index < chain.earned || chain.doneToday) {
              mark = "earned";
            }
            return (
              <span key={index} className="streak-link" data-link={mark} />
            );
          },
        )}
      </span>
      <span className="streak-note">{SPACES_COPY.streakNote(chain)}</span>
    </span>
  );
}

function SpaceMurmlings({
  questId,
  space,
  contents,
  destinations,
  days,
}: SpaceMurmlingsProps): JSX.Element {
  const {
    run: save,
    undoVersion,
    busy,
    status,
    problem,
  } = useQuestAction(changeMurmlingAction);
  const spaceId = space.id;
  const run = useCallback(
    (change: MurmlingChange): Promise<boolean> =>
      save({ questId, spaceId, change }),
    [questId, save, spaceId],
  );
  const undo = useCallback(async (): Promise<void> => {
    if (undoVersion !== undefined) {
      await run({ kind: "undo", version: undoVersion });
    }
  }, [run, undoVersion]);
  const add = useCallback(
    (text: string): Promise<boolean> => run({ kind: "add", text }),
    [run],
  );
  const place = useCallback(
    (id: string, before: string | undefined): Promise<boolean> => {
      const change = MURMLING_CHANGE.safeParse({
        kind: "place",
        id,
        before,
      }).data;
      if (change === undefined) {
        return Promise.resolve(false);
      }
      return run(change);
    },
    [run],
  );
  const chains = streakChains(days ?? [], {
    items: contents.flatMap(({ taskNumber, text, checkedOff, recurring }) => {
      if (taskNumber === null) {
        return [];
      }
      return [{ number: taskNumber, text, done: checkedOff, recurring }];
    }),
  });
  function row(item: Murmling): JSX.Element {
    const chain = chains.get(item.taskNumber ?? 0);
    return (
      <MurmlingRow
        key={item.id}
        item={item}
        days={days}
        chain={chain}
        space={space}
        destinations={destinations}
        run={run}
        busy={busy}
      />
    );
  }
  const done = contents.filter(({ checkedOff }) => checkedOff);
  const addLabel = SPACES_COPY.addMurmling(space.singular);
  return (
    <EditableListScope blocked={busy}>
      <div className="grid gap-3">
        <FormStatus>{status}</FormStatus>
        {undoVersion !== undefined && (
          <Button variant="quiet" onClick={undo} disabled={busy}>
            {SPACES_COPY.undo}
          </Button>
        )}
        {problem !== undefined && <Alert>{problem}</Alert>}
        <AddListItem
          label={addLabel}
          editor={{
            ...editorFor(space.singular, space.newType),
            label: addLabel,
            save: addLabel,
          }}
          disabled={busy}
          onSave={add}
        />
        <EditableList label={space.plural} onMove={place}>
          {contents.filter(({ checkedOff }) => !checkedOff).map(row)}
        </EditableList>
        {done.length > 0 && (
          <details>
            <summary>{SPACES_COPY.done}</summary>
            <EditableList label={SPACES_COPY.done}>
              {done.map(row)}
            </EditableList>
          </details>
        )}
      </div>
    </EditableListScope>
  );
}

export { SpaceMurmlings };
