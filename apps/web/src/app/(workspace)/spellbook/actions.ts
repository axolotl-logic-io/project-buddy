"use server";

import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/auth/current-user.ts";
import { isSpellId } from "@/spells/index.ts";
import { defaultSpellPart, SPELL_PART_KEYS } from "@/spells/part-defaults.ts";
import { SPELL_NAME_MAX } from "@/spells/spell.ts";
import { SPELL_PARTS_EDIT } from "@/spells/spell-parts-schema.ts";
import {
  cloneSpell,
  deleteSpell,
  getOwnSpell,
  updateSpell,
} from "@/spells/spell-store.ts";

const SPELLBOOK_PATH = "/spellbook";

const CLONE_SPELL_FORM = z.object({ sourceId: z.string() });

const SPELL_FORM = z.object({ spellId: z.string() });

// A browser sends a textarea's line breaks as CRLF.
const LINE_BREAK = /\r\n?/gu;

const SAVE_SPELL_FORM = z.object({
  spellId: z.string(),
  name: z.string().trim().min(1).max(SPELL_NAME_MAX),
});

const RESET_PART_FORM = z.object({
  spellId: z.string(),
  part: z.enum(SPELL_PART_KEYS),
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

// The spell's page.
function spellPage(spellId: string): never {
  return redirect(`${SPELLBOOK_PATH}/${spellId}`);
}

// Clones the spell the form names, a built-in one or one of their own, as a
// spell of theirs named "<name> (clone)", then shows the Spellbook: an own
// card's Clone. A source that is missing, unknown or another user's clones
// nothing. A storage failure throws, for the error boundary.
async function cloneSpellAction(formData: FormData): Promise<never> {
  const user = await requireUser();
  const form = CLONE_SPELL_FORM.safeParse(Object.fromEntries(formData));
  if (form.success) {
    await cloneSpell(user.id, form.data.sourceId);
  }
  return redirect(SPELLBOOK_PATH);
}

// Saves the name and every part of their spell that the form names, then
// shows its page. A form missing the name or a part, or with one longer
// than its limit (SPELL_NAME_MAX, SPELL_PART_MAX), or whose spell is
// malformed, unknown or another user's, saves nothing and is not found.
async function saveSpellAction(formData: FormData): Promise<never> {
  const user = await requireUser();
  const fields = formFields(formData);
  const form = SAVE_SPELL_FORM.safeParse(fields);
  const parts = SPELL_PARTS_EDIT.safeParse(fields);
  if (!(form.success && parts.success)) {
    notFound();
  }
  const { spellId, name } = form.data;
  const saved = await updateSpell(user.id, spellId, {
    name,
    parts: parts.data,
  });
  if (saved === undefined) {
    notFound();
  }
  return spellPage(saved.id);
}

// Resets one part of their spell to its default (see defaultSpellPart),
// keeping every other part, then shows its page. A spell that is
// malformed, unknown or another user's, or a part that isn't one, is not
// found.
async function resetSpellPartAction(formData: FormData): Promise<never> {
  const user = await requireUser();
  const form = RESET_PART_FORM.safeParse(Object.fromEntries(formData));
  if (!form.success) {
    notFound();
  }
  const { spellId, part } = form.data;
  const spell = await getOwnSpell(user.id, spellId);
  if (spell === undefined) {
    notFound();
  }
  const reset = await updateSpell(user.id, spell.id, {
    parts: { ...spell.parts, [part]: defaultSpellPart(part, spell.clonedFrom) },
  });
  if (reset === undefined) {
    notFound();
  }
  return spellPage(reset.id);
}

// Customizes a built-in spell, its Customize button: clones it as a spell
// of theirs, as cloneSpellAction does, then opens the clone's page. An id
// that is not a built-in spell's clones nothing and is not found.
async function editBuiltInSpellAction(formData: FormData): Promise<never> {
  const user = await requireUser();
  const form = SPELL_FORM.safeParse(Object.fromEntries(formData));
  if (!(form.success && isSpellId(form.data.spellId))) {
    notFound();
  }
  const clone = await cloneSpell(user.id, form.data.spellId);
  if (clone === undefined) {
    notFound();
  }
  return spellPage(clone.id);
}

// Deletes their spell that the form names, then shows the Spellbook. A
// spell that is malformed, unknown, another user's or already deleted
// deletes nothing, and the Spellbook shows as it is.
async function deleteSpellAction(formData: FormData): Promise<never> {
  const user = await requireUser();
  const form = SPELL_FORM.safeParse(Object.fromEntries(formData));
  if (form.success) {
    await deleteSpell(user.id, form.data.spellId);
  }
  return redirect(SPELLBOOK_PATH);
}

export {
  cloneSpellAction,
  deleteSpellAction,
  editBuiltInSpellAction,
  resetSpellPartAction,
  saveSpellAction,
};
