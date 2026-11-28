"use client";

import type { Route } from "next";
import {
  type ChangeEvent,
  type JSX,
  type KeyboardEvent,
  type MouseEvent,
  useCallback,
  useEffect,
  useId,
  useState,
} from "react";
import { FolioDivider } from "@/components/folio-divider.tsx";
import { editorFor, useListChanges } from "@/components/list-changes.ts";
import { holds, sameText, shownItems } from "@/components/list-filters.ts";
import { ListChangeNotices } from "@/components/list-items.tsx";
import { QuestListSection } from "@/components/quest-list-section.tsx";
import { Button } from "@/components/ui/button.tsx";
import type { EditorOptions } from "@/components/ui/editable-list-contract.ts";
import { Icon } from "@/components/ui/icon.tsx";
import { useEntry } from "@/components/use-entry.ts";
import type { QuestId } from "@/ids.ts";
import { LIST_ID, LIST_SETTINGS, type ListId } from "@/lists/list.ts";
import { saveListAction } from "@/lists/list-actions.ts";
import type { ListItemId } from "@/lists/list-item.ts";
import type { ListItem } from "@/lists/list-item-store.ts";
import type { List } from "@/lists/list-store.ts";
import type { Rite } from "@/rites/rite.ts";
import type { TaskHistory } from "@/streaks/streaks.ts";
import type { TallyQuest } from "@/tallies/tally.ts";
import { LIST_PAGE_COPY } from "@/ui/copy/list-page.ts";
import { QUEST_OVERVIEW_COPY } from "@/ui/copy/quest-overview.ts";

const COPY: typeof QUEST_OVERVIEW_COPY.addBox = QUEST_OVERVIEW_COPY.addBox;

// One of the quest's lists, with what it holds and where it opens.
interface FolioList {
  readonly list: List;
  readonly contents: readonly ListItem[];
  readonly href: Route;
}

// The list the add box starts on: the first task list, else the first.
function startingTarget(lists: readonly List[]): List | undefined {
  return lists.find(({ type }) => type === "task") ?? lists[0];
}

function validateName(text: string): ReturnType<EditorOptions["validate"]> {
  const name = LIST_SETTINGS.shape.name.safeParse(text).data;
  if (name === undefined) {
    return { problem: COPY.nameProblem };
  }
  return { text: name };
}

type IconName = Parameters<typeof Icon>[0]["name"];

// The add box under the quest's name, as on a list's page: a field that
// searches the quest's lists as it is typed in and adds its text to the
// list marked in gold, unless that list has the text already. The lists
// to add to are chips below it, with New list, which turns the field to
// naming a new task list. Each add empties the field and keeps focus in
// it.
function AddBox({
  questId,
  lists,
  target,
  taken,
  matches,
  onTarget,
  onMade,
  onSearch,
}: {
  readonly questId: QuestId;
  readonly lists: readonly List[];
  readonly target: List | undefined;
  // The items of the list the box adds to.
  readonly taken: readonly ListItem[];
  // How many of the items the lists' sections show hold the search.
  readonly matches: number;
  readonly onTarget: (list: ListId) => void;
  // Called when a new list is made, with the lists there were before it.
  readonly onMade: (known: readonly ListId[]) => void;
  // Called with the field's search, or "" while it names a new list.
  readonly onSearch: (search: string) => void;
}): JSX.Element {
  const groupLabelId = useId();
  const hintId = useId();
  const changes = useListChanges(questId);
  const { runOn } = changes;
  const [namingChosen, setNaming] = useState<boolean>(false);
  const [making, setMaking] = useState(false);
  const [said, setSaid] = useState<string | undefined>();
  const [refused, setRefused] = useState<string | undefined>();
  const naming = namingChosen || target === undefined;
  const addItem = useCallback(
    async (entry: string): Promise<boolean> => {
      setSaid(undefined);
      setRefused(undefined);
      if (target === undefined || taken.some((item) => sameText(item, entry))) {
        return false;
      }
      const saved = await runOn(target, { kind: "add", text: entry });
      if (saved) {
        setSaid(COPY.added(entry, target.name));
      }
      return saved;
    },
    [runOn, target, taken],
  );
  // Makes a task list with this name, then moves the add box to it.
  async function makeList(name: string): Promise<boolean> {
    setSaid(undefined);
    setRefused(undefined);
    setMaking(true);
    const form = new FormData();
    form.set("questId", questId);
    form.set("name", name);
    form.set("type", "task");
    const known = lists.map(({ id }) => id);
    try {
      const result = await saveListAction({}, form);
      if (result.saved !== true) {
        setRefused(result.error);
        return false;
      }
      onMade(known);
      setNaming(false);
      setSaid(COPY.made(name));
      return true;
    } finally {
      setMaking(false);
    }
  }
  let { validate } = editorFor(target?.type ?? "task");
  let add = addItem;
  if (naming) {
    validate = validateName;
    add = makeList;
  }
  const { text, problem, inputRef, change, submit, clear } = useEntry(
    validate,
    add,
  );
  let search = text.trim();
  let label = COPY.nameList;
  let placeholder = COPY.nameList;
  let icon: IconName = "plus";
  let fieldType = "text";
  let hint = COPY.namingHint;
  if (naming) {
    search = "";
  } else if (target !== undefined) {
    label = LIST_PAGE_COPY.searchIn(target.type, target.name);
    placeholder = LIST_PAGE_COPY.search(target.type);
    icon = "search";
    fieldType = "search";
    const same = taken.find((item) => sameText(item, search));
    hint = LIST_PAGE_COPY.hint(target.type);
    if (same !== undefined) {
      hint = LIST_PAGE_COPY.already(same.text, same.checkedOff);
    } else if (search !== "") {
      hint = LIST_PAGE_COPY.matches(target.type, matches, search);
    }
  }
  let hintClass = "add-box-hint";
  if (problem !== undefined) {
    hint = problem;
    hintClass = "add-box-hint error-text";
  }
  useEffect(() => {
    onSearch(search);
  }, [onSearch, search]);
  const choose = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      const id = LIST_ID.safeParse(event.currentTarget.value).data;
      if (id !== undefined) {
        setNaming(false);
        onTarget(id);
      }
    },
    [onTarget],
  );
  // A pointer's choice moves on to the field; the arrow keys stay in the
  // choices.
  const focusField = useCallback(
    (event: MouseEvent<HTMLInputElement>): void => {
      if (event.detail > 0) {
        inputRef.current?.focus();
      }
    },
    [inputRef],
  );
  const startNaming = useCallback((): void => {
    setNaming(true);
    inputRef.current?.focus();
  }, [inputRef]);
  // Escape goes back from naming a new list, else clears the search.
  const backOnEscape = useCallback(
    (event: KeyboardEvent<HTMLInputElement>): void => {
      if (event.key !== "Escape") {
        return;
      }
      if (namingChosen) {
        event.preventDefault();
        setNaming(false);
      } else if (text !== "") {
        event.preventDefault();
        clear();
      }
    },
    [clear, namingChosen, text],
  );
  return (
    <form className="add-box" aria-label={COPY.label} onSubmit={submit}>
      <div className="add-box-row">
        <Icon name={icon} />
        <input
          ref={inputRef}
          type={fieldType}
          className="add-box-field"
          aria-label={label}
          aria-describedby={hintId}
          aria-invalid={problem !== undefined}
          placeholder={placeholder}
          value={text}
          onChange={change}
          onKeyDown={backOnEscape}
        />
        <Button type="submit" disabled={changes.busy || making}>
          {COPY.add}
        </Button>
      </div>
      <div className="add-box-targets">
        <div
          role="radiogroup"
          aria-labelledby={groupLabelId}
          className="add-box-choices"
        >
          <span id={groupLabelId} className="add-box-choices-label">
            {COPY.target}
          </span>
          {lists.map((list) => (
            <label key={list.id} className="add-box-choice">
              <input
                type="radio"
                name={groupLabelId}
                value={list.id}
                checked={!naming && list.id === target?.id}
                onChange={choose}
                onClick={focusField}
              />
              <span className="wrap-anywhere">{list.name}</span>
            </label>
          ))}
        </div>
        <Button
          variant="quiet"
          className="add-box-new"
          aria-pressed={naming}
          onClick={startNaming}
        >
          <Icon name="plus" />
          {COPY.newList}
        </Button>
      </div>
      <p id={hintId} className={hintClass} aria-live="polite">
        {hint}
      </p>
      <ListChangeNotices
        changes={{
          ...changes,
          status: said,
          problem: refused ?? changes.problem,
        }}
      />
    </form>
  );
}

// The quest's lists on its overview, under its name: the add box, then
// each list's section, in the lists' order, between ornamented rules.
// The add box's list is marked in gold in its section too, and its search
// filters every section.
function QuestFolio({
  questId,
  lists,
  history,
  tallies,
  next,
  rites,
}: {
  readonly questId: QuestId;
  readonly lists: readonly FolioList[];
  readonly history: TaskHistory | undefined;
  readonly tallies: TallyQuest | undefined;
  readonly next: ListItemId | undefined;
  readonly rites: readonly Rite[] | undefined;
}): JSX.Element {
  const [chosen, setChosen] = useState<ListId | undefined>();
  const [search, setSearch] = useState("");
  // The quest's lists when a new list was asked for; the first list not
  // among them is the new one, which the add box moves to.
  const [awaited, setAwaited] = useState<readonly ListId[] | undefined>();
  const plain = lists.map(({ list }) => list);
  if (awaited !== undefined) {
    const made = plain.find(({ id }) => !awaited.includes(id));
    if (made !== undefined) {
      setAwaited(undefined);
      setChosen(made.id);
    }
  }
  const target = plain.find(({ id }) => id === chosen) ?? startingTarget(plain);
  const taken = lists.find(({ list }) => list.id === target?.id)?.contents;
  let matches = 0;
  if (search !== "") {
    matches = lists
      .flatMap(({ list, contents }) => shownItems(list, contents))
      .filter((item) => holds(item, search)).length;
  }
  return (
    <>
      <AddBox
        questId={questId}
        lists={plain}
        target={target}
        taken={taken ?? []}
        matches={matches}
        onTarget={setChosen}
        onMade={setAwaited}
        onSearch={setSearch}
      />
      {lists.flatMap(({ list, contents, href }) => [
        <FolioDivider key={`${list.id}-rule`} />,
        <QuestListSection
          key={list.id}
          questId={questId}
          list={list}
          contents={contents}
          href={href}
          history={history}
          tallies={tallies}
          next={next}
          rites={rites}
          target={list.id === target?.id}
          search={search}
        />,
      ])}
    </>
  );
}

export { QuestFolio };
