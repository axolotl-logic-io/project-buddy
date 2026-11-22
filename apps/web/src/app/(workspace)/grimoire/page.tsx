import type { Metadata } from "next";
import Link from "next/link";
import type { JSX } from "react";
import { z } from "zod";
import { requireUser } from "@/auth/current-user.ts";
import { Button } from "@/components/ui/button.tsx";
import { SelectField, TextField } from "@/components/ui/field.tsx";
import { Notice } from "@/components/ui/form-message.tsx";
import { listRites } from "@/rites/rite-store.ts";
import { GRIMOIRE_COPY } from "@/ui/copy/grimoire.ts";

const metadata: Metadata = { title: GRIMOIRE_COPY.title };
const FILTER = z.enum(["all", "built-in", "own", "forgotten"]);

async function GrimoirePage({
  searchParams,
}: PageProps<"/grimoire">): Promise<JSX.Element> {
  const [user, { filter: filterQuery, q }] = await Promise.all([
    requireUser(),
    searchParams,
  ]);
  const filter = FILTER.safeParse(filterQuery).data ?? "all";
  const query = z.string().trim().safeParse(q).data ?? "";
  const collection = (await listRites(user.id, filter === "forgotten")).filter(
    (rite) =>
      filter === "all" || filter === "forgotten" || filter === rite.source,
  );
  const results = collection.filter((rite) =>
    rite.name.toLowerCase().includes(query.toLowerCase()),
  );
  let emptyMessage = GRIMOIRE_COPY.noMatches;
  if (collection.length === 0) {
    ({ empty: emptyMessage } = GRIMOIRE_COPY);
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
      {results.length === 0 && <Notice>{emptyMessage}</Notice>}
      <ul className="grid gap-3">
        {results.map((rite) => {
          let action = GRIMOIRE_COPY.view;
          if (rite.source === "own" && rite.forgotten !== true) {
            action = GRIMOIRE_COPY.edit;
          }
          return (
            <li key={rite.id} className="flex flex-wrap items-center gap-3">
              <h2 className="section-heading">{rite.name}</h2>
              <Button asChild={true} variant="quiet">
                <Link href={`/grimoire/${rite.id}`}>{action}</Link>
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export { metadata };
export default GrimoirePage;
