// Constructs shared by the Constructs page and the Workshop: the
// built-in constructs, each of which she can customize, and her own, oldest
// first, each of which she can tweak or clone, with a button that crafts a new one.
import Link from "next/link";
import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { ConstructAvatar } from "@/components/constructs/construct-visual.tsx";
import { PageWorkspace } from "@/components/page-workspace.tsx";
import { Button } from "@/components/ui/button.tsx";
import { WorkspaceTabs } from "@/components/workspace-tabs.tsx";
import { listConstructs as listOwnConstructs } from "@/constructs/construct-store.ts";
import {
  type ConstructId,
  type ConstructSnapshot,
  listConstructs as listBuiltInConstructs,
} from "@/constructs/index.ts";
import type { OwnPromptId } from "@/ids.ts";
import { listRetiredDefinitions } from "@/retirement/retirement-store.ts";
import { constructPersonality } from "@/ui/copy/construct-discovery.ts";
import { CONSTRUCTS_COPY } from "@/ui/copy/constructs.ts";
import { WORKSPACES_COPY } from "@/ui/copy/workspaces.ts";
import { RetirementList } from "../retirement/retirement-list.tsx";
import {
  cloneConstructAction,
  editBuiltInConstructAction,
  newConstructAction,
} from "./actions.ts";

import { RetireConstructForm } from "./retire-construct-form.tsx";

const BUILT_IN_HEADING_ID = "built-in-constructs-heading";
const OWN_HEADING_ID = "own-constructs-heading";

// A construct in a list: its name, and the id its actions name.
interface ListedConstruct extends ConstructSnapshot {
  readonly id: ConstructId | OwnPromptId;
}

// A construct as a card: its avatar beside its name, which opens its page,
// its temperament and its actions, in one column. Quests start only from
// Start a quest, where the construct is chosen.
function ConstructCard({
  construct,
  actions,
}: {
  readonly construct: ListedConstruct;
  readonly actions: JSX.Element;
}): JSX.Element {
  return (
    <li className="card construct-card">
      <ConstructAvatar
        destination={{ kind: "construct", id: construct.id }}
        construct={construct}
        decorative={true}
      />
      <div className="flex min-w-0 flex-col gap-2">
        <Link
          className="card-title wrap-anywhere self-start text-link"
          href={`/constructs/${construct.id}`}
        >
          {construct.name}
        </Link>
        <p className="wrap-anywhere text-muted text-sm">
          {constructPersonality(construct).temperament}
        </p>
        <div className="card-actions">{actions}</div>
      </div>
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
    <ul className="definition-grid">
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
    <ul className="definition-grid">
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
              <RetireConstructForm
                constructId={construct.id}
                name={construct.name}
              />
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

async function ConstructLists({
  workspace = false,
}: {
  readonly workspace?: boolean;
} = {}): Promise<JSX.Element> {
  const user = await requireUser();
  const own = await listOwnConstructs(user.id);
  if (workspace === true) {
    const retired = await listRetiredDefinitions(user.id);
    return (
      <PageWorkspace
        title={CONSTRUCTS_COPY.heading}
        intro={CONSTRUCTS_COPY.intro}
        action={
          <form action={newConstructAction}>
            <Button type="submit">{CONSTRUCTS_COPY.newConstruct}</Button>
          </form>
        }
      >
        <WorkspaceTabs
          label={CONSTRUCTS_COPY.heading}
          sections={[
            {
              id: "built-in",
              label: WORKSPACES_COPY.builtIn,
              content: (
                <div className="workspace-rows">
                  <BuiltInConstructCards constructs={listBuiltInConstructs()} />
                </div>
              ),
            },
            {
              id: "yours",
              label: WORKSPACES_COPY.yours,
              content: (
                <div className="workspace-rows">
                  <OwnConstructCards constructs={own} />
                </div>
              ),
            },
            {
              id: "retired",
              label: WORKSPACES_COPY.retired,
              content: (
                <div className="flex flex-col gap-4">
                  <RetirementList definitions={retired} kind="construct" />
                </div>
              ),
            },
          ]}
        />
      </PageWorkspace>
    );
  }
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
