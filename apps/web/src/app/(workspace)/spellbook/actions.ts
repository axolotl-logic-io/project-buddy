"use server";

import { refresh, revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/auth/current-user.ts";
import { CHAT_ID } from "@/ids.ts";
import { retireDefinition } from "@/retirement/retirement-store.ts";
import { workshopPath } from "@/routes.ts";
import {
  cloneSpell,
  createSpell,
  updateSpell,
} from "@/spells/own-spell-store.ts";
import {
  SPELL_DEFINITION,
  SPELL_NAME_MAX,
  SPELL_REFERENCE,
  SPELL_REPLIES,
} from "@/spells/spell-definition.ts";
import { setSpell } from "@/spells/spell-store.ts";
import { SPELLBOOK_COPY } from "@/ui/copy/spells.ts";

const ID_FORM = z.object({ spellId: z.string() });
const REPLY_FORM = z
  .string()
  .transform((value, context): unknown => {
    try {
      return JSON.parse(value);
    } catch {
      context.addIssue({
        code: "custom",
        message: SPELLBOOK_COPY.responseRequired,
      });
      return z.NEVER;
    }
  })
  .pipe(SPELL_REPLIES);
const SAVE_FORM = SPELL_DEFINITION.extend({
  spellId: z.string(),
  name: z.string().trim().min(1).max(SPELL_NAME_MAX),
  castReply: REPLY_FORM,
  savedReply: REPLY_FORM,
  stopReply: REPLY_FORM,
  invalidReply: REPLY_FORM,
});
const CAST_FORM = z.object({ chatId: CHAT_ID, spellId: SPELL_REFERENCE });

async function newSpellAction(): Promise<never> {
  const user = await requireUser();
  const spell = await createSpell(user.id, {
    name: SPELLBOOK_COPY.newName,
    definition: { destination: "brainstorm" },
  });
  redirect(`/spellbook/${spell.id}`);
}
async function cloneSpellAction(formData: FormData): Promise<never> {
  const user = await requireUser();
  const form = ID_FORM.safeParse(Object.fromEntries(formData));
  if (!form.success) {
    notFound();
  }
  const spell = await cloneSpell(user.id, form.data.spellId);
  if (spell === undefined) {
    notFound();
  }
  redirect(`/spellbook/${spell.id}`);
}
async function saveSpellAction(formData: FormData): Promise<never> {
  const user = await requireUser();
  const form = SAVE_FORM.safeParse(Object.fromEntries(formData));
  if (!form.success) {
    notFound();
  }
  const { spellId, name, ...definition } = form.data;
  const saved = await updateSpell(user.id, spellId, {
    name,
    definition,
  });
  if (saved === undefined) {
    notFound();
  }
  redirect(`/spellbook/${saved.id}?saved=1`);
}
async function retireSpellAction(formData: FormData): Promise<never> {
  const user = await requireUser();
  const form = ID_FORM.safeParse(Object.fromEntries(formData));
  if (
    !(
      form.success &&
      (await retireDefinition(user.id, "spell", form.data.spellId))
    )
  ) {
    notFound();
  }
  revalidatePath("/", "layout");
  redirect(`${workshopPath("spell")}&retired=1`);
}
async function castSpellAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const form = CAST_FORM.safeParse(Object.fromEntries(formData));
  if (
    !(
      form.success &&
      (await setSpell(user.id, {
        chatId: form.data.chatId,
        spell: form.data.spellId,
      }))
    )
  ) {
    notFound();
  }
  refresh();
}

export {
  castSpellAction,
  cloneSpellAction,
  newSpellAction,
  retireSpellAction,
  saveSpellAction,
};
