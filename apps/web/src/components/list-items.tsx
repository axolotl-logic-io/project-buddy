"use client";

import { type JSX, type SubmitEvent, useCallback } from "react";
import {
  editorFor,
  type ListChanges,
  type TallyOf,
  useListChanges,
  useTallyCards,
} from "@/components/list-changes.ts";
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
import type { SplitOptions } from "@/components/ui/editable-list-contract.ts";
import { SelectField } from "@/components/ui/field.tsx";
import { Alert, FormStatus } from "@/components/ui/form-message.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import type { QuestId } from "@/ids.ts";
import { LIST_ID } from "@/lists/list.ts";
import {
  LIST_ITEM_CHANGE,
  type ListItemChange,
  SPLIT_PARTS,
} from "@/lists/list-item.ts";
import type { ListItem } from "@/lists/list-item-store.ts";
import type { List } from "@/lists/list-store.ts";
import {
  CADENCES,
  type Cadence,
  type StreakChain,
  streakChains,
  type TaskHistory,
} from "@/streaks/streaks.ts";
import type { TallyQuest } from "@/tallies/tally.ts";
import { CADENCE_COPY } from "@/ui/copy/cadence.ts";
import { LISTS_COPY } from "@/ui/copy/lists.ts";
import { QUEST_SIDEBAR_COPY } from "@/ui/copy/quest-sidebar.ts";

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

// What the last change said: its status, Undo while it can be undone, and
// its problem. other is the status of another kind of change, such as a
// tally's, shown when the last list change says nothing.
function ListChangeNotices({
  changes: { undo, busy, status, problem },
  other,
}: {
  readonly changes: ListChanges;
  readonly other?: string | undefined;
}): JSX.Element {
  return (
    <>
      <FormStatus>{status ?? other}</FormStatus>
      {undo !== undefined && (
        <Button variant="quiet" onClick={undo} disabled={busy}>
          {LISTS_COPY.undo}
        </Button>
      )}
      {problem !== undefined && <Alert>{problem}</Alert>}
    </>
  );
}

function ListItemRow({
  item,
  list,
  destinations,
  run,
  busy,
  chain,
  card,
  note,
  next = false,
}: Omit<ListItemsProps, "contents" | "questId" | "history" | "tallies"> & {
  readonly item: ListItem;
  readonly run: RunChange;
  readonly busy: boolean;
  readonly chain?: StreakChain | undefined;
  readonly card?: TallyOf | undefined;
  // A short line under the text, such as a recurring task's streak.
  readonly note?: string | undefined;
  // Whether the item is the quest's next task, marked before its text.
  readonly next?: boolean;
}): JSX.Element {
  const { id, checkedOff } = item;
  const save = useCallback(
    (text: string): Promise<boolean> => run({ kind: "edit", id, text }),
    [id, run],
  );
  const remove = useCallback(async (): Promise<void> => {
    await run({ kind: "remove", id });
  }, [id, run]);
  const splitInto = useCallback(
    (texts: readonly string[]): Promise<boolean> =>
      run({ kind: "split", id, texts: [...texts] }),
    [id, run],
  );
  const toggle = useCallback(async (): Promise<void> => {
    await run({ kind: "check", id, checkedOff: !checkedOff });
  }, [id, run, checkedOff]);
  const oneOff = useCallback(async (): Promise<void> => {
    await run({ kind: "recurring", id, cadence: null });
  }, [id, run]);
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
  let badge: JSX.Element | undefined;
  if (item.recurring) {
    badge = (
      <span role="img" aria-label={CADENCE_COPY.repeats(item.cadence)}>
        <Icon name="repeat" />
      </span>
    );
  }
  let checked: boolean | undefined;
  let toggleLabel = LISTS_COPY.checkOff;
  let menuLabel: string | undefined;
  let detail: JSX.Element | undefined;
  let leading: JSX.Element | undefined;
  let added: JSX.Element | undefined;
  // A checked-off task's text is fixed, so it can't be split either.
  let split: SplitOptions | undefined;
  if (!checkedOff) {
    split = {
      label: LISTS_COPY.splitListItem(list.type),
      copy: LISTS_COPY.split(list.type),
      maxParts: SPLIT_PARTS.max,
      onSplit: splitInto,
    };
  }
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
    added = (
      <span className="item-added">
        <LocalTime dateTime={item.createdAt} detail="day" />
      </span>
    );
  }
  if (next === true) {
    leading = (
      <span
        className="next-task-mark"
        role="img"
        aria-label={QUEST_SIDEBAR_COPY.nextTask}
      />
    );
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
          {added}
          {chain !== undefined && <Streak chain={chain} />}
          {note !== undefined && <span className="streak-note">{note}</span>}
          {card !== undefined && <TallyCard {...card} />}
          {detail}
        </>
      }
      badge={badge}
      leading={leading}
      split={split}
    >
      {list.type === "task" &&
        CADENCES.filter(
          (cadence) => !item.recurring || cadence !== item.cadence,
        ).map((cadence) => (
          <RepeatAction cadence={cadence} id={id} key={cadence} run={run} />
        ))}
      {list.type === "task" && item.recurring && (
        <EditableListAction icon="repeat" onSelect={oneOff}>
          {LISTS_COPY.makeOneOff}
        </EditableListAction>
      )}
      <EditableListAction icon="trash" onSelect={remove}>
        {LISTS_COPY.removeListItem(list.type)}
      </EditableListAction>
    </EditableListRow>
  );
}

// A task menu's choice to make the task repeat with a cadence.
function RepeatAction({
  cadence,
  id,
  run,
}: {
  readonly cadence: Cadence;
  readonly id: ListItem["id"];
  readonly run: RunChange;
}): JSX.Element {
  const repeat = useCallback(async (): Promise<void> => {
    await run({ kind: "recurring", id, cadence });
  }, [cadence, id, run]);
  return (
    <EditableListAction icon="repeat" onSelect={repeat}>
      {CADENCE_COPY.repeat(cadence)}
    </EditableListAction>
  );
}

function Streak({ chain }: { readonly chain: StreakChain }): JSX.Element {
  return (
    <span className="streak-chain">
      <span className="streak-links" aria-hidden="true">
        {Array.from({ length: chain.links }, (_, index) => index).map(
          (index) => {
            let mark = "today";
            if (index < chain.earned || chain.doneNow) {
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
  const changes = useListChanges(questId);
  const { runOn, busy } = changes;
  const tally = useTallyCards(questId, tallies, busy);
  const listId = list.id;
  const run = useCallback(
    (change: ListItemChange): Promise<boolean> => runOn(listId, change),
    [runOn, listId],
  );
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
        ({ taskNumber, text, checkedOff, recurring, cadence, createdAt }) => {
          if (taskNumber === null || !recurring) {
            return [];
          }
          return [
            { number: taskNumber, text, cadence, done: checkedOff, createdAt },
          ];
        },
      ),
    );
  }
  function row(item: ListItem): JSX.Element {
    const chain = chains.get(item.taskNumber ?? 0);
    return (
      <ListItemRow
        key={item.id}
        item={item}
        chain={chain}
        card={tally.cardOf(item)}
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
  return (
    <EditableListScope blocked={busy}>
      <div className="grid gap-3">
        <ListChangeNotices changes={changes} other={tally.status} />
        {tally.problem !== undefined && <Alert>{tally.problem}</Alert>}
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

export { ListChangeNotices, ListItemRow, ListItems };
