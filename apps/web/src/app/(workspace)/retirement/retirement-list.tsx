"use client";

import Link from "next/link";
import { type ChangeEvent, type JSX, useCallback, useState } from "react";
import { LocalTime } from "@/components/local-time.tsx";
import { Button } from "@/components/ui/button.tsx";
import { TextField } from "@/components/ui/field.tsx";
import { PROMPT_KINDS, type PromptKind } from "@/prompts/prompt.ts";
import type { RetiredDefinition } from "@/retirement/retirement-store.ts";
import { RETIREMENT_COPY } from "@/ui/copy/retirement.ts";
import { RetirementActions } from "./retirement-actions.tsx";

function RetirementList({
  definitions,
}: {
  readonly definitions: readonly RetiredDefinition[];
}): JSX.Element {
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<PromptKind | undefined>();
  const changeSearch = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      setSearch(event.currentTarget.value);
    },
    [],
  );
  const filterAll = useCallback((): void => {
    setKind(undefined);
  }, []);
  const filtered = definitions.filter(
    (definition) =>
      (kind === undefined || definition.kind === kind) &&
      definition.name
        .toLocaleLowerCase()
        .includes(search.trim().toLocaleLowerCase()),
  );
  let emptyMessage: string = RETIREMENT_COPY.noMatches;
  if (definitions.length === 0) {
    emptyMessage = RETIREMENT_COPY.empty;
  }
  let allVariant: "primary" | "secondary" = "secondary";
  if (kind === undefined) {
    allVariant = "primary";
  }
  return (
    <>
      <TextField
        className="min-h-(--target-size)"
        label={RETIREMENT_COPY.search}
        onChange={changeSearch}
        placeholder={RETIREMENT_COPY.searchPlaceholder}
        type="search"
        value={search}
      />
      <fieldset
        aria-label={RETIREMENT_COPY.kindFilter}
        className="flex flex-wrap gap-2"
      >
        <Button
          aria-pressed={kind === undefined}
          onClick={filterAll}
          variant={allVariant}
        >
          {RETIREMENT_COPY.allKinds}
        </Button>
        {PROMPT_KINDS.map((option) => (
          <KindFilter
            current={kind}
            key={option}
            kind={option}
            select={setKind}
          />
        ))}
      </fieldset>
      <div className="flex flex-wrap justify-between gap-2 text-muted text-sm">
        <p aria-live="polite">{RETIREMENT_COPY.count(filtered.length)}</p>
        <p>{RETIREMENT_COPY.sort}</p>
      </div>
      {filtered.length === 0 && <p className="text-muted">{emptyMessage}</p>}
      <ul className="flex flex-col gap-3">
        {filtered.map((definition) => (
          <li
            className="card flex flex-col items-start gap-3"
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
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild={true} variant="quiet">
                <Link
                  aria-label={RETIREMENT_COPY.viewLabel(definition.name)}
                  href={`/retirement/${definition.id}`}
                >
                  {RETIREMENT_COPY.view}
                </Link>
              </Button>
              <RetirementActions definition={definition} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
function KindFilter({
  current,
  kind,
  select,
}: {
  readonly current: PromptKind | undefined;
  readonly kind: PromptKind;
  readonly select: (kind: PromptKind) => void;
}): JSX.Element {
  const choose = useCallback((): void => {
    select(kind);
  }, [kind, select]);
  let variant: "primary" | "secondary" = "secondary";
  if (current === kind) {
    variant = "primary";
  }
  return (
    <Button aria-pressed={current === kind} onClick={choose} variant={variant}>
      {RETIREMENT_COPY.kinds[kind]}
    </Button>
  );
}

export { RetirementList };
