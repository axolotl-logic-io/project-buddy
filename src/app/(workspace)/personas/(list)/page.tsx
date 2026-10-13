import type { Metadata } from "next";
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
import { clonePersonaAction } from "../actions.ts";

const BUILT_IN_HEADING_ID = "built-in-personas-heading";
const OWN_HEADING_ID = "own-personas-heading";

// A persona in a list: its name, and the id a clone of it is made from.
interface ListedPersona extends PersonaSnapshot {
  readonly id: string;
}

// The personas as cards, each with its name and a button that clones it.
function PersonaCards({
  personas,
}: {
  readonly personas: readonly ListedPersona[];
}): JSX.Element {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {personas.map((persona) => (
        <li
          className="card flex items-center justify-between gap-3"
          key={persona.id}
        >
          <span className="card-title">{persona.name}</span>
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
        </li>
      ))}
    </ul>
  );
}

// Her own personas as cards, or, if she has none, a line that says so.
function OwnPersonaCards({
  personas,
}: {
  readonly personas: readonly ListedPersona[];
}): JSX.Element {
  if (personas.length === 0) {
    return <p className="text-muted">{PERSONAS_COPY.noOwn}</p>;
  }
  return <PersonaCards personas={personas} />;
}

export const metadata: Metadata = { title: PERSONAS_COPY.title };

// The built-in personas and her own, oldest first, each of which she can
// clone into a new persona of her own.
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
        <PersonaCards personas={listBuiltInPersonas()} />
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
