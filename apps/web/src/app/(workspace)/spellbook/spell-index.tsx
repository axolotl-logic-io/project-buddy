"use client";

import Link from "next/link";
import {
  type ChangeEvent,
  type JSX,
  type ReactNode,
  useCallback,
  useState,
} from "react";
import { TextField } from "@/components/ui/field.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import {
  type SpellDestination,
  spellDestinationLabel,
} from "@/spells/spell-destination.ts";
import { SPELLBOOK_COPY } from "@/ui/copy/spells.ts";

interface SpellEntry {
  readonly id: string;
  readonly name: string;
  readonly destination: SpellDestination;
  readonly builtIn: boolean;
}
type Filter = "all" | "built-in" | "own" | "forgotten";
const FILTERS: readonly Filter[] = ["all", "built-in", "own", "forgotten"];
const LABELS: Readonly<Record<Filter, string>> = {
  forgotten: SPELLBOOK_COPY.forgotten,
  all: SPELLBOOK_COPY.all,
  "built-in": SPELLBOOK_COPY.builtInFilter,
  own: SPELLBOOK_COPY.ownFilter,
};

function matchesFilter(entry: SpellEntry, filter: Filter): boolean {
  if (filter === "forgotten") {
    return false;
  }
  if (filter === "built-in") {
    return entry.builtIn;
  }
  if (filter === "own") {
    return !entry.builtIn;
  }
  return true;
}

function filterCount(
  entries: readonly SpellEntry[],
  filter: Filter,
  forgottenCount: number,
): number {
  if (filter === "forgotten") {
    return forgottenCount;
  }
  return entries.filter((entry) => matchesFilter(entry, filter)).length;
}

function FilterButton({
  filter,
  selected,
  count,
  select,
}: {
  readonly filter: Filter;
  readonly selected: Filter;
  readonly count: number;
  readonly select: (filter: Filter) => void;
}): JSX.Element {
  let state = "inactive";
  if (selected === filter) {
    state = "active";
  }
  const choose = useCallback((): void => select(filter), [filter, select]);
  return (
    <button
      type="button"
      className="quests-index-tab"
      aria-label={SPELLBOOK_COPY.filterCount(LABELS[filter], count)}
      aria-pressed={selected === filter}
      data-state={state}
      onClick={choose}
    >
      {LABELS[filter]}
      <span aria-hidden="true" className="quests-index-count">
        {count}
      </span>
    </button>
  );
}

function SpellRow({
  entry: { id, name, destination, builtIn },
}: {
  readonly entry: SpellEntry;
}): JSX.Element {
  let label = SPELLBOOK_COPY.ownFilter;
  let action = SPELLBOOK_COPY.edit;
  if (builtIn) {
    label = SPELLBOOK_COPY.builtInFilter;
    action = SPELLBOOK_COPY.view;
  }
  return (
    <li className="quests-index-row">
      <span className="quests-index-mark">
        <Icon name="book" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
        <Link
          className="card-title quests-index-link"
          href={`/spellbook/${id}`}
          aria-label={`${action} ${name}`}
        >
          {name}
        </Link>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-muted text-sm">
          <span>{label}</span>
          <span>
            {SPELLBOOK_COPY.collectionDestination(
              spellDestinationLabel(destination),
            )}
          </span>
        </span>
      </div>
      <Icon name="chevron-right" />
    </li>
  );
}

function SpellIndex({
  entries,
  forgotten,
  forgottenCount,
  initialFilter,
}: {
  readonly entries: readonly SpellEntry[];
  readonly forgotten: ReactNode;
  readonly forgottenCount: number;
  readonly initialFilter?: string | undefined;
}): JSX.Element {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>(() => {
    if (initialFilter === "forgotten") {
      return "forgotten";
    }
    return "all";
  });
  const changeSearch = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void =>
      setSearch(event.currentTarget.value),
    [],
  );
  const filtered = entries.filter(
    (entry) =>
      matchesFilter(entry, filter) &&
      entry.name
        .toLocaleLowerCase()
        .includes(search.trim().toLocaleLowerCase()),
  );
  let empty = SPELLBOOK_COPY.noMatches;
  if (
    filter === "own" &&
    search.trim() === "" &&
    !entries.some((entry) => !entry.builtIn)
  ) {
    ({ empty } = SPELLBOOK_COPY);
  }
  return (
    <>
      {filter !== "forgotten" && (
        <TextField
          label={SPELLBOOK_COPY.search}
          type="search"
          value={search}
          onChange={changeSearch}
          className="min-h-(--target-size)"
        />
      )}
      <fieldset
        aria-label={SPELLBOOK_COPY.filters}
        className="quests-index-tabs"
      >
        {FILTERS.map((option) => (
          <FilterButton
            key={option}
            filter={option}
            selected={filter}
            select={setFilter}
            count={filterCount(entries, option, forgottenCount)}
          />
        ))}
      </fieldset>
      <div className="quests-index-content">
        {filter === "forgotten" && forgotten}
        {filter !== "forgotten" && (
          <>
            <p className="sr-only" role="status">
              {SPELLBOOK_COPY.results(filtered.length)}
            </p>
            {filtered.length === 0 && (
              <p className="quests-index-empty">{empty}</p>
            )}
            <ul className="quests-index-list">
              {filtered.map((entry) => (
                <SpellRow key={entry.id} entry={entry} />
              ))}
            </ul>
          </>
        )}
      </div>
    </>
  );
}

export { SpellIndex };
