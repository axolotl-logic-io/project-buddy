// Constructs shared by the Constructs page and the Workshop: the
// built-in constructs, each of which she can customize, and her own, oldest
// first, each of which she can tweak or clone, with a button that writes a
// new one from scratch.
import Link from "next/link";
import type { JSX } from "react";
import { DEFAULT_ACTIVITY_ID } from "@/activities/activity.ts";
import { requireUser } from "@/auth/current-user.ts";
import {
  type NewChatChoices,
  newChatChoices,
} from "@/chats/new-chat-choices.ts";
import { ConstructAvatar } from "@/components/constructs/construct-visual.tsx";
import { NewChatDialog } from "@/components/new-chat-dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { listConstructs as listOwnConstructs } from "@/constructs/construct-store.ts";
import {
  type ConstructId,
  type ConstructSnapshot,
  listConstructs as listBuiltInConstructs,
} from "@/constructs/index.ts";
import type { OwnPromptId } from "@/ids.ts";
import { constructPersonality } from "@/ui/copy/construct-discovery.ts";
import { CONSTRUCTS_COPY } from "@/ui/copy/constructs.ts";
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

// A construct as a card: its name, which opens New chat, then its actions.
function ConstructCard({
  construct,
  actions,
  choices,
}: {
  readonly construct: ListedConstruct;
  readonly actions: JSX.Element;
  readonly choices: NewChatChoices;
}): JSX.Element {
  return (
    <li className="card flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <ConstructAvatar construct={construct} decorative={true} />
        <div className="wrap-anywhere min-w-0">
          <NewChatDialog
            {...choices}
            fixedConstructId={construct.id}
            selectedActivityId={DEFAULT_ACTIVITY_ID}
            trigger={
              <button className="card-title text-left text-link" type="button">
                {construct.name}
              </button>
            }
          />
          <p className="text-muted text-sm">
            {constructPersonality(construct).temperament}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">{actions}</div>
    </li>
  );
}

// The built-in constructs as cards, each with a button that customizes it:
// makes a clone of her own and opens it to edit.
function BuiltInConstructCards({
  constructs,
  choices,
}: {
  readonly constructs: readonly ListedConstruct[];
  readonly choices: NewChatChoices;
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
          choices={choices}
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
  choices,
}: {
  readonly constructs: readonly ListedConstruct[];
  readonly choices: NewChatChoices;
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
              <RetireConstructForm
                constructId={construct.id}
                name={construct.name}
              />
            </>
          }
          choices={choices}
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
  choices,
}: {
  readonly constructs: readonly ListedConstruct[];
  readonly choices: NewChatChoices;
}): JSX.Element {
  if (constructs.length === 0) {
    return <p className="text-muted">{CONSTRUCTS_COPY.noOwn}</p>;
  }
  return <OwnConstructList constructs={constructs} choices={choices} />;
}

async function ConstructLists(): Promise<JSX.Element> {
  const user = await requireUser();
  const [own, choices] = await Promise.all([
    listOwnConstructs(user.id),
    newChatChoices(user.id),
  ]);
  return (
    <>
      <section
        aria-labelledby={BUILT_IN_HEADING_ID}
        className="flex flex-col gap-4"
      >
        <h2 className="section-heading" id={BUILT_IN_HEADING_ID}>
          {CONSTRUCTS_COPY.builtInHeading}
        </h2>
        <BuiltInConstructCards
          constructs={listBuiltInConstructs()}
          choices={choices}
        />
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
        <OwnConstructCards constructs={own} choices={choices} />
      </section>
    </>
  );
}

export { ConstructLists };
