"use client";

import type { Route } from "next";
import {
  type ChangeEvent,
  type JSX,
  type KeyboardEvent,
  type MouseEvent,
  useCallback,
  useId,
  useState,
} from "react";
import { FolioDivider } from "@/components/folio-divider.tsx";
import { editorFor, useListChanges } from "@/components/list-changes.ts";
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

// The add box under the quest's name: a field that adds to the list
// marked in gold, chosen from the quest's lists below it, and New list,
// which turns the field to naming a new task list. Each add empties the
// field and keeps focus in it.
function AddBox({
  questId,
  lists,
  target,
  onTarget,
  onMade,
}: {
  readonly questId: QuestId;
  readonly lists: readonly List[];
  readonly target: List | undefined;
  readonly onTarget: (list: ListId) => void;
  // Called when a new list is made, with the lists there were before it.
  readonly onMade: (known: readonly ListId[]) => void;
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
      if (target === undefined) {
        return false;
      }
      const saved = await runOn(target.id, { kind: "add", text: entry });
      if (saved) {
        setSaid(COPY.added(entry, target.name));
      }
      return saved;
    },
    [runOn, target],
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
  let label = COPY.nameList;
  let hint = COPY.namingHint;
  if (naming) {
    validate = validateName;
    add = makeList;
  } else if (target !== undefined) {
    label = QUEST_OVERVIEW_COPY.addTo(target.type, target.name);
    ({ hint } = COPY);
  }
  const { text, problem, inputRef, change, submit } = useEntry(validate, add);
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
  const stopNaming = useCallback(
    (event: KeyboardEvent<HTMLInputElement>): void => {
      if (event.key === "Escape" && namingChosen) {
        event.preventDefault();
        setNaming(false);
      }
    },
    [namingChosen],
  );
  let shownHint = (
    <p id={hintId} className="add-box-hint">
      {hint}
    </p>
  );
  if (problem !== undefined) {
    shownHint = (
      <p id={hintId} className="add-box-hint error-text">
        {problem}
      </p>
    );
  }
  return (
    <form className="add-box" aria-label={COPY.label} onSubmit={submit}>
      <div className="add-box-row">
        <Icon name="plus" />
        <input
          ref={inputRef}
          className="add-box-field"
          aria-label={label}
          aria-describedby={hintId}
          aria-invalid={problem !== undefined}
          placeholder={label}
          value={text}
          onChange={change}
          onKeyDown={stopNaming}
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
      {shownHint}
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
// The add box's list is marked in gold in its section too.
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
  return (
    <>
      <AddBox
        questId={questId}
        lists={plain}
        target={target}
        onTarget={setChosen}
        onMade={setAwaited}
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
        />,
      ])}
    </>
  );
}

export { QuestFolio };
