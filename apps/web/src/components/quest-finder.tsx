"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Tabs } from "radix-ui";
import {
  type ChangeEvent,
  type JSX,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useId,
  useOptimistic,
  useState,
  useTransition,
} from "react";
import { FinderSearch } from "@/components/finder-search.tsx";
import { takeLeftQuest } from "@/components/left-quest.ts";
import {
  QuestStatusControls,
  QuestStatusFeedback,
} from "@/components/quest-status-controls.tsx";
import { StatusFeedbackContext } from "@/components/quest-status-feedback-context.ts";
import { POINTER_FOCUS_HANDLERS } from "@/components/tab-pointer-focus.ts";
import { Alert, FormStatus } from "@/components/ui/form-message.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import { TaskCheck } from "@/components/ui/task-check.tsx";
import { useQuestAction } from "@/components/use-quest-action.ts";
import type { ListItemId } from "@/lists/list-item.ts";
import { changeListItemAction } from "@/lists/list-item-actions.ts";
import type { FinderQuest } from "@/quests/quest-finder-entries.ts";
import {
  QUEST_STATUS,
  QUEST_STATUSES,
  type QuestStatus,
} from "@/quests/quest-status.ts";
import type { FoundTask } from "@/tasks/task-search-store.ts";
import { CADENCE_COPY } from "@/ui/copy/cadence.ts";
import {
  QUEST_MEMBERS_COPY,
  QUEST_SHARING_COPY,
} from "@/ui/copy/quest-members.ts";
import { QUEST_STATUS_COPY } from "@/ui/copy/quest-status.ts";
import { QUEST_FINDER_COPY, QUESTS_COPY } from "@/ui/copy/quests.ts";

// How long typing pauses before the tasks are searched.
const SEARCH_DELAY_MS = 250;

const SORTS = ["activity", "name", "newest"] as const;

type Sort = (typeof SORTS)[number];

const SORT_SET: ReadonlySet<string> = new Set(SORTS);

function isSort(value: string): value is Sort {
  return SORT_SET.has(value);
}

// One task checked off or unchecked.
interface Check {
  readonly id: ListItemId;
  readonly done: boolean;
}

function checked(
  found: readonly FoundTask[],
  change: Check,
): readonly FoundTask[] {
  return found.map((task) => {
    if (task.id !== change.id) {
      return task;
    }
    return { ...task, done: change.done };
  });
}

// Whether someone besides the user is in the quest.
function isShared({ quest }: FinderQuest): boolean {
  return quest.sharing.kind !== "private";
}

// The user's own Life, pinned above the list rather than in it.
function isOwnLife({ quest }: FinderQuest): boolean {
  return quest.life && quest.sharing.kind !== "joined";
}

function sorted(
  quests: readonly FinderQuest[],
  sort: Sort,
): readonly FinderQuest[] {
  if (sort === "name") {
    return quests.toSorted((a, b) => a.quest.name.localeCompare(b.quest.name));
  }
  if (sort === "newest") {
    return quests.toSorted(
      (a, b) => b.quest.createdAt.getTime() - a.quest.createdAt.getTime(),
    );
  }
  return quests;
}

// The text with each place it holds the search marked. Matching ignores
// case, as the search does; text whose letters change length when
// lowercased is shown unmarked.
function Highlighted({
  text,
  search,
}: {
  readonly text: string;
  readonly search: string;
}): JSX.Element {
  const haystack = text.toLowerCase();
  const needle = search.toLowerCase();
  if (needle === "" || haystack.length !== text.length) {
    return <>{text}</>;
  }
  const parts: JSX.Element[] = [];
  let from = 0;
  let at = haystack.indexOf(needle);
  while (at !== -1) {
    parts.push(<span key={`t${from}`}>{text.slice(from, at)}</span>);
    parts.push(
      <mark key={`m${at}`}>{text.slice(at, at + needle.length)}</mark>,
    );
    from = at + needle.length;
    at = haystack.indexOf(needle, from);
  }
  parts.push(<span key={`t${from}`}>{text.slice(from)}</span>);
  return <>{parts}</>;
}

// A quest's seal: its construct's initial, or a sun for Life.
function QuestSeal({
  entry,
  small = false,
}: {
  readonly entry: FinderQuest;
  readonly small?: boolean;
}): JSX.Element {
  let className = "quest-seal";
  if (small === true) {
    className = "quest-seal quest-seal-small";
  }
  let mark: JSX.Element | string = entry.seal;
  if (entry.quest.life) {
    mark = <Icon name="sun" />;
  }
  return (
    <span aria-hidden="true" className={className}>
      {mark}
    </span>
  );
}

function SharingTag({
  entry,
}: {
  readonly entry: FinderQuest;
}): JSX.Element | null {
  const mark = QUEST_SHARING_COPY.mark(entry.quest.sharing);
  if (mark === undefined) {
    return null;
  }
  return (
    <span className="quest-finder-tag">
      <Icon name="people" />
      {mark}
    </span>
  );
}

// One quest as a row: the whole row opens it. A Completed or Abandoned
// one offers Restore beneath its name.
function QuestRow({ entry }: { readonly entry: FinderQuest }): JSX.Element {
  const { quest } = entry;
  return (
    <li className="quest-finder-row">
      <QuestSeal entry={entry} />
      <div className="min-w-0">
        <div className="quest-finder-top">
          <Link
            className="quest-finder-name quest-finder-link"
            href={`/quests/${quest.id}`}
          >
            {quest.name}
          </Link>
          {entry.runningRite !== undefined && (
            <span className="quest-finder-live">
              {QUEST_FINDER_COPY.running(entry.runningRite)}
            </span>
          )}
          <SharingTag entry={entry} />
          {entry.resting === true && (
            <span className="quests-label">{QUEST_FINDER_COPY.resting}</span>
          )}
        </div>
        <p className="quest-finder-meta">{entry.activity}</p>
      </div>
      <p className="quest-finder-open">
        <strong>{entry.openTasks}</strong> {QUEST_FINDER_COPY.open}
      </p>
      <Icon className="text-muted" name="chevron-right" />
      {quest.status !== "active" && (
        <div className="quest-finder-restore">
          <QuestStatusControls quest={quest} />
        </div>
      )}
    </li>
  );
}

function selectStatus(
  select: (status: QuestStatus) => void,
  value: string,
): void {
  const status = QUEST_STATUS.safeParse(value);
  if (!status.success) {
    return;
  }
  select(status.data);
  const url = new URL(globalThis.location.href);
  url.searchParams.set("status", status.data);
  globalThis.history.replaceState(null, "", url);
}

// The user's quests by status, each status a segment, narrowed to shared
// ones on request and sorted by recent activity, name or newest.
function QuestBrowser({
  quests,
  initialStatus,
}: {
  readonly quests: readonly FinderQuest[];
  readonly initialStatus: QuestStatus;
}): JSX.Element {
  const [status, setStatus] = useState(initialStatus);
  const [sharedOnly, setSharedOnly] = useState<boolean>(false);
  const [sort, setSort] = useState<Sort>("activity");
  const sortId = useId();
  const onStatus = useCallback(
    (value: string): void => selectStatus(setStatus, value),
    [],
  );
  const toggleShared = useCallback((): void => {
    setSharedOnly((before) => !before);
  }, []);
  const chooseSort = useCallback(
    (event: ChangeEvent<HTMLSelectElement>): void => {
      const { value } = event.currentTarget;
      if (isSort(value)) {
        setSort(value);
      }
    },
    [],
  );
  let listed = quests.filter((entry) => !isOwnLife(entry));
  if (sharedOnly) {
    listed = listed.filter(isShared);
  }
  let empty: string = QUESTS_COPY.none;
  if (sharedOnly) {
    empty = QUEST_FINDER_COPY.noneShared;
  }
  return (
    <Tabs.Root
      className="flex min-w-0 flex-col gap-3"
      onValueChange={onStatus}
      value={status}
    >
      <div className="quest-finder-filters">
        <Tabs.List
          aria-label={QUEST_FINDER_COPY.statuses}
          className="quest-finder-statuses"
        >
          {QUEST_STATUSES.map((choice) => (
            <Tabs.Trigger
              className="quest-finder-status"
              key={choice}
              value={choice}
              {...POINTER_FOCUS_HANDLERS}
            >
              {QUEST_STATUS_COPY.labels[choice]}{" "}
              <span className="quest-finder-count">
                {listed.filter(({ quest }) => quest.status === choice).length}
              </span>
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        <button
          aria-pressed={sharedOnly}
          className="quest-finder-chip"
          onClick={toggleShared}
          type="button"
        >
          <Icon name="people" />
          {QUEST_FINDER_COPY.shared}
        </button>
        <div className="quest-finder-sort">
          <label className="sr-only" htmlFor={sortId}>
            {QUEST_FINDER_COPY.sortLabel}
          </label>
          <select id={sortId} onChange={chooseSort} value={sort}>
            {SORTS.map((choice) => (
              <option key={choice} value={choice}>
                {QUEST_FINDER_COPY.sorts[choice]}
              </option>
            ))}
          </select>
          <Icon name="chevron-down" />
        </div>
      </div>
      {QUEST_STATUSES.map((choice) => {
        const rows = sorted(
          listed.filter(({ quest }) => quest.status === choice),
          sort,
        );
        return (
          <Tabs.Content className="min-w-0" key={choice} value={choice}>
            {rows.length === 0 && <p className="quest-finder-empty">{empty}</p>}
            {rows.length > 0 && (
              <ul className="quest-finder-rows">
                {rows.map((entry) => (
                  <QuestRow entry={entry} key={entry.quest.id} />
                ))}
              </ul>
            )}
          </Tabs.Content>
        );
      })}
    </Tabs.Root>
  );
}

// A quest whose name holds the search.
function QuestHit({
  entry,
  search,
}: {
  readonly entry: FinderQuest;
  readonly search: string;
}): JSX.Element {
  const { quest } = entry;
  const meta = [QUEST_FINDER_COPY.openTasks(entry.openTasks), entry.activity];
  if (quest.status !== "active") {
    meta.unshift(QUEST_STATUS_COPY.labels[quest.status]);
  }
  return (
    <li className="quest-finder-hit">
      <QuestSeal entry={entry} small={true} />
      <div className="min-w-0">
        <Link
          className="quest-finder-name quest-finder-link"
          href={`/quests/${quest.id}`}
        >
          <Highlighted search={search} text={quest.name} />
        </Link>
        <p className="quest-finder-meta">{meta.join(" · ")}</p>
      </div>
      <Icon className="text-muted" name="chevron-right" />
    </li>
  );
}

// A task whose text holds the search, checked off or unchecked where it
// is found, with its quest beneath it and a link to that quest.
function TaskHit({
  task,
  search,
  onCheck,
}: {
  readonly task: FoundTask;
  readonly search: string;
  readonly onCheck: (change: Check) => void;
}): JSX.Element {
  const toggle = useCallback((): void => {
    onCheck({ id: task.id, done: !task.done });
  }, [onCheck, task.id, task.done]);
  const checkId = useId();
  const { repeats } = task;
  let where = task.quest.name;
  let repeatLabel: string | undefined;
  if (repeats !== undefined) {
    repeatLabel = CADENCE_COPY.repeats(repeats.cadence);
    if (repeats.streak > 0) {
      where = `${where} · ${CADENCE_COPY.streak(repeats.cadence, repeats.streak)}`;
    }
  }
  return (
    <li className="quest-finder-task" data-done={task.done}>
      <label className="quest-finder-check" htmlFor={checkId}>
        <TaskCheck checked={task.done} id={checkId} onChange={toggle} />
        <span className="quest-finder-task-text">
          <Highlighted search={search} text={task.text} />
        </span>
      </label>
      <p className="quest-finder-task-quest">
        {repeatLabel !== undefined && (
          <span aria-label={repeatLabel} role="img">
            <Icon name="repeat" />
          </span>
        )}
        {task.quest.shared === true && <Icon name="people" />}
        {where}
      </p>
      <Link
        aria-label={QUEST_FINDER_COPY.openTaskLabel(task.quest.name)}
        className="quest-finder-go"
        href={`/quests/${task.quest.id}`}
      >
        {QUEST_FINDER_COPY.openTask}
        <Icon name="chevron-right" />
      </Link>
    </li>
  );
}

function TaskHits({
  found,
  search,
}: {
  readonly found: readonly FoundTask[];
  readonly search: string;
}): JSX.Element {
  const headingId = useId();
  const [shown, showCheck] = useOptimistic(found, checked);
  const [earlierShown, setEarlierShown] = useState<boolean>(false);
  const { run, status, problem } = useQuestAction(changeListItemAction);
  const onCheck = useCallback(
    (change: Check): void => {
      const task = found.find(({ id }) => id === change.id);
      if (task === undefined) {
        return;
      }
      startTransition(async () => {
        showCheck(change);
        await run({
          questId: task.quest.id,
          listId: task.listId,
          change: { kind: "check", id: task.id, checkedOff: change.done },
        });
      });
    },
    [found, run, showCheck],
  );
  const toggleEarlier = useCallback((): void => {
    setEarlierShown((before) => !before);
  }, []);
  const current = shown.filter((task) => !task.earlier);
  const earlier = shown.filter((task) => task.earlier);
  const open = current.filter(({ done }) => !done).length;
  let listed: readonly FoundTask[] = current;
  if (earlierShown) {
    listed = shown;
  }
  let earlierLabel = QUEST_FINDER_COPY.showEarlier(earlier.length);
  if (earlierShown) {
    earlierLabel = QUEST_FINDER_COPY.hideEarlier;
  }
  return (
    <section aria-labelledby={headingId} className="min-w-0">
      <h2 className="quest-finder-group" id={headingId}>
        <span className="quests-label">{QUEST_FINDER_COPY.tasksHeading}</span>{" "}
        <small>
          {QUEST_FINDER_COPY.taskCounts(open, current.length - open)}
        </small>
      </h2>
      {listed.length === 0 && (
        <p className="quest-finder-empty">{QUEST_FINDER_COPY.noTasks}</p>
      )}
      {listed.length > 0 && (
        <ul className="quest-finder-results">
          {listed.map((task) => (
            <TaskHit
              key={task.id}
              onCheck={onCheck}
              search={search}
              task={task}
            />
          ))}
        </ul>
      )}
      {earlier.length > 0 && (
        <button
          aria-expanded={earlierShown}
          className="quest-finder-more"
          onClick={toggleEarlier}
          type="button"
        >
          {earlierLabel}
        </button>
      )}
      {problem !== undefined && <Alert>{problem}</Alert>}
      <FormStatus>{status}</FormStatus>
    </section>
  );
}

// What the search found: quests by name, of any status, and the tasks
// of Active quests by text.
function SearchResults({
  quests,
  found,
  search,
  busy,
}: {
  readonly quests: readonly FinderQuest[];
  readonly found: readonly FoundTask[];
  readonly search: string;
  readonly busy: boolean;
}): JSX.Element {
  const headingId = useId();
  const needle = search.toLowerCase();
  const hits = quests.filter(({ quest }) =>
    quest.name.toLowerCase().includes(needle),
  );
  return (
    <div aria-busy={busy} className="quest-finder-found">
      <section aria-labelledby={headingId} className="min-w-0">
        <h2 className="quest-finder-group" id={headingId}>
          <span className="quests-label">
            {QUEST_FINDER_COPY.questsHeading}
          </span>{" "}
          <small>{hits.length}</small>
        </h2>
        {hits.length === 0 && (
          <p className="quest-finder-empty">{QUEST_FINDER_COPY.noQuests}</p>
        )}
        {hits.length > 0 && (
          <ul className="quest-finder-results">
            {hits.map((entry) => (
              <QuestHit entry={entry} key={entry.quest.id} search={search} />
            ))}
          </ul>
        )}
      </section>
      <TaskHits found={found} key={search} search={search} />
    </div>
  );
}

// Names, once, the quest the user just left, in the status line Quests
// keeps for its feedback, which takes focus.
function LeftQuestStatus(): null {
  const publish = useContext(StatusFeedbackContext);
  useEffect(() => {
    const name = takeLeftQuest();
    if (name !== undefined) {
      publish?.({ kind: "saved", message: QUEST_MEMBERS_COPY.left(name) });
    }
  }, [publish]);
  return null;
}

// Quests' finder: a search across the user's quests and tasks, and, when
// it is empty, their quests by status. Typing searches as it pauses; the
// search is kept in the address, so a reload or a shared link finds the
// same.
function QuestFinder({
  quests,
  initialStatus,
  search,
  found,
}: {
  readonly quests: readonly FinderQuest[];
  readonly initialStatus: QuestStatus;
  // The search the tasks were found for.
  readonly search: string;
  readonly found: readonly FoundTask[];
}): JSX.Element {
  const router = useRouter();
  const [query, setQuery] = useState(search);
  const [busy, startSearch] = useTransition();
  const trimmed = query.trim();
  useEffect(() => {
    if (trimmed === search) {
      return;
    }
    const timer = setTimeout(() => {
      const url = new URL(globalThis.location.href);
      if (trimmed === "") {
        url.searchParams.delete("q");
      } else {
        url.searchParams.set("q", trimmed);
      }
      startSearch(() => {
        router.replace(`${url.pathname}${url.search}`, { scroll: false });
      });
    }, SEARCH_DELAY_MS);
    return (): void => clearTimeout(timer);
  }, [router, search, trimmed]);
  return (
    <QuestStatusFeedback>
      <LeftQuestStatus />
      <div className="quest-finder">
        <FinderSearch
          label={QUEST_FINDER_COPY.searchLabel}
          onValueChange={setQuery}
          placeholder={QUEST_FINDER_COPY.searchPlaceholder}
          value={query}
        />
        {trimmed === "" && (
          <QuestBrowser initialStatus={initialStatus} quests={quests} />
        )}
        {trimmed !== "" && (
          <SearchResults
            busy={busy || trimmed !== search}
            found={found}
            quests={quests}
            search={trimmed}
          />
        )}
      </div>
    </QuestStatusFeedback>
  );
}

export { QuestFinder };
