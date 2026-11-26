"use client";

import type { Route } from "next";
import Link from "next/link";
import {
  type JSX,
  startTransition,
  useCallback,
  useId,
  useOptimistic,
  useRef,
  useState,
} from "react";
import { keepFocus } from "@/components/keep-focus.ts";
import {
  editorFor,
  useListChanges,
  useTallyCards,
} from "@/components/list-changes.ts";
import { ListChangeNotices, ListItemRow } from "@/components/list-items.tsx";
import { RiteDialog } from "@/components/rite-dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  EditableList,
  EditableListScope,
  NewListItem,
} from "@/components/ui/editable-list.tsx";
import { Alert } from "@/components/ui/form-message.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import type { QuestId } from "@/ids.ts";
import type { ListId } from "@/lists/list.ts";
import type { ListItemChange, ListItemId } from "@/lists/list-item.ts";
import type { ListItem } from "@/lists/list-item-store.ts";
import type { List } from "@/lists/list-store.ts";
import type { Rite } from "@/rites/rite.ts";
import type { RecurringTask } from "@/streaks/streak-store.ts";
import { streakChains, type TaskHistory } from "@/streaks/streaks.ts";
import type { TallyQuest } from "@/tallies/tally.ts";
import { LISTS_COPY } from "@/ui/copy/lists.ts";
import { QUEST_OVERVIEW_COPY } from "@/ui/copy/quest-overview.ts";

// How many of a list's items its card shows; the rest are a link away.
const CARD_ITEMS = 3;

type RunChange = (change: ListItemChange) => Promise<boolean>;

function withoutItem(
  items: readonly ListItem[],
  id: ListItemId,
): readonly ListItem[] {
  return items.filter((item) => item.id !== id);
}

// Runs a change, and when it checks a task off, hides the task at once and
// keeps focus in the card, on the next task's checkbox or else on fallback.
function useHideOnCheck(
  runOne: RunChange,
  hide: (id: ListItemId) => void,
  card: { readonly current: HTMLElement | null },
  fallback: { readonly current: HTMLElement | null },
): RunChange {
  return useCallback(
    (change: ListItemChange): Promise<boolean> => {
      if (change.kind !== "check" || !change.checkedOff) {
        return runOne(change);
      }
      keepFocus(card.current, fallback.current);
      return new Promise<boolean>((resolve) => {
        startTransition(async () => {
          hide(change.id);
          resolve(await runOne(change));
        });
      });
    },
    [card, fallback, hide, runOne],
  );
}

// A list on the quest's overview: its name, linked to the whole list, with
// its size, a button that adds an item, its first few items, editable in
// place, and a link to the rest. A task list shows its open one-off tasks,
// as recurring tasks are under Today, and a task checked off leaves at
// once. rites is undefined while a performance runs, and otherwise gives
// the card a button that opens the rite dialog for this list.
function QuestListCard({
  questId,
  list,
  contents,
  href,
  tallies,
  next,
  rites,
}: {
  readonly questId: QuestId;
  readonly list: List;
  readonly contents: readonly ListItem[];
  readonly href: Route;
  readonly tallies?: TallyQuest | undefined;
  readonly next?: ListItemId | undefined;
  readonly rites?: readonly Rite[] | undefined;
}): JSX.Element {
  const headingId = useId();
  const cardRef = useRef<HTMLElement>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const [adding, setAdding] = useState(false);
  const changes = useListChanges(questId);
  const { runOn, busy } = changes;
  const tally = useTallyCards(questId, tallies, busy);
  let open = contents;
  if (list.type === "task") {
    open = contents.filter(
      ({ checkedOff, recurring }) => !(checkedOff || recurring),
    );
  }
  const [shown, hide] = useOptimistic(open, withoutItem);
  const listId = list.id;
  const runHere = useCallback(
    (change: ListItemChange): Promise<boolean> => runOn(listId, change),
    [runOn, listId],
  );
  const run = useHideOnCheck(runHere, hide, cardRef, addRef);
  const add = useCallback(
    (text: string): Promise<boolean> => runHere({ kind: "add", text }),
    [runHere],
  );
  const startAdding = useCallback((): void => setAdding(true), []);
  const dismissAdding = useCallback((): void => setAdding(false), []);
  const stopAdding = useCallback((): void => {
    dismissAdding();
    queueMicrotask(() => addRef.current?.focus());
  }, [dismissAdding]);
  // A task list counts its open one-off tasks, and any other list all its
  // items.
  const size = QUEST_OVERVIEW_COPY.listSize(list.type, {
    total: shown.length,
    open: shown.length,
  });
  const addLabel = QUEST_OVERVIEW_COPY.addTo(list.type, list.name);
  let layout: "rows" | "cards" = "rows";
  if (list.type === "tally") {
    layout = "cards";
  }
  const rest = shown.length - CARD_ITEMS;
  return (
    <EditableListScope blocked={busy}>
      <section aria-labelledby={headingId} className="quest-card" ref={cardRef}>
        <div className="quest-card-head">
          <h2 className="quest-card-title" id={headingId}>
            <Link className="quest-card-name" href={href}>
              <span className="wrap-anywhere">{list.name}</span>
              <span aria-hidden={true} className="quest-card-dot" />{" "}
              <span className="quest-card-size">{size}</span>
            </Link>
          </h2>
          <Button
            ref={addRef}
            variant="quiet"
            className="quest-card-add"
            aria-label={addLabel}
            title={addLabel}
            aria-expanded={adding}
            onClick={startAdding}
            disabled={busy}
          >
            <Icon name="plus" />
          </Button>
        </div>
        {adding === true && (
          <NewListItem
            editor={{
              ...editorFor(list.type),
              label: LISTS_COPY.addListItem(list.type),
              save: LISTS_COPY.addListItem(list.type),
            }}
            disabled={busy}
            onSave={add}
            onCancel={stopAdding}
            onDismiss={dismissAdding}
          />
        )}
        {shown.length > 0 && (
          <EditableList label={list.name} layout={layout}>
            {shown.slice(0, CARD_ITEMS).map((item) => (
              <ListItemRow
                key={item.id}
                item={item}
                list={list}
                destinations={[]}
                card={tally.cardOf(item)}
                run={run}
                busy={busy}
                next={item.id === next}
              />
            ))}
          </EditableList>
        )}
        <ListChangeNotices changes={changes} other={tally.status} />
        {tally.problem !== undefined && <Alert>{tally.problem}</Alert>}
        {rest > 0 && (
          <Link className="quest-card-more" href={href}>
            {QUEST_OVERVIEW_COPY.more(rest, list.name)}
            <Icon name="chevron-right" />
          </Link>
        )}
        {rites !== undefined && rites.length > 0 && (
          <div className="quest-card-foot">
            <RiteDialog questId={questId} list={list} rites={rites} />
          </div>
        )}
      </section>
    </EditableListScope>
  );
}

// A recurring task as a task list's item, so it shows and edits like one.
function asListItem(task: RecurringTask): ListItem {
  return {
    id: task.id,
    text: task.text,
    taskNumber: task.number,
    checkedOff: task.done,
    recurring: true,
    cadence: task.cadence,
    createdAt: task.createdAt,
  };
}

function checkedTask(
  tasks: readonly RecurringTask[],
  change: { readonly id: ListItemId; readonly done: boolean },
): readonly RecurringTask[] {
  return tasks.map((task) => {
    if (task.id !== change.id) {
      return task;
    }
    return { ...task, done: change.done };
  });
}

// One of Today's recurring tasks, with its streak, in the list that holds
// it.
function TodayRow({
  task,
  list,
  note,
  next,
  runOn,
  showCheck,
  busy,
}: {
  readonly task: RecurringTask;
  readonly list: List;
  readonly note: string | undefined;
  readonly next: boolean;
  readonly runOn: (listId: ListId, change: ListItemChange) => Promise<boolean>;
  readonly showCheck: (change: {
    readonly id: ListItemId;
    readonly done: boolean;
  }) => void;
  readonly busy: boolean;
}): JSX.Element {
  const { listId } = task;
  const run = useCallback(
    (change: ListItemChange): Promise<boolean> => {
      if (change.kind !== "check") {
        return runOn(listId, change);
      }
      return new Promise<boolean>((resolve) => {
        startTransition(async () => {
          showCheck({ id: change.id, done: change.checkedOff });
          resolve(await runOn(listId, change));
        });
      });
    },
    [listId, runOn, showCheck],
  );
  return (
    <ListItemRow
      item={asListItem(task)}
      list={list}
      destinations={[]}
      run={run}
      busy={busy}
      note={note}
      next={next}
    />
  );
}

// The quest's recurring tasks for today, from all its task lists, each with
// its streak, checked off, unchecked and edited in place.
function TodayCard({
  questId,
  history,
  tasks,
  lists,
  next,
}: {
  readonly questId: QuestId;
  readonly history: TaskHistory | undefined;
  readonly tasks: readonly RecurringTask[];
  readonly lists: readonly List[];
  readonly next?: ListItemId | undefined;
}): JSX.Element {
  const headingId = useId();
  const changes = useListChanges(questId);
  const { runOn, busy } = changes;
  const [shown, showCheck] = useOptimistic(tasks, checkedTask);
  let chains: ReturnType<typeof streakChains> = new Map();
  if (history !== undefined) {
    chains = streakChains(history, shown);
  }
  const left = shown.filter(({ done }) => !done).length;
  return (
    <EditableListScope blocked={busy}>
      <section aria-labelledby={headingId} className="quest-card">
        <div className="quest-card-head">
          <h2 className="quest-card-title" id={headingId}>
            {QUEST_OVERVIEW_COPY.today}
            <span aria-hidden={true} className="quest-card-dot" />{" "}
            <span className="quest-card-size">
              {QUEST_OVERVIEW_COPY.todayLeft(left, shown.length)}
            </span>
          </h2>
        </div>
        <EditableList label={QUEST_OVERVIEW_COPY.today}>
          {shown.flatMap((task) => {
            const list = lists.find(({ id }) => id === task.listId);
            if (list === undefined) {
              return [];
            }
            const chain = chains.get(task.number);
            let note: string | undefined;
            if (chain !== undefined) {
              note = QUEST_OVERVIEW_COPY.streak(chain);
            }
            return [
              <TodayRow
                key={task.id}
                task={task}
                list={list}
                note={note}
                next={task.id === next}
                runOn={runOn}
                showCheck={showCheck}
                busy={busy}
              />,
            ];
          })}
        </EditableList>
        <ListChangeNotices changes={changes} />
      </section>
    </EditableListScope>
  );
}

export { QuestListCard, TodayCard };
