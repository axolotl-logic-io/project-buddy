import type { Metadata } from "next";
import Link from "next/link";
import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { BackLink } from "@/components/ui/back-link.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  listPersonas as listBuiltInPersonas,
  type PersonaSnapshot,
} from "@/personas/index.ts";
import { listPersonas as listOwnPersonas } from "@/personas/persona-store.ts";
import { PERSONAS_COPY } from "@/ui/copy/personas.ts";
import { clonePersonaAction, editBuiltInPersonaAction } from "../actions.ts";

const BUILT_IN_HEADING_ID = "built-in-personas-heading";
const OWN_HEADING_ID = "own-personas-heading";

// A persona in a list: its name, and the id its actions name.
interface ListedPersona extends PersonaSnapshot {
  readonly id: string;
}

// A buddy as a card: its name, which links to its page, then its actions.
function PersonaCard({
  persona,
  actions,
}: {
  readonly persona: ListedPersona;
  readonly actions: JSX.Element;
}): JSX.Element {
  return (
    <li className="card flex items-center justify-between gap-3">
      <Link className="card-title text-link" href={`/buddies/${persona.id}`}>
        {persona.name}
      </Link>
      <div className="flex items-center gap-2">{actions}</div>
    </li>
  );
}

// The built-in buddies as cards, each with a button that customizes it:
// makes a clone of her own and opens it to edit.
function BuiltInPersonaCards({
  personas,
}: {
  readonly personas: readonly ListedPersona[];
}): JSX.Element {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {personas.map((persona) => (
        <PersonaCard
          actions={
            <form action={editBuiltInPersonaAction}>
              <input name="personaId" type="hidden" value={persona.id} />
              <Button
                aria-label={PERSONAS_COPY.customizeLabel(persona.name)}
                type="submit"
                variant="quiet"
              >
                {PERSONAS_COPY.customize}
              </Button>
            </form>
          }
          key={persona.id}
          persona={persona}
        />
      ))}
    </ul>
  );
}

// Her own buddies as cards, each with a link that tweaks it in place and a
// button that clones it.
function OwnPersonaList({
  personas,
}: {
  readonly personas: readonly ListedPersona[];
}): JSX.Element {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {personas.map((persona) => (
        <PersonaCard
          actions={
            <>
              <Button asChild={true} variant="quiet">
                <Link
                  aria-label={PERSONAS_COPY.tweakLabel(persona.name)}
                  href={`/buddies/${persona.id}`}
                >
                  {PERSONAS_COPY.tweak}
                </Link>
              </Button>
              <form action={clonePersonaAction}>
                <input name="sourceId" type="hidden" value={persona.id} />
                <Button
                  aria-label={PERSONAS_COPY.cloneLabel(persona.name)}
                  type="submit"
                  variant="quiet"
                >
                  {PERSONAS_COPY.clone}
                </Button>
              </form>
            </>
          }
          key={persona.id}
          persona={persona}
        />
      ))}
    </ul>
  );
}

// Her own buddies as cards, or, if she has none, a line that says so.
function OwnPersonaCards({
  personas,
}: {
  readonly personas: readonly ListedPersona[];
}): JSX.Element {
  if (personas.length === 0) {
    return <p className="text-muted">{PERSONAS_COPY.noOwn}</p>;
  }
  return <OwnPersonaList personas={personas} />;
}

export const metadata: Metadata = { title: PERSONAS_COPY.title };

// The built-in personas, each of which she can customize, and her own, oldest
// first, each of which she can tweak or clone.
export default async function PersonasPage(): Promise<JSX.Element> {
  const user = await requireUser();
  const own = await listOwnPersonas(user.id);
  return (
    <>
      <BackLink href="/">{PERSONAS_COPY.homeLink}</BackLink>
      <h1 className="page-heading">{PERSONAS_COPY.heading}</h1>
      <section
        aria-labelledby={BUILT_IN_HEADING_ID}
        className="flex flex-col gap-4"
      >
        <h2 className="section-heading" id={BUILT_IN_HEADING_ID}>
          {PERSONAS_COPY.builtInHeading}
        </h2>
        <BuiltInPersonaCards personas={listBuiltInPersonas()} />
      </section>
      <section aria-labelledby={OWN_HEADING_ID} className="flex flex-col gap-4">
        <h2 className="section-heading" id={OWN_HEADING_ID}>
          {PERSONAS_COPY.ownHeading}
        </h2>
        <OwnPersonaCards personas={own} />
      </section>
    </>
  );
}
