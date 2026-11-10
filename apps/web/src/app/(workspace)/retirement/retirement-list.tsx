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
import { PROMPT_KINDS, type PromptKind } from "@/prompts/prompt.ts";
import type { RetiredDefinition } from "@/retirement/retirement-store.ts";
import { RETIREMENT_COPY } from "@/ui/copy/retirement.ts";
import { RetirementActions } from "./retirement-actions.tsx";

// The retired definitions, filtered by kind in the workspace's tab rail and
// by a name search, as rows; children close the list, such as its notes.
function RetirementList({
  definitions,
  children,
}: {
  readonly definitions: readonly RetiredDefinition[];
  readonly children?: ReactNode;
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
  return (
    <>
      <div className="workspace-rail">
        <fieldset
          aria-label={RETIREMENT_COPY.kindFilter}
          className="workspace-tablist"
        >
          <KindTab
            label={RETIREMENT_COPY.allKinds}
            onClick={filterAll}
            selected={kind === undefined}
          />
          {PROMPT_KINDS.map((option) => (
            <KindFilter
              current={kind}
              key={option}
              kind={option}
              select={setKind}
            />
          ))}
        </fieldset>
      </div>
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
  return (
    <KindTab
      label={RETIREMENT_COPY.kinds[kind]}
      onClick={choose}
      selected={current === kind}
    />
  );
}

// One tab of the kind filter, pressed while its kind is shown.
function KindTab({
  label,
  onClick,
  selected,
}: {
  readonly label: string;
  readonly onClick: () => void;
  readonly selected: boolean;
}): JSX.Element {
  let state: "active" | "inactive" = "inactive";
  if (selected) {
    state = "active";
  }
  return (
    <button
      aria-pressed={selected}
      className="workspace-tab"
      data-state={state}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

export { RetirementList };
