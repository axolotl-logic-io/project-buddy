// Constructs shared by the Constructs page and the Workshop: the
// built-in constructs, each of which she can customize, and her own, oldest
// first, each of which she can tweak or clone, with a button that writes a
// new one from scratch.
import Link from "next/link";
import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { Button } from "@/components/ui/button.tsx";
import { listConstructs as listOwnConstructs } from "@/constructs/construct-store.ts";
import {
  type ConstructSnapshot,
  listConstructs as listBuiltInConstructs,
} from "@/constructs/index.ts";
import { CONSTRUCTS_COPY } from "@/ui/copy/constructs.ts";
import {
  cloneConstructAction,
  editBuiltInConstructAction,
  newConstructAction,
} from "./actions.ts";

const BUILT_IN_HEADING_ID = "built-in-constructs-heading";
const OWN_HEADING_ID = "own-constructs-heading";

// A construct in a list: its name, and the id its actions name.
interface ListedConstruct extends ConstructSnapshot {
  readonly id: string;
}

// A construct as a card: its name, which links to its page, then its actions.
function ConstructCard({
  construct,
  actions,
}: {
  readonly construct: ListedConstruct;
  readonly actions: JSX.Element;
}): JSX.Element {
  return (
    <li className="card flex items-center justify-between gap-3">
      <Link
        className="card-title text-link"
        href={`/constructs/${construct.id}`}
      >
        {construct.name}
      </Link>
      <div className="flex items-center gap-2">{actions}</div>
    </li>
  );
}

// The built-in constructs as cards, each with a button that customizes it:
// makes a clone of her own and opens it to edit.
function BuiltInConstructCards({
  constructs,
}: {
  readonly constructs: readonly ListedConstruct[];
}): JSX.Element {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {constructs.map((construct) => (
        <ConstructCard
          actions={
            <form action={editBuiltInConstructAction}>
              <input name="constructId" type="hidden" value={construct.id} />
              <Button
                aria-label={CONSTRUCTS_COPY.customizeLabel(construct.name)}
                type="submit"
                variant="quiet"
              >
                {CONSTRUCTS_COPY.customize}
              </Button>
            </form>
          }
          key={construct.id}
          construct={construct}
        />
      ))}
    </ul>
  );
}

// Her own constructs as cards, each with a link that tweaks it in place and a
// button that clones it.
function OwnConstructList({
  constructs,
}: {
  readonly constructs: readonly ListedConstruct[];
}): JSX.Element {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {constructs.map((construct) => (
        <ConstructCard
          actions={
            <>
              <Button asChild={true} variant="quiet">
                <Link
                  aria-label={CONSTRUCTS_COPY.tweakLabel(construct.name)}
                  href={`/constructs/${construct.id}`}
                >
                  {CONSTRUCTS_COPY.tweak}
                </Link>
              </Button>
              <form action={cloneConstructAction}>
                <input name="sourceId" type="hidden" value={construct.id} />
                <Button
                  aria-label={CONSTRUCTS_COPY.cloneLabel(construct.name)}
                  type="submit"
                  variant="quiet"
                >
                  {CONSTRUCTS_COPY.clone}
                </Button>
              </form>
            </>
          }
          key={construct.id}
          construct={construct}
        />
      ))}
    </ul>
  );
}

// Her own constructs as cards, or, if she has none, a line that says so.
function OwnConstructCards({
  constructs,
}: {
  readonly constructs: readonly ListedConstruct[];
}): JSX.Element {
  if (constructs.length === 0) {
    return <p className="text-muted">{CONSTRUCTS_COPY.noOwn}</p>;
  }
  return <OwnConstructList constructs={constructs} />;
}

async function ConstructLists(): Promise<JSX.Element> {
  const user = await requireUser();
  const own = await listOwnConstructs(user.id);
  return (
    <>
      <section
        aria-labelledby={BUILT_IN_HEADING_ID}
        className="flex flex-col gap-4"
      >
        <h2 className="section-heading" id={BUILT_IN_HEADING_ID}>
          {CONSTRUCTS_COPY.builtInHeading}
        </h2>
        <BuiltInConstructCards constructs={listBuiltInConstructs()} />
      </section>
      <section aria-labelledby={OWN_HEADING_ID} className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="section-heading" id={OWN_HEADING_ID}>
            {CONSTRUCTS_COPY.ownHeading}
          </h2>
          <form action={newConstructAction}>
            <Button type="submit" variant="secondary">
              {CONSTRUCTS_COPY.newConstruct}
            </Button>
          </form>
        </div>
        <OwnConstructCards constructs={own} />
      </section>
    </>
  );
}

export { ConstructLists };
