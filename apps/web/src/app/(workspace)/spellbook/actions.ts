"use server";

import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/auth/current-user.ts";
import { starterSpellDefinition } from "@/spells/default-prompt.ts";
import { isSpellId } from "@/spells/index.ts";
import { SPELL_NAME_MAX } from "@/spells/spell.ts";
import { SPELL_DEFINITION_EDIT } from "@/spells/spell-definition.ts";
import {
  cloneSpell,
  createSpell,
  deleteSpell,
  updateSpell,
} from "@/spells/spell-store.ts";
import { SPELLBOOK_COPY } from "@/ui/copy/spells.ts";

const SPELLBOOK_PATH = "/spellbook";

const CLONE_SPELL_FORM = z.object({ sourceId: z.string() });

const SPELL_FORM = z.object({ spellId: z.string() });

const DELETE_SPELL_FORM = z.object({ promptId: z.string() });

const LINE_BREAK = /\r\n?/gu;

const SAVE_SPELL_FORM = z.object({
  spellId: z.string(),
  name: z.string().trim().min(1).max(SPELL_NAME_MAX),
});

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

function spellPage(spellId: string): never {
  return redirect(`${SPELLBOOK_PATH}/${spellId}`);
}

async function cloneSpellAction(formData: FormData): Promise<never> {
  const user = await requireUser();
  const form = CLONE_SPELL_FORM.safeParse(Object.fromEntries(formData));
  if (form.success) {
    await cloneSpell(user.id, form.data.sourceId);
  }
  return redirect(SPELLBOOK_PATH);
}

async function newSpellAction(): Promise<never> {
  const user = await requireUser();
  const spell = await createSpell(user.id, {
    name: SPELLBOOK_COPY.newSpellName,
    definition: starterSpellDefinition(),
  });
  return spellPage(spell.id);
}

async function saveSpellAction(formData: FormData): Promise<never> {
  const user = await requireUser();
  const fields = formFields(formData);
  const form = SAVE_SPELL_FORM.safeParse(fields);
  const parts = SPELL_DEFINITION_EDIT.safeParse(fields);
  if (!(form.success && parts.success)) {
    notFound();
  }
  const { spellId, name } = form.data;
  const saved = await updateSpell(user.id, spellId, {
    name,
    definition: parts.data,
  });
  if (saved === undefined) {
    notFound();
  }
  return spellPage(saved.id);
}

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

async function deleteSpellAction(formData: FormData): Promise<never> {
  const user = await requireUser();
  const form = DELETE_SPELL_FORM.safeParse(Object.fromEntries(formData));
  if (form.success) {
    await deleteSpell(user.id, form.data.promptId);
  }
  return redirect(SPELLBOOK_PATH);
}

export {
  cloneSpellAction,
  deleteSpellAction,
  editBuiltInSpellAction,
  newSpellAction,
  saveSpellAction,
};
