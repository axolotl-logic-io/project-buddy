import type { Metadata } from "next";
import type { JSX } from "react";
import { z } from "zod";
import { requireUser } from "@/auth/current-user.ts";
import { PageWorkspace } from "@/components/page-workspace.tsx";
import { RiteChangeNotice } from "@/components/rite-change-notice.tsx";
import { RiteFinder } from "@/components/rite-finder.tsx";
import type { UserId } from "@/ids.ts";
import { RITE_CHANGE } from "@/rites/forgotten-tab.ts";
import { GRIMOIRE_FILTER } from "@/rites/grimoire-filter.ts";
import { listRites, readRite } from "@/rites/rite-store.ts";
import { GRIMOIRE_COPY } from "@/ui/copy/grimoire.ts";

const metadata: Metadata = { title: GRIMOIRE_COPY.title };

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

// The one value of a search parameter, or "" without one.
function single(value: string | string[] | undefined): string {
  if (typeof value === "string") {
    return value;
  }
  return value?.[0] ?? "";
}

// The Grimoire: a finder over every rite the user may perform, and the
// ones they forgot. ?q= is the search, ?filter= the tab, and on the
// Forgotten tab ?changed= and ?rite= report a change just made.
async function GrimoirePage({
  searchParams,
}: PageProps<"/grimoire">): Promise<JSX.Element> {
  const [user, { filter: filterQuery, q, changed, rite: changedRite }] =
    await Promise.all([requireUser(), searchParams]);
  const filter = GRIMOIRE_FILTER.safeParse(single(filterQuery)).data ?? "all";
  let report: Promise<ChangeReport | undefined> = Promise.resolve(undefined);
  if (filter === "forgotten") {
    report = reportChange(user.id, changed, changedRite);
  }
  const [active, forgotten, change] = await Promise.all([
    listRites(user.id, false),
    listRites(user.id, true),
    report,
  ]);
  return (
    <PageWorkspace>
      <div className="workspace-content">
        <RiteFinder
          forgotten={forgotten.filter(
            ({ forgottenAt }) => forgottenAt !== undefined,
          )}
          initialFilter={filter}
          initialSearch={single(q).trim()}
          key={filter}
          rites={active.filter(({ forgottenAt }) => forgottenAt === undefined)}
        >
          {change !== undefined && (
            <RiteChangeNotice key={change.key} message={change.message} />
          )}
        </RiteFinder>
      </div>
    </PageWorkspace>
  );
}

// A navigation here shows the page at once, from its App Shell.
export const instant = true;

export { metadata };
export default GrimoirePage;
