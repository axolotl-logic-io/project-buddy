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
import { NewListDialog } from "@/components/new-list-dialog.tsx";
import type { NewListZotero } from "@/components/new-list-zotero.ts";
import { QuestListSection } from "@/components/quest-list-section.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import { useEntry } from "@/components/use-entry.ts";
import { ZoteroListSection } from "@/components/zotero/zotero-list-section.tsx";
import type { QuestId } from "@/ids.ts";
import { LIST_ID, type ListId } from "@/lists/list.ts";
import type { ListItemId } from "@/lists/list-item.ts";
import type { ListItem } from "@/lists/list-item-store.ts";
import type { List } from "@/lists/list-store.ts";
import type { Rite } from "@/rites/rite.ts";
import type { TaskHistory } from "@/streaks/streaks.ts";
import type { TallyQuest } from "@/tallies/tally.ts";
import { LIST_PAGE_COPY } from "@/ui/copy/list-page.ts";
import { QUEST_OVERVIEW_COPY } from "@/ui/copy/quest-overview.ts";
import { entryHolds } from "@/zotero/works-cited.ts";
import type { ZoteroList } from "@/zotero/zotero-list-store.ts";

const COPY: typeof QUEST_OVERVIEW_COPY.addBox = QUEST_OVERVIEW_COPY.addBox;

// One of the quest's lists, with what it holds and where it opens.
interface FolioList {
  readonly list: List;
  readonly contents: readonly ListItem[];
  readonly href: Route;
  // The list's references, when it is a Zotero Collection list.
  readonly zotero?: ZoteroList | undefined;
}

// The list the add box starts on: the first task list, else the first.
function startingTarget(lists: readonly List[]): List | undefined {
  return lists.find(({ type }) => type === "task") ?? lists[0];
}

// Nothing to add to: a quest with no list of list items only searches.
function addNothing(): Promise<boolean> {
  return Promise.resolve(false);
}

type IconName = Parameters<typeof Icon>[0]["name"];

// The add box under the quest's name, as on a list's page: a field that
// searches the quest's lists as it is typed in and adds its text to the
// list marked in gold, unless that list has the text already. The lists
// to add to are chips below it, with New list, which opens a dialog that
// makes a list of any type. Each add empties the field and keeps focus in
// it.
function AddBox({
  questId,
  lists,
  known,
  target,
  taken,
  matches,
  onTarget,
  onMade,
  onSearch,
  zotero,
}: {
  readonly questId: QuestId;
  readonly lists: readonly List[];
  // Every list of the quest, Zotero Collection lists too.
  readonly known: readonly ListId[];
  readonly target: List | undefined;
  // The items of the list the box adds to.
  readonly taken: readonly ListItem[];
  // How many of the items the lists' sections show hold the search.
  readonly matches: number;
  readonly onTarget: (list: ListId) => void;
  // Called when a new list is made, with the lists there were before it.
  readonly onMade: (known: readonly ListId[]) => void;
  // Called with the field's search.
  readonly onSearch: (search: string) => void;
  // Zotero setup in New list, for the quest's owner; undefined for its
  // members.
  readonly zotero: NewListZotero | undefined;
}): JSX.Element {
  const groupLabelId = useId();
  const hintId = useId();
  const changes = useListChanges(questId);
  const { runOn } = changes;
  const [said, setSaid] = useState<string | undefined>();
  const addItem = useCallback(
    async (entry: string): Promise<boolean> => {
      setSaid(undefined);
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
  const { validate } = editorFor(target?.type ?? "task");
  let add = addItem;
  if (target === undefined) {
    add = addNothing;
  }
  const { text, problem, inputRef, change, submit, clear } = useEntry(
    validate,
    add,
  );
  const search = text.trim();
  let label = COPY.searchOnly;
  let placeholder = COPY.searchOnly;
  let hint = COPY.noList;
  if (target !== undefined) {
    label = LIST_PAGE_COPY.searchIn(target.type, target.name);
    placeholder = LIST_PAGE_COPY.search(target.type);
    const same = taken.find((item) => sameText(item, search));
    hint = LIST_PAGE_COPY.hint(target.type);
    if (same !== undefined) {
      hint = LIST_PAGE_COPY.already(same.text, same.checkedOff);
    } else if (search !== "") {
      hint = LIST_PAGE_COPY.matches(target.type, matches, search);
    }
  } else if (search !== "") {
    hint = LIST_PAGE_COPY.matches("plain", matches, search);
  }
  const icon: IconName = "search";
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
  // A new list becomes the add box's list, and the field takes focus.
  const made = useCallback(
    (before: readonly ListId[], name: string): void => {
      onMade(before);
      setSaid(COPY.made(name));
      inputRef.current?.focus();
    },
    [inputRef, onMade],
  );
  // Escape clears the search.
  const clearOnEscape = useCallback(
    (event: KeyboardEvent<HTMLInputElement>): void => {
      if (event.key === "Escape" && text !== "") {
        event.preventDefault();
        clear();
      }
    },
    [clear, text],
  );
  return (
    <form className="add-box" aria-label={COPY.label} onSubmit={submit}>
      <div className="add-box-row">
        <Icon name={icon} />
        <input
          ref={inputRef}
          type="search"
          className="add-box-field"
          aria-label={label}
          aria-describedby={hintId}
          aria-invalid={problem !== undefined}
          placeholder={placeholder}
          value={text}
          onChange={change}
          onKeyDown={clearOnEscape}
        />
        <Button type="submit" disabled={changes.busy || target === undefined}>
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
                checked={list.id === target?.id}
                onChange={choose}
                onClick={focusField}
              />
              <span className="wrap-anywhere">{list.name}</span>
            </label>
          ))}
        </div>
        <NewListDialog
          questId={questId}
          known={known}
          zotero={zotero}
          onMade={made}
        />
      </div>
      <p id={hintId} className={hintClass} aria-live="polite">
        {hint}
      </p>
      <ListChangeNotices
        changes={{
          ...changes,
          status: said,
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
  newListZotero,
}: {
  readonly questId: QuestId;
  readonly lists: readonly FolioList[];
  readonly history: TaskHistory | undefined;
  readonly tallies: TallyQuest | undefined;
  readonly next: ListItemId | undefined;
  readonly rites: readonly Rite[] | undefined;
  // Zotero setup in New list, for the quest's owner alone.
  readonly newListZotero: NewListZotero | undefined;
}): JSX.Element {
  const [chosen, setChosen] = useState<ListId | undefined>();
  const [search, setSearch] = useState("");
  // The quest's lists when a new list was asked for; the first list not
  // among them is the new one, which the add box moves to.
  const [awaited, setAwaited] = useState<readonly ListId[] | undefined>();
  // The lists the add box adds to: all but Zotero Collection lists, whose
  // references come from Zotero.
  const plain = lists.flatMap(({ list, zotero }) => {
    if (zotero !== undefined) {
      return [];
    }
    return [list];
  });
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
    matches =
      lists
        .flatMap(({ list, contents }) => shownItems(list, contents))
        .filter((item) => holds(item, search)).length +
      lists
        .flatMap(({ zotero }) => zotero?.references ?? [])
        .filter((reference) => entryHolds(reference.entry, search)).length;
  }
  return (
    <>
      <AddBox
        questId={questId}
        lists={plain}
        known={lists.map(({ list }) => list.id)}
        target={target}
        taken={taken ?? []}
        matches={matches}
        onTarget={setChosen}
        onMade={setAwaited}
        onSearch={setSearch}
        zotero={newListZotero}
      />
      {lists.flatMap(({ list, contents, href, zotero }) => {
        const rule = <FolioDivider key={`${list.id}-rule`} />;
        if (zotero !== undefined) {
          return [
            rule,
            <ZoteroListSection
              key={list.id}
              zotero={zotero}
              href={href}
              search={search}
            />,
          ];
        }
        return [
          rule,
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
        ];
      })}
    </>
  );
}

export { QuestFolio };
