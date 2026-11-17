"use client";

import Link from "next/link";
import {
  type ChangeEvent,
  type JSX,
  type ReactNode,
  useCallback,
  useState,
} from "react";
import { LocalTime } from "@/components/local-time.tsx";
import { TextField } from "@/components/ui/field.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import type { RetiredDefinition } from "@/retirement/retirement-store.ts";
import { RETIREMENT_COPY } from "@/ui/copy/retirement.ts";
import { ForgottenSpellControls } from "./forgotten-controls.tsx";

// The user’s forgotten spells, filtered by name.
function ForgottenSpellList({
  definitions,
  children,
}: {
  readonly definitions: readonly RetiredDefinition[];
  readonly children?: ReactNode;
}): JSX.Element {
  const [search, setSearch] = useState("");
  const changeSearch = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      setSearch(event.currentTarget.value);
    },
    [],
  );
  const filtered = definitions.filter((definition) =>
    definition.name
      .toLocaleLowerCase()
      .includes(search.trim().toLocaleLowerCase()),
  );
  let emptyMessage: string = RETIREMENT_COPY.noMatches;
  if (definitions.length === 0) {
    emptyMessage = RETIREMENT_COPY.empty;
  }
  return (
    <div className="flex min-w-0 flex-col gap-4 pt-4">
      <TextField
        className="min-h-(--target-size)"
        label={RETIREMENT_COPY.search}
        onChange={changeSearch}
        placeholder={RETIREMENT_COPY.searchPlaceholder}
        type="search"
        value={search}
      />
      <div className="flex flex-wrap justify-between gap-2 text-muted text-sm">
        <p aria-live="polite">{RETIREMENT_COPY.count(filtered.length)}</p>
        {filtered.length > 0 && <p>{RETIREMENT_COPY.sort}</p>}
      </div>
      {filtered.length === 0 && <p className="text-muted">{emptyMessage}</p>}
      <ul className="quests-index-list">
        {filtered.map((definition) => (
          <li className="quests-index-row" key={definition.id}>
            <span className="quests-index-mark">
              <Icon name="book" />
            </span>
            <div className="min-w-0">
              <h2 className="card-title wrap-anywhere">
                <Link
                  className="quests-index-link"
                  aria-label={RETIREMENT_COPY.viewLabel(definition.name)}
                  href={`/spellbook/${definition.id}`}
                >
                  {definition.name}
                </Link>
              </h2>
              <p className="text-muted text-sm">
                {RETIREMENT_COPY.kind[definition.kind]}
                {RETIREMENT_COPY.separator}
                {RETIREMENT_COPY.dateLabel}{" "}
                <LocalTime dateTime={definition.retiredAt} detail="day" />
              </p>
            </div>
            <Icon name="chevron-right" />
            <div className="quests-index-restore flex flex-wrap items-center gap-x-5">
              <ForgottenSpellControls definition={definition} restore="quiet" />
            </div>
          </li>
        ))}
      </ul>
      {children}
    </div>
  );
}

export { ForgottenSpellList };
