import type { Metadata } from "next";
import Link from "next/link";
import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { listBuddies as listOwnBuddies } from "@/buddies/buddy-store.ts";
import {
  type BuddySnapshot,
  listBuddies as listBuiltInBuddies,
} from "@/buddies/index.ts";
import { BackLink } from "@/components/ui/back-link.tsx";
import { Button } from "@/components/ui/button.tsx";
import { BUDDIES_COPY } from "@/ui/copy/buddies.ts";
import { cloneBuddyAction, editBuiltInBuddyAction } from "../actions.ts";

const BUILT_IN_HEADING_ID = "built-in-buddies-heading";
const OWN_HEADING_ID = "own-buddies-heading";

// A buddy in a list: its name, and the id its actions name.
interface ListedBuddy extends BuddySnapshot {
  readonly id: string;
}

// A buddy as a card: its name, which links to its page, then its actions.
function BuddyCard({
  buddy,
  actions,
}: {
  readonly buddy: ListedBuddy;
  readonly actions: JSX.Element;
}): JSX.Element {
  return (
    <li className="card flex items-center justify-between gap-3">
      <Link className="card-title text-link" href={`/buddies/${buddy.id}`}>
        {buddy.name}
      </Link>
      <div className="flex items-center gap-2">{actions}</div>
    </li>
  );
}

// The built-in buddies as cards, each with a button that customizes it:
// makes a clone of her own and opens it to edit.
function BuiltInBuddyCards({
  buddies,
}: {
  readonly buddies: readonly ListedBuddy[];
}): JSX.Element {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {buddies.map((buddy) => (
        <BuddyCard
          actions={
            <form action={editBuiltInBuddyAction}>
              <input name="buddyId" type="hidden" value={buddy.id} />
              <Button
                aria-label={BUDDIES_COPY.customizeLabel(buddy.name)}
                type="submit"
                variant="quiet"
              >
                {BUDDIES_COPY.customize}
              </Button>
            </form>
          }
          key={buddy.id}
          buddy={buddy}
        />
      ))}
    </ul>
  );
}

// Her own buddies as cards, each with a link that tweaks it in place and a
// button that clones it.
function OwnBuddyList({
  buddies,
}: {
  readonly buddies: readonly ListedBuddy[];
}): JSX.Element {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {buddies.map((buddy) => (
        <BuddyCard
          actions={
            <>
              <Button asChild={true} variant="quiet">
                <Link
                  aria-label={BUDDIES_COPY.tweakLabel(buddy.name)}
                  href={`/buddies/${buddy.id}`}
                >
                  {BUDDIES_COPY.tweak}
                </Link>
              </Button>
              <form action={cloneBuddyAction}>
                <input name="sourceId" type="hidden" value={buddy.id} />
                <Button
                  aria-label={BUDDIES_COPY.cloneLabel(buddy.name)}
                  type="submit"
                  variant="quiet"
                >
                  {BUDDIES_COPY.clone}
                </Button>
              </form>
            </>
          }
          key={buddy.id}
          buddy={buddy}
        />
      ))}
    </ul>
  );
}

// Her own buddies as cards, or, if she has none, a line that says so.
function OwnBuddyCards({
  buddies,
}: {
  readonly buddies: readonly ListedBuddy[];
}): JSX.Element {
  if (buddies.length === 0) {
    return <p className="text-muted">{BUDDIES_COPY.noOwn}</p>;
  }
  return <OwnBuddyList buddies={buddies} />;
}

export const metadata: Metadata = { title: BUDDIES_COPY.title };

// The built-in buddies, each of which she can customize, and her own, oldest
// first, each of which she can tweak or clone.
export default async function BuddiesPage(): Promise<JSX.Element> {
  const user = await requireUser();
  const own = await listOwnBuddies(user.id);
  return (
    <>
      <BackLink href="/">{BUDDIES_COPY.homeLink}</BackLink>
      <h1 className="page-heading">{BUDDIES_COPY.heading}</h1>
      <section
        aria-labelledby={BUILT_IN_HEADING_ID}
        className="flex flex-col gap-4"
      >
        <h2 className="section-heading" id={BUILT_IN_HEADING_ID}>
          {BUDDIES_COPY.builtInHeading}
        </h2>
        <BuiltInBuddyCards buddies={listBuiltInBuddies()} />
      </section>
      <section aria-labelledby={OWN_HEADING_ID} className="flex flex-col gap-4">
        <h2 className="section-heading" id={OWN_HEADING_ID}>
          {BUDDIES_COPY.ownHeading}
        </h2>
        <OwnBuddyCards buddies={own} />
      </section>
    </>
  );
}
