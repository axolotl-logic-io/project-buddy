"use client";

import { type JSX, type SubmitEvent, useCallback } from "react";
import { LocalTime } from "@/components/local-time.tsx";
import { TallyCard } from "@/components/tally-card.tsx";
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
import type { QuestId } from "@/ids.ts";
import {
  LIST_ID,
  type ListType,
  listItemLimit,
  listItemText,
} from "@/lists/list.ts";
import { LIST_ITEM_CHANGE, type ListItemChange } from "@/lists/list-item.ts";
import { changeListItemAction } from "@/lists/list-item-actions.ts";
import type { ListItem } from "@/lists/list-item-store.ts";
import type { List } from "@/lists/list-store.ts";
import {
  type StreakChain,
  streakChains,
  type TaskHistory,
} from "@/streaks/streaks.ts";
import type { Tally, TallyChanges, TallyQuest } from "@/tallies/tally.ts";
import {
  incrementTallyAction,
  setTallyDayAction,
} from "@/tallies/tally-actions.ts";
import { LISTS_COPY } from "@/ui/copy/lists.ts";

interface ListItemsProps {
  readonly questId: QuestId;
  readonly list: List;
  readonly contents: readonly ListItem[];
  readonly destinations: readonly List[];
  // The quest's check-off history, which gives recurring tasks' streaks.
  readonly history?: TaskHistory | undefined;
  // The quest's tallies, for a tally list's counter cards.
  readonly tallies?: TallyQuest | undefined;
}

type RunChange = (change: ListItemChange) => Promise<boolean>;

// A tally list's counter card for a list item, with its quest's today and
// the changes it runs.
interface TallyOf {
  readonly tally: Tally;
  readonly today: TallyQuest["today"];
  readonly changes: TallyChanges;
  readonly busy: boolean;
}

function editorFor(type: ListType): EditorOptions {
  return {
    label: LISTS_COPY.editListItem(type),
    placeholder: LISTS_COPY.addListItem(type),
    save: LISTS_COPY.saveEdit,
    cancel: LISTS_COPY.cancelEdit,
    maxLength: listItemLimit(type),
    multiline: type === "quick-note",
    validate: (value: string): ReturnType<EditorOptions["validate"]> => {
      const text = listItemText(type).safeParse(value).data;
      if (text === undefined) {
        return { problem: LISTS_COPY.changeProblems["invalid-text"] };
      }
      return { text };
    },
  };
}

function ListItemRow({
  item,
  list,
  destinations,
  run,
  busy,
  chain,
  card,
}: Omit<ListItemsProps, "contents" | "questId" | "history" | "tallies"> & {
  readonly item: ListItem;
  readonly run: RunChange;
  readonly busy: boolean;
  readonly chain?: StreakChain | undefined;
  readonly card?: TallyOf | undefined;
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
      const destination = LIST_ID.safeParse(
        new FormData(event.currentTarget).get("destination"),
      ).data;
      if (destination !== undefined) {
        await run({ kind: "move", id, destination });
      }
    },
    [id, run],
  );
  let recurringLabel = LISTS_COPY.makeRecurring;
  if (item.recurring) {
    ({ makeOneOff: recurringLabel } = LISTS_COPY);
  }
  let badge: JSX.Element | undefined;
  if (item.recurring) {
    badge = (
      <span role="img" aria-label={LISTS_COPY.recurring}>
        <Icon name="repeat" />
      </span>
    );
  }
  let checked: boolean | undefined;
  let toggleLabel = LISTS_COPY.checkOff;
  let menuLabel: string | undefined;
  let detail: JSX.Element | undefined;
  let leading: JSX.Element | undefined;
  if (list.type === "task") {
    checked = checkedOff;
  }
  if (checkedOff) {
    ({ uncheck: toggleLabel } = LISTS_COPY);
  }
  if (item.taskNumber !== null) {
    menuLabel = LISTS_COPY.taskNumber(item.taskNumber);
  }
  if (list.type === "quick-note") {
    leading = <LocalTime dateTime={item.createdAt} detail="day" />;
  }
  if (destinations.length > 0) {
    detail = (
      <details>
        <summary>{LISTS_COPY.moveTo}</summary>
        <form onSubmit={move} className="flex flex-wrap items-end gap-2">
          <SelectField label={LISTS_COPY.destination} name="destination">
            {destinations.map((destination) => (
              <option key={destination.id} value={destination.id}>
                {destination.name}
              </option>
            ))}
          </SelectField>
          <Button type="submit" variant="quiet" disabled={busy}>
            {LISTS_COPY.move}
          </Button>
        </form>
      </details>
    );
  }
  return (
    <EditableListRow
      id={id}
      text={item.text}
      editor={editorFor(list.type)}
      editLabel={LISTS_COPY.editListItem(list.type)}
      actionsLabel={LISTS_COPY.actions(list.type)}
      menuLabel={menuLabel}
      checked={checked}
      toggleLabel={toggleLabel}
      onToggle={toggle}
      disabled={busy}
      onSave={save}
      detail={
        <>
          {chain !== undefined && <Streak chain={chain} />}
          {card !== undefined && <TallyCard {...card} />}
          {detail}
        </>
      }
      badge={badge}
      leading={leading}
    >
      <EditableListAction icon="arrow-up" onSelect={up}>
        {LISTS_COPY.moveUp}
      </EditableListAction>
      <EditableListAction icon="arrow-down" onSelect={down}>
        {LISTS_COPY.moveDown}
      </EditableListAction>
      {list.type === "task" && (
        <EditableListAction icon="repeat" onSelect={recurring}>
          {recurringLabel}
        </EditableListAction>
      )}
      <EditableListAction icon="trash" onSelect={remove}>
        {LISTS_COPY.removeListItem(list.type)}
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
      <span className="streak-note">{LISTS_COPY.streakNote(chain)}</span>
    </span>
  );
}

function ListItems({
  questId,
  list,
  contents,
  destinations,
  history,
  tallies,
}: ListItemsProps): JSX.Element {
  const {
    run: save,
    undoVersion,
    busy,
    status,
    problem,
  } = useQuestAction(changeListItemAction);
  const { run: runIncrement, ...increment } =
    useQuestAction(incrementTallyAction);
  const { run: runSet, ...set } = useQuestAction(setTallyDayAction);
  const listId = list.id;
  const run = useCallback(
    (change: ListItemChange): Promise<boolean> =>
      save({ questId, listId, change }),
    [questId, save, listId],
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
      const change = LIST_ITEM_CHANGE.safeParse({
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
  let chains: ReturnType<typeof streakChains> = new Map();
  if (history !== undefined) {
    chains = streakChains(
      history,
      contents.flatMap(
        ({ taskNumber, text, checkedOff, recurring, createdAt }) => {
          if (taskNumber === null || !recurring) {
            return [];
          }
          return [{ number: taskNumber, text, done: checkedOff, createdAt }];
        },
      ),
    );
  }
  const tallyBusy = increment.busy || set.busy;
  function cardOf(item: ListItem): TallyOf | undefined {
    const tally = tallies?.tallies.find(({ id }) => id === item.id);
    if (tallies === undefined || tally === undefined) {
      return;
    }
    const { today } = tallies;
    return {
      tally,
      today,
      busy: tallyBusy || busy,
      changes: {
        increment: (amount: string): Promise<boolean> =>
          runIncrement({ questId, id: item.id, amount }),
        setToday: (total: string): Promise<boolean> =>
          runSet({ questId, id: item.id, date: today, total }),
      },
    };
  }
  function row(item: ListItem): JSX.Element {
    const chain = chains.get(item.taskNumber ?? 0);
    return (
      <ListItemRow
        key={item.id}
        item={item}
        chain={chain}
        card={cardOf(item)}
        list={list}
        destinations={destinations}
        run={run}
        busy={busy}
      />
    );
  }
  const done = contents.filter(({ checkedOff }) => checkedOff);
  const addLabel = LISTS_COPY.addListItem(list.type);
  let layout: "rows" | "cards" = "rows";
  if (list.type === "tally") {
    layout = "cards";
  }
  const tallyProblem = increment.problem ?? set.problem;
  return (
    <EditableListScope blocked={busy}>
      <div className="grid gap-3">
        <FormStatus>{status ?? increment.status ?? set.status}</FormStatus>
        {undoVersion !== undefined && (
          <Button variant="quiet" onClick={undo} disabled={busy}>
            {LISTS_COPY.undo}
          </Button>
        )}
        {problem !== undefined && <Alert>{problem}</Alert>}
        {tallyProblem !== undefined && <Alert>{tallyProblem}</Alert>}
        <AddListItem
          label={addLabel}
          editor={{
            ...editorFor(list.type),
            label: addLabel,
            save: addLabel,
          }}
          disabled={busy}
          onSave={add}
        />
        <EditableList label={list.name} layout={layout} onMove={place}>
          {contents.filter(({ checkedOff }) => !checkedOff).map(row)}
        </EditableList>
        {done.length > 0 && (
          <details>
            <summary>{LISTS_COPY.done}</summary>
            <EditableList label={LISTS_COPY.done}>{done.map(row)}</EditableList>
          </details>
        )}
      </div>
    </EditableListScope>
  );
}

export { ListItems };
