import type { Metadata } from "next";
import Link from "next/link";
import type { JSX } from "react";
import { z } from "zod";
import { requireUser } from "@/auth/current-user.ts";
import { CopyWithTime } from "@/components/copy-with-time.tsx";
import { ForgottenRiteActions } from "@/components/forgotten-rite-actions.tsx";
import { RiteChangeNotice } from "@/components/rite-change-notice.tsx";
import { TIME_SLOT } from "@/components/time-format.ts";
import { Button } from "@/components/ui/button.tsx";
import { SelectField, TextField } from "@/components/ui/field.tsx";
import type { UserId } from "@/ids.ts";
import { RITE_CHANGE } from "@/rites/forgotten-tab.ts";
import type { Rite } from "@/rites/rite.ts";
import { listRites, readRite } from "@/rites/rite-store.ts";
import { GRIMOIRE_COPY } from "@/ui/copy/grimoire.ts";

const metadata: Metadata = { title: GRIMOIRE_COPY.title };
const FILTER = z.enum(["all", "built-in", "own", "forgotten"]);

interface ChangeReport {
  // Tells one change from the next, so each report takes the focus anew.
  readonly key: string;
  readonly message: string;
}

// The Forgotten tab's report of the change in its address, or nothing when
// that change names no rite of the user's.
async function reportChange(
  user: UserId,
  changed: unknown,
  riteId: unknown,
): Promise<ChangeReport | undefined> {
  const change = RITE_CHANGE.safeParse(changed).data;
  const id = z.string().safeParse(riteId).data ?? "";
  const key = `${change}-${id}`;
  if (change === "unavailable") {
    return { key, message: GRIMOIRE_COPY.unavailable };
  }
  if (change === "delete") {
    return { key, message: GRIMOIRE_COPY.changed.delete };
  }
  if (change === undefined) {
    return;
  }
  const rite = await readRite(user, id, true);
  if (rite === undefined) {
    return;
  }
  return { key, message: GRIMOIRE_COPY.changed[change](rite.name) };
}

function RiteCard({ rite }: { readonly rite: Rite }): JSX.Element {
  let action = GRIMOIRE_COPY.view;
  if (rite.source === "own" && rite.forgottenAt === undefined) {
    action = GRIMOIRE_COPY.edit;
  }
  return (
    <li className="flex flex-wrap items-center gap-3">
      <h2 className="section-heading">{rite.name}</h2>
      <Button asChild={true} variant="quiet">
        <Link href={`/grimoire/${rite.id}`}>{action}</Link>
      </Button>
    </li>
  );
}

// A forgotten rite's card: its name across the card's width, the day it
// was forgotten in the browser's zone, and its actions, which wrap beneath
// the name on a phone.
function ForgottenRiteCard({
  rite,
  forgottenAt,
}: {
  readonly rite: Rite;
  readonly forgottenAt: Date;
}): JSX.Element {
  return (
    <li className="card flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1">
        <h2 className="section-heading break-words">{rite.name}</h2>
        <p className="text-muted text-sm">
          <CopyWithTime
            text={GRIMOIRE_COPY.forgottenOn(TIME_SLOT)}
            dateTime={forgottenAt}
            detail="day"
          />
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button asChild={true} variant="quiet">
          <Link href={`/grimoire/${rite.id}`}>{GRIMOIRE_COPY.view}</Link>
        </Button>
        <ForgottenRiteActions id={rite.id} name={rite.name} />
      </div>
    </li>
  );
}

async function GrimoirePage({
  searchParams,
}: PageProps<"/grimoire">): Promise<JSX.Element> {
  const [user, { filter: filterQuery, q, changed, rite: changedRite }] =
    await Promise.all([requireUser(), searchParams]);
  const filter = FILTER.safeParse(filterQuery).data ?? "all";
  const forgotten = filter === "forgotten";
  const query = z.string().trim().safeParse(q).data ?? "";
  let report: Promise<ChangeReport | undefined> = Promise.resolve(undefined);
  if (forgotten) {
    report = reportChange(user.id, changed, changedRite);
  }
  const [rites, change] = await Promise.all([
    listRites(user.id, forgotten),
    report,
  ]);
  const collection = rites.filter(
    (rite) => filter === "all" || forgotten || filter === rite.source,
  );
  const results = collection.filter((rite) =>
    rite.name.toLowerCase().includes(query.toLowerCase()),
  );
  let emptyMessage = GRIMOIRE_COPY.noMatches;
  if (collection.length === 0) {
    ({ empty: emptyMessage } = GRIMOIRE_COPY);
    if (forgotten) {
      ({ emptyForgotten: emptyMessage } = GRIMOIRE_COPY);
    }
  }
  return (
    <div className="grid gap-3">
      <Button asChild={true} variant="secondary">
        <Link href="/grimoire/new">{GRIMOIRE_COPY.create}</Link>
      </Button>
      <form action="/grimoire" className="flex flex-wrap items-end gap-3">
        <TextField
          label={GRIMOIRE_COPY.search}
          name="q"
          type="search"
          defaultValue={query}
        />
        <SelectField
          label={GRIMOIRE_COPY.filter}
          name="filter"
          defaultValue={filter}
        >
          {FILTER.options.map((option) => (
            <option key={option} value={option}>
              {GRIMOIRE_COPY.filters[option]}
            </option>
          ))}
        </SelectField>
        <Button type="submit">{GRIMOIRE_COPY.find}</Button>
      </form>
      {change !== undefined && (
        <RiteChangeNotice key={change.key} message={change.message} />
      )}
      {results.length === 0 && <p className="text-muted">{emptyMessage}</p>}
      <ul className="grid gap-3">
        {results.map((rite) => {
          if (rite.forgottenAt === undefined) {
            return <RiteCard key={rite.id} rite={rite} />;
          }
          return (
            <ForgottenRiteCard
              key={rite.id}
              rite={rite}
              forgottenAt={rite.forgottenAt}
            />
          );
        })}
      </ul>
    </div>
  );
}

export { metadata };
export default GrimoirePage;
