"use client";

import { useCallback, useOptimistic, useRef } from "react";
import type { EditorOptions } from "@/components/ui/editable-list-contract.ts";
import { useQuestAction } from "@/components/use-quest-action.ts";
import type { QuestId } from "@/ids.ts";
import { type ListType, listItemLimit, listItemText } from "@/lists/list.ts";
import type { ListItemChange, ListItemId } from "@/lists/list-item.ts";
import { changeListItemAction } from "@/lists/list-item-actions.ts";
import type { ListItem } from "@/lists/list-item-store.ts";
import type { List } from "@/lists/list-store.ts";
import {
  type Tally,
  type TallyChange,
  type TallyChanges,
  type TallyQuest,
  withTallyChange,
} from "@/tallies/tally.ts";
import {
  incrementTallyAction,
  setTallyDayAction,
} from "@/tallies/tally-actions.ts";
import { LISTS_COPY } from "@/ui/copy/lists.ts";
import { TALLIES_COPY } from "@/ui/copy/tallies.ts";

// The list a change is in.
type ListOf = Pick<List, "id" | "type">;

// Changes to the quest's list items, in any of its lists, with the last
// change's status or problem and, when it can be undone, its undo.
interface ListChanges {
  // Runs a change, showing show's change to the page and its status at
  // once.
  readonly runOn: (
    list: ListOf,
    change: ListItemChange,
    show?: () => void,
  ) => Promise<boolean>;
  readonly undo: (() => Promise<void>) | undefined;
  readonly busy: boolean;
  readonly status: string | undefined;
  readonly problem: string | undefined;
}

function useListChanges(questId: QuestId): ListChanges {
  const { run, undoVersion, busy, status, problem } =
    useQuestAction(changeListItemAction);
  // The list the last change was in, which its undo goes to.
  const lastListRef = useRef<ListOf | undefined>(undefined);
  const runOn = useCallback(
    (
      list: ListOf,
      change: ListItemChange,
      show?: () => void,
    ): Promise<boolean> => {
      lastListRef.current = list;
      const request = { questId, listId: list.id, change };
      const changed = LISTS_COPY.changed(change, list.type);
      if (show === undefined) {
        return run(request, { status: changed });
      }
      return run(request, { status: changed, show });
    },
    [questId, run],
  );
  const undoLast = useCallback(async (): Promise<void> => {
    const list = lastListRef.current;
    if (undoVersion !== undefined && list !== undefined) {
      await runOn(list, { kind: "undo", version: undoVersion });
    }
  }, [runOn, undoVersion]);
  let undo: (() => Promise<void>) | undefined;
  if (undoVersion !== undefined) {
    undo = undoLast;
  }
  return { runOn, undo, busy, status, problem };
}

// A tally list's counter card for a list item, with its quest's today and
// the changes it runs.
interface TallyOf {
  readonly tally: Tally;
  readonly today: TallyQuest["today"];
  readonly changes: TallyChanges;
  readonly busy: boolean;
}

// A tally's change, shown on its card before the server saves it.
interface ShownChange {
  readonly id: ListItemId;
  readonly change: TallyChange;
}

function withChange(
  tallies: TallyQuest | undefined,
  { id, change }: ShownChange,
): TallyQuest | undefined {
  if (tallies === undefined) {
    return;
  }
  return withTallyChange(tallies, id, change);
}

// A tally list's counter cards: each list item's card, the tally changes'
// status and problem. A card waits while a list change or a tally change
// runs.
interface TallyCards {
  readonly cardOf: (item: ListItem) => TallyOf | undefined;
  readonly status: string | undefined;
  readonly problem: string | undefined;
}

function useTallyCards(
  questId: QuestId,
  tallies: TallyQuest | undefined,
  listBusy: boolean,
): TallyCards {
  const { start: startIncrement, ...increment } =
    useQuestAction(incrementTallyAction);
  const { start: startSet, ...set } = useQuestAction(setTallyDayAction);
  const [shown, showChange] = useOptimistic(tallies, withChange);
  const busy = increment.busy || set.busy || listBusy;
  function cardOf(item: ListItem): TallyOf | undefined {
    const tally = shown?.tallies.find((each) => each.id === item.id);
    if (shown === undefined || tally === undefined) {
      return;
    }
    const { today } = shown;
    const { id } = item;
    return {
      tally,
      today,
      busy,
      changes: {
        increment: (amount: string, refused: () => void): void => {
          startIncrement(
            { questId, id, amount },
            {
              status: TALLIES_COPY.saved,
              show: (): void =>
                showChange({ id, change: { kind: "increment", amount } }),
              refused,
            },
          );
        },
        setToday: (total: string, refused: () => void): void => {
          startSet(
            { questId, id, date: today, total },
            {
              status: TALLIES_COPY.saved,
              show: (): void =>
                showChange({
                  id,
                  change: { kind: "set", date: today, total },
                }),
              refused,
            },
          );
        },
      },
    };
  }
  return {
    cardOf,
    status: increment.status ?? set.status,
    problem: increment.problem ?? set.problem,
  };
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

export type { ListChanges, TallyCards, TallyOf };
export { editorFor, useListChanges, useTallyCards };
