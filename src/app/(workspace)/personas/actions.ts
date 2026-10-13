"use server";

import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/auth/current-user.ts";
import { isPersonaId } from "@/personas/index.ts";
import { defaultPart, PERSONA_PART_KEYS } from "@/personas/part-defaults.ts";
import { PERSONA_PARTS } from "@/personas/persona-parts-schema.ts";
import {
  clonePersona,
  getUserPersona,
  updatePersona,
} from "@/personas/persona-store.ts";

const CLONE_PERSONA_FORM = z.object({ sourceId: z.string() });

const PERSONA_FORM = z.object({ personaId: z.string() });

// A browser sends a textarea's line breaks as CRLF.
const LINE_BREAK = /\r\n?/gu;

const SAVE_PERSONA_FORM = z.object({
  personaId: z.string(),
  name: z.string().trim().min(1),
});

const RESET_PART_FORM = z.object({
  personaId: z.string(),
  part: z.enum(PERSONA_PART_KEYS),
});

// The form's fields as text, its textareas' line breaks as LF; a file stays
// a file, for the schema to refuse.
function formFields(formData: FormData): Record<string, unknown> {
  return Object.fromEntries(
    [...formData].map(([key, value]) => {
      if (typeof value === "string") {
        return [key, value.replace(LINE_BREAK, "\n")];
      }
      return [key, value];
    }),
  );
}

// The persona's page.
function personaPage(personaId: string): never {
  return redirect(`/personas/${personaId}`);
}

// Clones the persona the form names, a built-in one or one of her own, as a
// new persona of hers named "<name> (copy)", then shows her personas. A
// source that is missing, unknown or another user's clones nothing. A
// storage failure throws, for the error boundary.
export async function clonePersonaAction(formData: FormData): Promise<never> {
  const user = await requireUser();
  const form = CLONE_PERSONA_FORM.safeParse(Object.fromEntries(formData));
  if (form.success) {
    await clonePersona(user.id, form.data.sourceId);
  }
  return redirect("/personas");
}

// Saves the name and every part of her persona that the form names, then
// shows its page. A form missing the name or a part, or whose persona is
// malformed, unknown or another user's, saves nothing and is not found.
export async function savePersonaAction(formData: FormData): Promise<never> {
  const user = await requireUser();
  const fields = formFields(formData);
  const form = SAVE_PERSONA_FORM.safeParse(fields);
  const parts = PERSONA_PARTS.safeParse(fields);
  if (!(form.success && parts.success)) {
    notFound();
  }
  const { personaId, name } = form.data;
  const saved = await updatePersona(user.id, personaId, {
    name,
    parts: parts.data,
  });
  if (saved === undefined) {
    notFound();
  }
  return personaPage(saved.id);
}

// Resets one part of her persona to its default (see defaultPart), keeping
// every other part, then shows its page. A persona that is malformed,
// unknown or another user's, or a part that isn't one, is not found.
export async function resetPersonaPartAction(
  formData: FormData,
): Promise<never> {
  const user = await requireUser();
  const form = RESET_PART_FORM.safeParse(Object.fromEntries(formData));
  if (!form.success) {
    notFound();
  }
  const { personaId, part } = form.data;
  const persona = await getUserPersona(user.id, personaId);
  if (persona === undefined) {
    notFound();
  }
  const reset = await updatePersona(user.id, persona.id, {
    parts: { ...persona.parts, [part]: defaultPart(part, persona.clonedFrom) },
  });
  if (reset === undefined) {
    notFound();
  }
  return personaPage(reset.id);
}

// Starts editing a built-in persona: clones it as a new persona of hers, as
// clonePersonaAction does, then opens the clone's page. An id that is not a
// built-in persona's clones nothing and is not found.
export async function editBuiltInPersonaAction(
  formData: FormData,
): Promise<never> {
  const user = await requireUser();
  const form = PERSONA_FORM.safeParse(Object.fromEntries(formData));
  if (!(form.success && isPersonaId(form.data.personaId))) {
    notFound();
  }
  const clone = await clonePersona(user.id, form.data.personaId);
  if (clone === undefined) {
    notFound();
  }
  return personaPage(clone.id);
}
