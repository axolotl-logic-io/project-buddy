"use client";

import {
  type JSX,
  type KeyboardEvent,
  useCallback,
  useId,
  useState,
} from "react";
import { FolioDivider } from "@/components/folio-divider.tsx";
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
  EditableList,
  EditableListAction,
  EditableListMenuLabel,
  EditableListRow,
  EditableListScope,
} from "@/components/ui/editable-list.tsx";
import type { SplitOptions } from "@/components/ui/editable-list-contract.ts";
import { Alert, FormStatus } from "@/components/ui/form-message.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import { useEntry } from "@/components/use-entry.ts";
import type { QuestId } from "@/ids.ts";
import type { ListId } from "@/lists/list.ts";
import {
  LIST_ITEM_CHANGE,
  type ListItemChange,
  type ListItemId,
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
import { LIST_PAGE_COPY } from "@/ui/copy/list-page.ts";
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
  // The quest's next task, marked before its text.
  readonly next?: ListItemId | undefined;
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
  match = "",
}: Omit<
  ListItemsProps,
  "contents" | "questId" | "history" | "tallies" | "next"
> & {
  readonly item: ListItem;
  readonly run: RunChange;
  readonly busy: boolean;
  readonly chain?: StreakChain | undefined;
  readonly card?: TallyOf | undefined;
  // A short line under the text, such as a recurring task's streak.
  readonly note?: string | undefined;
  // Whether the item is the quest's next task, marked before its text.
  readonly next?: boolean;
  // Text being searched for, marked in the item's text.
  readonly match?: string;
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
        </>
      }
      badge={badge}
      leading={leading}
      split={split}
      match={match}
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
      {destinations.length > 0 && (
        <EditableListMenuLabel>{LISTS_COPY.moveTo}</EditableListMenuLabel>
      )}
      {destinations.map((destination) => (
        <MoveAction
          key={destination.id}
          id={id}
          destination={destination}
          run={run}
        />
      ))}
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

// A list item menu's choice to move the item to another of the quest's
// lists.
function MoveAction({
  id,
  destination,
  run,
}: {
  readonly id: ListItem["id"];
  readonly destination: List;
  readonly run: RunChange;
}): JSX.Element {
  const listId: ListId = destination.id;
  const move = useCallback(async (): Promise<void> => {
    await run({ kind: "move", id, destination: listId });
  }, [id, listId, run]);
  return (
    <EditableListAction
      icon="chevron-right"
      onSelect={move}
      label={LISTS_COPY.moveInto(destination.name)}
    >
      {destination.name}
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

// Whether an item's text holds the search, ignoring case.
function holds({ text }: ListItem, search: string): boolean {
  return text.toLocaleLowerCase().includes(search.toLocaleLowerCase());
}

// A list's items on its page: a box that searches them and adds to them,
// the open items, which can be reordered, then those checked off, under
// Done. Typing in the box shows only the items that hold the text; Enter
// adds it as a new item, unless an item has that text already.
function ListItems({
  questId,
  list,
  contents,
  destinations,
  history,
  tallies,
  next,
}: ListItemsProps): JSX.Element {
  const hintId = useId();
  const doneId = useId();
  const changes = useListChanges(questId);
  const { runOn, busy } = changes;
  const tally = useTallyCards(questId, tallies, busy);
  const [said, setSaid] = useState<string | undefined>();
  const listId = list.id;
  const listName = list.name;
  const run = useCallback(
    (listChange: ListItemChange): Promise<boolean> => runOn(listId, listChange),
    [runOn, listId],
  );
  const add = useCallback(
    async (entry: string): Promise<boolean> => {
      setSaid(undefined);
      const lower = entry.toLocaleLowerCase();
      if (contents.some((item) => item.text.toLocaleLowerCase() === lower)) {
        return false;
      }
      const saved = await run({ kind: "add", text: entry });
      if (saved) {
        setSaid(LIST_PAGE_COPY.added(entry, listName));
      }
      return saved;
    },
    [contents, listName, run],
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
  const { validate } = editorFor(list.type);
  const { text, problem, inputRef, change, submit, clear } = useEntry(
    validate,
    add,
  );
  const clearOnEscape = useCallback(
    (event: KeyboardEvent<HTMLInputElement>): void => {
      if (event.key === "Escape" && text !== "") {
        event.preventDefault();
        clear();
      }
    },
    [clear, text],
  );
  let chains: ReturnType<typeof streakChains> = new Map();
  if (history !== undefined) {
    chains = streakChains(
      history,
      contents.flatMap(
        ({
          taskNumber,
          text: task,
          checkedOff,
          recurring,
          cadence,
          createdAt,
        }) => {
          if (taskNumber === null || !recurring) {
            return [];
          }
          return [
            {
              number: taskNumber,
              text: task,
              cadence,
              done: checkedOff,
              createdAt,
            },
          ];
        },
      ),
    );
  }
  const search = text.trim();
  const found = contents.filter((item) => holds(item, search));
  const open = found.filter(({ checkedOff }) => !checkedOff);
  const done = found.filter(({ checkedOff }) => checkedOff);
  const same = contents.find(
    (item) => item.text.toLocaleLowerCase() === search.toLocaleLowerCase(),
  );
  let hint = LIST_PAGE_COPY.hint(list.type);
  if (same !== undefined) {
    hint = LIST_PAGE_COPY.already(same.text, same.checkedOff);
  } else if (search !== "") {
    hint = LIST_PAGE_COPY.matches(list.type, found.length, search);
  }
  let hintClass = "add-box-hint";
  if (problem !== undefined) {
    hint = problem;
    hintClass = "add-box-hint error-text";
  }
  // Moving an item among some of them would leave the hidden ones out of
  // place, so the open items reorder only while nothing is searched for.
  let move: typeof place | undefined;
  if (search === "") {
    move = place;
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
        next={item.id === next}
        match={search}
      />
    );
  }
  let layout: "rows" | "cards" = "rows";
  if (list.type === "tally") {
    layout = "cards";
  }
  const field = LIST_PAGE_COPY.searchIn(list.type, list.name);
  return (
    <EditableListScope blocked={busy}>
      <form className="add-box" aria-label={field} onSubmit={submit}>
        <div className="add-box-row">
          <Icon name="search" />
          <input
            ref={inputRef}
            type="search"
            className="add-box-field"
            aria-label={field}
            aria-describedby={hintId}
            aria-invalid={problem !== undefined}
            placeholder={LIST_PAGE_COPY.search(list.type)}
            value={text}
            onChange={change}
            onKeyDown={clearOnEscape}
          />
          <Button type="submit" disabled={busy}>
            {LIST_PAGE_COPY.add}
          </Button>
        </div>
        <p id={hintId} className={hintClass} aria-live="polite">
          {hint}
        </p>
        <ListChangeNotices
          changes={{ ...changes, status: said ?? changes.status }}
          other={tally.status}
        />
        {tally.problem !== undefined && <Alert>{tally.problem}</Alert>}
      </form>
      <FolioDivider />
      {open.length > 0 && (
        <EditableList label={list.name} layout={layout} onMove={move}>
          {open.map(row)}
        </EditableList>
      )}
      {found.length === 0 && search !== "" && (
        <p className="list-page-empty">
          {LIST_PAGE_COPY.noMatch(list.type, search)}
        </p>
      )}
      {done.length > 0 && (
        <>
          <FolioDivider />
          <section aria-labelledby={doneId} className="list-page-done">
            <h3 id={doneId} className="list-page-done-head">
              {LISTS_COPY.done}
              <span className="list-section-size">
                <span aria-hidden={true} className="list-section-dot" />{" "}
                {done.length}
              </span>
            </h3>
            <EditableList label={LISTS_COPY.done}>{done.map(row)}</EditableList>
          </section>
        </>
      )}
    </EditableListScope>
  );
}

export { ListChangeNotices, ListItemRow, ListItems };
