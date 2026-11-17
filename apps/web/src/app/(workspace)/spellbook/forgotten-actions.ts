"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/auth/current-user.ts";
import {
  deleteRetiredDefinition,
  restoreDefinition,
} from "@/retirement/retirement-store.ts";

const RETIREMENT_FORM = z.object({ promptId: z.string() });

async function restoreDefinitionAction(formData: FormData): Promise<never> {
  const user = await requireUser();
  const form = RETIREMENT_FORM.safeParse(Object.fromEntries(formData));
  if (
    !(form.success && (await restoreDefinition(user.id, form.data.promptId)))
  ) {
    notFound();
  }
  revalidatePath("/", "layout");
  const query = new URLSearchParams({ filter: "forgotten", restored: "1" });
  return redirect(`/spellbook?${query}`);
}

async function deleteRetiredDefinitionAction(
  formData: FormData,
): Promise<never> {
  const user = await requireUser();
  const form = RETIREMENT_FORM.safeParse(Object.fromEntries(formData));
  if (
    !(
      form.success &&
      (await deleteRetiredDefinition(user.id, form.data.promptId))
    )
  ) {
    notFound();
  }
  revalidatePath("/", "layout");
  const query = new URLSearchParams({ filter: "forgotten", deleted: "1" });
  return redirect(`/spellbook?${query}`);
}

export { deleteRetiredDefinitionAction, restoreDefinitionAction };
