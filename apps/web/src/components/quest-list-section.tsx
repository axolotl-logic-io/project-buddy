"use client";

import type { Route } from "next";
import Link from "next/link";
import {
  type JSX,
  type KeyboardEvent,
  startTransition,
  useCallback,
  useEffect,
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
import { holds, shownItems } from "@/components/list-filters.ts";
import { ListChangeNotices, ListItemRow } from "@/components/list-items.tsx";
import { RiteDialog } from "@/components/rite-dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  EditableList,
  EditableListScope,
} from "@/components/ui/editable-list.tsx";
import { Alert } from "@/components/ui/form-message.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import { useEntry } from "@/components/use-entry.ts";
import type { QuestId } from "@/ids.ts";
import type { ListItemChange, ListItemId } from "@/lists/list-item.ts";
import type { ListItem } from "@/lists/list-item-store.ts";
import type { List } from "@/lists/list-store.ts";
import type { Rite } from "@/rites/rite.ts";
import { streakChains, type TaskHistory } from "@/streaks/streaks.ts";
import type { TallyQuest } from "@/tallies/tally.ts";
import { LIST_PAGE_COPY } from "@/ui/copy/list-page.ts";
import { LISTS_COPY } from "@/ui/copy/lists.ts";
import { QUEST_OVERVIEW_COPY } from "@/ui/copy/quest-overview.ts";

// How many of a list's items its section shows when the page opens; the
// rest are a link away. Items added since stay in view.
const SECTION_ITEMS = 5;

interface CheckChange {
  readonly id: ListItemId;
  readonly checkedOff: boolean;
}

// The section's items once a check-off is shown: a one-off task checked
// off leaves, and a recurring task keeps its place with its new mark.
function withCheck(
  items: readonly ListItem[],
  change: CheckChange,
): readonly ListItem[] {
  return items.flatMap((item) => {
    if (item.id !== change.id) {
      return [item];
    }
    if (item.recurring) {
      return [{ ...item, checkedOff: change.checkedOff }];
    }
    if (change.checkedOff) {
      return [];
    }
    return [item];
  });
}

// The editor above a list section's items: a field, Add and Done. It stays
// open after each item; Done or Escape closes it.
function ListAdder({
  list,
  busy,
  onAdd,
  onClose,
}: {
  readonly list: List;
  readonly busy: boolean;
  readonly onAdd: (text: string) => Promise<boolean>;
  readonly onClose: () => void;
}): JSX.Element {
  const hintId = useId();
  const editor = editorFor(list.type);
  const { text, problem, inputRef, change, submit } = useEntry(
    editor.validate,
    onAdd,
  );
  const label = QUEST_OVERVIEW_COPY.addTo(list.type, list.name);
  useEffect(() => {
    inputRef.current?.focus();
  }, [inputRef]);
  const closeOnEscape = useCallback(
    (event: KeyboardEvent<HTMLInputElement>): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
    },
    [onClose],
  );
  let hint = (
    <p id={hintId} className="list-adder-hint">
      {QUEST_OVERVIEW_COPY.adder.hint}
    </p>
  );
  if (problem !== undefined) {
    hint = (
      <p id={hintId} className="error-text list-adder-hint">
        {problem}
      </p>
    );
  }
  return (
    <form className="list-adder" aria-label={label} onSubmit={submit}>
      <input
        ref={inputRef}
        className="input-field"
        aria-label={label}
        aria-describedby={hintId}
        aria-invalid={problem !== undefined}
        placeholder={editor.placeholder}
        value={text}
        onChange={change}
        onKeyDown={closeOnEscape}
      />
      <Button type="submit" disabled={busy}>
        {QUEST_OVERVIEW_COPY.adder.add}
      </Button>
      <Button variant="secondary" onClick={onClose}>
        {QUEST_OVERVIEW_COPY.adder.done}
      </Button>
      {hint}
    </form>
  );
}

// A list on the quest's overview, as a section of the page's folio: its
// name, linked to the whole list, with its size, a button that opens an
// editor for new items above them, a candle that opens the rite dialog,
// and its first few items, editable in place, with a link to the rest. A
// task list shows its open one-off tasks and its recurring tasks with
// their streaks; a one-off task checked off leaves at once. target marks
// the list the add box adds to. While the add box holds a search, the
// section shows every item that holds it, marked, and says so when none
// does. rites is undefined while a performance runs, which hides the
// candle.
function QuestListSection({
  questId,
  list,
  contents,
  href,
  history,
  tallies,
  next,
  rites,
  target,
  search,
}: {
  readonly questId: QuestId;
  readonly list: List;
  readonly contents: readonly ListItem[];
  readonly href: Route;
  readonly history: TaskHistory | undefined;
  readonly tallies: TallyQuest | undefined;
  readonly next: ListItemId | undefined;
  readonly rites: readonly Rite[] | undefined;
  readonly target: boolean;
  // The add box's search, or "" when there is none.
  readonly search: string;
}): JSX.Element {
  const headingId = useId();
  const sectionRef = useRef<HTMLElement>(null);
  const openRef = useRef<HTMLButtonElement>(null);
  const [adding, setAdding] = useState(false);
  // The items there when the page opened; any added since stay in view.
  const [opened] = useState(() => new Set(contents.map(({ id }) => id)));
  const changes = useListChanges(questId);
  const { runOn, busy } = changes;
  const tally = useTallyCards(questId, tallies, busy);
  const [shown, showCheck] = useOptimistic(
    shownItems(list, contents),
    withCheck,
  );
  const listId = list.id;
  const runHere = useCallback(
    (change: ListItemChange): Promise<boolean> => runOn(listId, change),
    [runOn, listId],
  );
  const run = useCallback(
    (change: ListItemChange): Promise<boolean> => {
      if (change.kind !== "check") {
        return runHere(change);
      }
      const item = shown.find(({ id }) => id === change.id);
      if (change.checkedOff && item?.recurring === false) {
        keepFocus(sectionRef.current, openRef.current);
      }
      return new Promise<boolean>((resolve) => {
        startTransition(async () => {
          showCheck(change);
          resolve(await runHere(change));
        });
      });
    },
    [runHere, showCheck, shown],
  );
  const add = useCallback(
    (text: string): Promise<boolean> => runHere({ kind: "add", text }),
    [runHere],
  );
  const startAdding = useCallback((): void => setAdding(true), []);
  const stopAdding = useCallback((): void => {
    setAdding(false);
    queueMicrotask(() => openRef.current?.focus());
  }, []);
  let chains: ReturnType<typeof streakChains> = new Map();
  if (history !== undefined) {
    chains = streakChains(
      history,
      shown.flatMap(
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
  const open = shown.filter(({ checkedOff }) => !checkedOff).length;
  const size = QUEST_OVERVIEW_COPY.listSize(list.type, {
    total: shown.length,
    open,
  });
  let inView = shown.filter(
    (item, index) => index < SECTION_ITEMS || !opened.has(item.id),
  );
  let rest = shown.length - inView.length;
  if (search !== "") {
    inView = shown.filter((item) => holds(item, search));
    rest = 0;
  }
  let layout: "rows" | "cards" = "rows";
  if (list.type === "tally") {
    layout = "cards";
  }
  return (
    <EditableListScope blocked={busy}>
      <section
        aria-labelledby={headingId}
        className="list-section"
        data-target={target}
        ref={sectionRef}
      >
        <div className="list-section-head">
          <h3 className="list-section-title" id={headingId}>
            <span aria-hidden={true} className="list-section-mark" />
            <Link className="list-section-name" href={href}>
              <span className="wrap-anywhere">{list.name}</span>
              <span className="list-section-size">
                <span aria-hidden={true} className="list-section-dot" /> {size}
              </span>
            </Link>
          </h3>
          <span aria-hidden={true} className="list-section-rule" />
          <Button
            ref={openRef}
            variant="quiet"
            className="list-section-add"
            aria-label={QUEST_OVERVIEW_COPY.addTo(list.type, list.name)}
            aria-expanded={adding}
            onClick={startAdding}
          >
            <Icon name="plus" />
            {LISTS_COPY.addListItem(list.type)}
          </Button>
          {rites !== undefined && rites.length > 0 && (
            <RiteDialog questId={questId} list={list} rites={rites} />
          )}
        </div>
        {adding === true && (
          <ListAdder list={list} busy={busy} onAdd={add} onClose={stopAdding} />
        )}
        {inView.length > 0 && (
          <EditableList label={list.name} layout={layout}>
            {inView.map((item) => {
              const chain = chains.get(item.taskNumber ?? 0);
              let note: string | undefined;
              if (item.recurring && chain !== undefined) {
                note = QUEST_OVERVIEW_COPY.streak(chain);
              }
              return (
                <ListItemRow
                  key={item.id}
                  item={item}
                  list={list}
                  destinations={[]}
                  card={tally.cardOf(item)}
                  run={run}
                  busy={busy}
                  note={note}
                  next={item.id === next}
                  match={search}
                />
              );
            })}
          </EditableList>
        )}
        {inView.length === 0 && search !== "" && (
          <p className="list-page-empty">
            {LIST_PAGE_COPY.noMatch(list.type, search)}
          </p>
        )}
        <ListChangeNotices changes={changes} other={tally.status} />
        {tally.problem !== undefined && <Alert>{tally.problem}</Alert>}
        {rest > 0 && (
          <Link className="list-section-more" href={href}>
            {QUEST_OVERVIEW_COPY.more(rest, list.name)}
            <Icon name="chevron-right" />
          </Link>
        )}
      </section>
    </EditableListScope>
  );
}

export { QuestListSection };
