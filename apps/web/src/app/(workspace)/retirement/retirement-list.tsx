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
import { Button } from "@/components/ui/button.tsx";
import { TextField } from "@/components/ui/field.tsx";
import type { RetiredDefinition } from "@/retirement/retirement-store.ts";
import { RETIREMENT_COPY } from "@/ui/copy/retirement.ts";
import { RetirementActions } from "./retirement-actions.tsx";

// The user’s retired spells, filtered by name.
function RetirementList({
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
    <div className="workspace-content workspace-rows">
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
      <ul className="grid min-w-0">
        {filtered.map((definition) => (
          <li
            className="card flex flex-col items-start gap-2"
            key={definition.id}
          >
            <div className="w-full min-w-0">
              <h2 className="card-title wrap-anywhere">{definition.name}</h2>
              <p className="text-muted text-sm">
                {RETIREMENT_COPY.kind[definition.kind]}
                {RETIREMENT_COPY.separator}
                {RETIREMENT_COPY.dateLabel}{" "}
                <LocalTime dateTime={definition.retiredAt} detail="day" />
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-x-5">
              <Button asChild={true} variant="quiet">
                <Link
                  aria-label={RETIREMENT_COPY.viewLabel(definition.name)}
                  href={`/retirement/${definition.id}`}
                >
                  {RETIREMENT_COPY.view}
                </Link>
              </Button>
              <RetirementActions definition={definition} restore="quiet" />
            </div>
          </li>
        ))}
      </ul>
      {children}
    </div>
  );
}

export { RetirementList };
