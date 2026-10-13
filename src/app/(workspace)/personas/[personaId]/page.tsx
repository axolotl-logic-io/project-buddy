import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { BackLink } from "@/components/ui/back-link.tsx";
import { Button } from "@/components/ui/button.tsx";
import { TextField } from "@/components/ui/field.tsx";
import { getPersona, isPersonaId, type Persona } from "@/personas/index.ts";
import { getUserPersona, type UserPersona } from "@/personas/persona-store.ts";
import { PERSONA_COPY } from "@/ui/copy/personas.ts";
import { editBuiltInPersonaAction, savePersonaAction } from "../actions.ts";
import { FixedParts } from "./fixed-parts.tsx";
import { PartFields, ResetPartForms } from "./part-fields.tsx";

const PARTS_HEADING_ID = "persona-parts-heading";

// The page's heading and the line under it.
function PersonaHeading({
  name,
  intro,
}: {
  readonly name: string;
  readonly intro: string;
}): JSX.Element {
  return (
    <>
      <BackLink href="/personas">{PERSONA_COPY.personasLink}</BackLink>
      <div className="flex flex-col gap-2">
        <h1 className="page-heading">{name}</h1>
        <p className="text-muted">{intro}</p>
      </div>
    </>
  );
}

// A built-in persona, every part read-only, with a button that starts
// editing a copy of it.
function BuiltInPersona({
  persona,
}: {
  readonly persona: Persona;
}): JSX.Element {
  return (
    <>
      <PersonaHeading intro={PERSONA_COPY.builtInIntro} name={persona.name} />
      <form action={editBuiltInPersonaAction}>
        <input name="personaId" type="hidden" value={persona.id} />
        <Button type="submit">{PERSONA_COPY.edit}</Button>
      </form>
      <section
        aria-labelledby={PARTS_HEADING_ID}
        className="flex flex-col gap-4"
      >
        <h2 className="section-heading" id={PARTS_HEADING_ID}>
          {PERSONA_COPY.partsHeading}
        </h2>
        <PartFields editable={false} parts={persona.parts} />
      </section>
      <FixedParts />
    </>
  );
}

// Her own persona as a form that saves its name and every part. The form
// starts afresh whenever the persona changes, so it shows what was saved.
function OwnPersona({
  persona,
}: {
  readonly persona: UserPersona;
}): JSX.Element {
  return (
    <>
      <PersonaHeading intro={PERSONA_COPY.ownIntro} name={persona.name} />
      <form
        action={savePersonaAction}
        className="flex flex-col gap-4"
        key={persona.updatedAt.toISOString()}
      >
        <input name="personaId" type="hidden" value={persona.id} />
        <div className="panel">
          <TextField
            defaultValue={persona.name}
            label={PERSONA_COPY.nameLabel}
            name="name"
            required={true}
          />
        </div>
        <h2 className="section-heading" id={PARTS_HEADING_ID}>
          {PERSONA_COPY.partsHeading}
        </h2>
        <PartFields editable={true} parts={persona.parts} />
        <Button className="self-start" type="submit">
          {PERSONA_COPY.save}
        </Button>
      </form>
      <ResetPartForms personaId={persona.id} />
      <FixedParts />
    </>
  );
}

export const metadata: Metadata = { title: PERSONA_COPY.title };

// A persona's prompt as named parts: a built-in persona's read-only, her own
// to edit. Another user's persona, or an unknown id, is not found.
export default async function PersonaPage({
  params,
}: PageProps<"/personas/[personaId]">): Promise<JSX.Element> {
  const { personaId } = await params;
  const user = await requireUser();
  if (isPersonaId(personaId)) {
    return <BuiltInPersona persona={getPersona(personaId)} />;
  }
  const persona = await getUserPersona(user.id, personaId);
  if (persona === undefined) {
    notFound();
  }
  return <OwnPersona persona={persona} />;
}
