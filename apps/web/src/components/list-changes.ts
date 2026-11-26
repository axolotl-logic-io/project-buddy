"use client";

import { useCallback, useRef } from "react";
import type { EditorOptions } from "@/components/ui/editable-list-contract.ts";
import { useQuestAction } from "@/components/use-quest-action.ts";
import type { QuestId } from "@/ids.ts";
import {
  type ListId,
  type ListType,
  listItemLimit,
  listItemText,
} from "@/lists/list.ts";
import type { ListItemChange } from "@/lists/list-item.ts";
import { changeListItemAction } from "@/lists/list-item-actions.ts";
import type { ListItem } from "@/lists/list-item-store.ts";
import type { Tally, TallyChanges, TallyQuest } from "@/tallies/tally.ts";
import {
  incrementTallyAction,
  setTallyDayAction,
} from "@/tallies/tally-actions.ts";
import { LISTS_COPY } from "@/ui/copy/lists.ts";

// Changes to the quest's list items, in any of its lists, with the last
// change's status or problem and, when it can be undone, its undo.
interface ListChanges {
  readonly runOn: (listId: ListId, change: ListItemChange) => Promise<boolean>;
  readonly undo: (() => Promise<void>) | undefined;
  readonly busy: boolean;
  readonly status: string | undefined;
  readonly problem: string | undefined;
}

function useListChanges(questId: QuestId): ListChanges {
  const { run, undoVersion, busy, status, problem } =
    useQuestAction(changeListItemAction);
  // The list the last change was in, which its undo goes to.
  const lastListRef = useRef<ListId | undefined>(undefined);
  const runOn = useCallback(
    (listId: ListId, change: ListItemChange): Promise<boolean> => {
      lastListRef.current = listId;
      return run({ questId, listId, change });
    },
    [questId, run],
  );
  const undoLast = useCallback(async (): Promise<void> => {
    const listId = lastListRef.current;
    if (undoVersion !== undefined && listId !== undefined) {
      await runOn(listId, { kind: "undo", version: undoVersion });
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
  const { run: runIncrement, ...increment } =
    useQuestAction(incrementTallyAction);
  const { run: runSet, ...set } = useQuestAction(setTallyDayAction);
  const busy = increment.busy || set.busy || listBusy;
  function cardOf(item: ListItem): TallyOf | undefined {
    const tally = tallies?.tallies.find(({ id }) => id === item.id);
    if (tallies === undefined || tally === undefined) {
      return;
    }
    const { today } = tallies;
    return {
      tally,
      today,
      busy,
      changes: {
        increment: (amount: string): Promise<boolean> =>
          runIncrement({ questId, id: item.id, amount }),
        setToday: (total: string): Promise<boolean> =>
          runSet({ questId, id: item.id, date: today, total }),
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
