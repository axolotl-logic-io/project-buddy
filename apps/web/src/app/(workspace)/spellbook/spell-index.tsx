"use client";

import Link from "next/link";
import { type ChangeEvent, type JSX, useCallback, useState } from "react";
import { Button } from "@/components/ui/button.tsx";
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
type Filter = "all" | "built-in" | "own";
const FILTERS: readonly Filter[] = ["all", "built-in", "own"];
const LABELS: Readonly<Record<Filter, string>> = {
  all: SPELLBOOK_COPY.all,
  "built-in": SPELLBOOK_COPY.builtInFilter,
  own: SPELLBOOK_COPY.ownFilter,
};

function matchesFilter(entry: SpellEntry, filter: Filter): boolean {
  if (filter === "built-in") {
    return entry.builtIn;
  }
  if (filter === "own") {
    return !entry.builtIn;
  }
  return true;
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
      className="workspace-tab"
      aria-pressed={selected === filter}
      data-state={state}
      onClick={choose}
    >
      {SPELLBOOK_COPY.filterCount(LABELS[filter], count)}
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
    <li className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-line border-b py-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-2">
          <h2 className="card-title wrap-anywhere">{name}</h2>
          <span className="text-muted text-sm">{label}</span>
        </div>
        <p className="text-muted">
          {SPELLBOOK_COPY.collectionDestination(
            spellDestinationLabel(destination),
          )}
        </p>
      </div>
      <Button asChild={true} variant="secondary">
        <Link href={`/spellbook/${id}`} aria-label={`${action} ${name}`}>
          {action}
          <Icon name="chevron-right" />
        </Link>
      </Button>
    </li>
  );
}

function SpellIndex({
  entries,
}: {
  readonly entries: readonly SpellEntry[];
}): JSX.Element {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
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
      <TextField
        label={SPELLBOOK_COPY.search}
        type="search"
        value={search}
        onChange={changeSearch}
        className="min-h-(--target-size)"
      />
      <fieldset
        aria-label={SPELLBOOK_COPY.filters}
        className="workspace-tablist"
      >
        {FILTERS.map((option) => (
          <FilterButton
            key={option}
            filter={option}
            selected={filter}
            select={setFilter}
            count={
              entries.filter((entry) => matchesFilter(entry, option)).length
            }
          />
        ))}
      </fieldset>
      <p className="text-muted text-sm" role="status">
        {SPELLBOOK_COPY.results(filtered.length)}
      </p>
      {filtered.length === 0 && <p className="text-muted">{empty}</p>}
      <ul className="grid min-w-0">
        {filtered.map((entry) => (
          <SpellRow key={entry.id} entry={entry} />
        ))}
      </ul>
    </>
  );
}

export { SpellIndex };
