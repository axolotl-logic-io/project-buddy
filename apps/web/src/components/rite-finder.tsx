"use client";

import Link from "next/link";
import { Tabs } from "radix-ui";
import { type JSX, type ReactNode, useCallback, useState } from "react";
import { CopyWithTime } from "@/components/copy-with-time.tsx";
import { FinderSearch } from "@/components/finder-search.tsx";
import { ForgottenRiteActions } from "@/components/forgotten-rite-actions.tsx";
import { RiteSeal, RiteText } from "@/components/rite-text.tsx";
import { POINTER_FOCUS_HANDLERS } from "@/components/tab-pointer-focus.ts";
import { TIME_SLOT } from "@/components/time-format.ts";
import { Icon } from "@/components/ui/icon.tsx";
import {
  GRIMOIRE_FILTER,
  type GrimoireFilter,
} from "@/rites/grimoire-filter.ts";
import type { Rite } from "@/rites/rite.ts";
import { GRIMOIRE_COPY } from "@/ui/copy/grimoire.ts";

interface ForgottenRite extends Rite {
  readonly forgottenAt: Date;
}

// Keeps a choice in the address, so a reload or a shared link shows the
// same; an empty value leaves the address.
function keepInAddress(name: string, value: string): void {
  const url = new URL(globalThis.location.href);
  if (value === "") {
    url.searchParams.delete(name);
  } else {
    url.searchParams.set(name, value);
  }
  globalThis.history.replaceState(null, "", url);
}

// Whether the rite's name or first message holds the search, in any case.
function matches(rite: Rite, needle: string): boolean {
  return (
    rite.name.toLowerCase().includes(needle) ||
    rite.firstMessage.toLowerCase().includes(needle)
  );
}

function ReplyCount({ rite }: { readonly rite: Rite }): JSX.Element {
  const count = rite.replies.length;
  return (
    <p className="quest-finder-open">
      <strong>{count}</strong> {GRIMOIRE_COPY.repliesAfterCount(count)}
    </p>
  );
}

// A rite as a row: the whole row opens it. Its first message shows what it
// says, and its reply count how much it can say.
function RiteRow({ rite }: { readonly rite: Rite }): JSX.Element {
  return (
    <li className="quest-finder-row">
      <RiteSeal rite={rite} />
      <div className="min-w-0">
        <div className="quest-finder-top">
          <Link
            className="quest-finder-name quest-finder-link rite-finder-link"
            href={`/grimoire/${rite.id}`}
          >
            {rite.name}
          </Link>
          {rite.source === "built-in" && (
            <span className="quest-finder-tag">{GRIMOIRE_COPY.builtInTag}</span>
          )}
        </div>
        <p className="rite-finder-first">
          <RiteText text={rite.firstMessage} />
        </p>
        {rite.source === "built-in" && (
          <p className="quest-finder-meta">{GRIMOIRE_COPY.readOnly}</p>
        )}
        {rite.updatedAt !== undefined && (
          <p className="quest-finder-meta">
            <CopyWithTime
              dateTime={rite.updatedAt}
              detail="day"
              text={GRIMOIRE_COPY.editedOn(TIME_SLOT)}
            />
          </p>
        )}
      </div>
      <ReplyCount rite={rite} />
      <Icon className="text-muted" name="chevron-right" />
    </li>
  );
}

// A forgotten rite's row: the day it was forgotten, in the browser's zone,
// and Restore and Delete forever beneath its name.
function ForgottenRiteRow({
  rite,
}: {
  readonly rite: ForgottenRite;
}): JSX.Element {
  return (
    <li className="quest-finder-row rite-finder-forgotten">
      <RiteSeal rite={rite} />
      <div className="min-w-0">
        <Link
          className="quest-finder-name quest-finder-link rite-finder-link"
          href={`/grimoire/${rite.id}`}
        >
          {rite.name}
        </Link>
        <p className="rite-finder-first">
          <RiteText text={rite.firstMessage} />
        </p>
        <p className="quest-finder-meta">
          <CopyWithTime
            dateTime={rite.forgottenAt}
            detail="day"
            text={GRIMOIRE_COPY.forgottenOn(TIME_SLOT)}
          />
        </p>
      </div>
      <ReplyCount rite={rite} />
      <Icon className="text-muted" name="chevron-right" />
      <div className="quest-finder-restore">
        <ForgottenRiteActions id={rite.id} name={rite.name} />
      </div>
    </li>
  );
}

// What each tab says when it has no rites at all.
const EMPTY: Readonly<Record<GrimoireFilter, string>> = {
  all: GRIMOIRE_COPY.empty,
  "built-in": GRIMOIRE_COPY.empty,
  own: GRIMOIRE_COPY.emptyOwn,
  forgotten: GRIMOIRE_COPY.emptyForgotten,
};

function RiteRows({
  filter,
  rites,
  needle,
}: {
  readonly filter: GrimoireFilter;
  readonly rites: readonly Rite[];
  readonly needle: string;
}): JSX.Element {
  const found = rites.filter((rite) => matches(rite, needle));
  if (found.length === 0) {
    // A tab with rites, none of which match the search, says so.
    let message = EMPTY[filter];
    if (rites.length > 0) {
      message = GRIMOIRE_COPY.noMatches;
    }
    return <p className="quest-finder-empty">{message}</p>;
  }
  return (
    <ul className="quest-finder-rows">
      {found.map((rite) => {
        const { forgottenAt } = rite;
        if (forgottenAt === undefined) {
          return <RiteRow key={rite.id} rite={rite} />;
        }
        return (
          <ForgottenRiteRow key={rite.id} rite={{ ...rite, forgottenAt }} />
        );
      })}
    </ul>
  );
}

function selectFilter(
  select: (filter: GrimoireFilter) => void,
  value: string,
): void {
  const filter = GRIMOIRE_FILTER.safeParse(value);
  if (!filter.success) {
    return;
  }
  select(filter.data);
  keepInAddress("filter", filter.data);
}

// The Grimoire's finder: a search over the rites' names and first
// messages, and tabs for All, Built-in, Yours and Forgotten, each counting
// the rites that match. The search filters as the user types, and both are
// kept in the address. The notice, if any, sits between the tabs and the
// rites.
function RiteFinder({
  rites,
  forgotten,
  initialFilter,
  initialSearch,
  children,
}: {
  // The built-in rites and the user's own active ones.
  readonly rites: readonly Rite[];
  readonly forgotten: readonly Rite[];
  readonly initialFilter: GrimoireFilter;
  readonly initialSearch: string;
  readonly children?: ReactNode;
}): JSX.Element {
  const [filter, setFilter] = useState(initialFilter);
  const [query, setQuery] = useState(initialSearch);
  const onFilter = useCallback(
    (value: string): void => selectFilter(setFilter, value),
    [],
  );
  const search = useCallback((value: string): void => {
    setQuery(value);
    keepInAddress("q", value.trim());
  }, []);
  const needle = query.trim().toLowerCase();
  const collections: Record<GrimoireFilter, readonly Rite[]> = {
    all: rites,
    "built-in": rites.filter(({ source }) => source === "built-in"),
    own: rites.filter(({ source }) => source === "own"),
    forgotten,
  };
  return (
    <div className="quest-finder">
      <FinderSearch
        label={GRIMOIRE_COPY.searchLabel}
        onValueChange={search}
        placeholder={GRIMOIRE_COPY.searchPlaceholder}
        value={query}
      />
      <Tabs.Root
        className="flex min-w-0 flex-col gap-3"
        onValueChange={onFilter}
        value={filter}
      >
        <div className="quest-finder-filters">
          <Tabs.List
            aria-label={GRIMOIRE_COPY.filter}
            className="quest-finder-statuses"
          >
            {GRIMOIRE_FILTER.options.map((choice) => (
              <Tabs.Trigger
                className="quest-finder-status"
                key={choice}
                value={choice}
                {...POINTER_FOCUS_HANDLERS}
              >
                {GRIMOIRE_COPY.filters[choice]}{" "}
                <span className="quest-finder-count">
                  {
                    collections[choice].filter((rite) => matches(rite, needle))
                      .length
                  }
                </span>
              </Tabs.Trigger>
            ))}
          </Tabs.List>
        </div>
        {children}
        {GRIMOIRE_FILTER.options.map((choice) => (
          <Tabs.Content className="min-w-0" key={choice} value={choice}>
            <RiteRows
              filter={choice}
              needle={needle}
              rites={collections[choice]}
            />
          </Tabs.Content>
        ))}
      </Tabs.Root>
    </div>
  );
}

export { RiteFinder };
