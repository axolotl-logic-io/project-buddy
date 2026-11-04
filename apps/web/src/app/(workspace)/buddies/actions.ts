"use server";

import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/auth/current-user.ts";
import { BUDDY_DEFINITION } from "@/buddies/buddy-definition.ts";
import {
  cloneBuddy,
  createBuddy,
  getOwnBuddy,
  updateBuddy,
} from "@/buddies/buddy-store.ts";
import {
  defaultBuddyPrompt,
  starterBuddyDefinition,
} from "@/buddies/default-prompt.ts";
import { isBuddyId } from "@/buddies/index.ts";
import { BUDDIES_COPY } from "@/ui/copy/buddies.ts";

const CLONE_BUDDY_FORM = z.object({ sourceId: z.string() });

const BUDDY_FORM = z.object({ buddyId: z.string() });

const LINE_BREAK = /\r\n?/gu;

const SAVE_BUDDY_FORM = z.object({
  buddyId: z.string(),
  name: z.string().trim().min(1),
});

const RESET_PROMPT_FORM = z.object({
  buddyId: z.string(),
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

function buddyPage(buddyId: string): never {
  return redirect(`/buddies/${buddyId}`);
}

export async function cloneBuddyAction(formData: FormData): Promise<never> {
  const user = await requireUser();
  const form = CLONE_BUDDY_FORM.safeParse(Object.fromEntries(formData));
  if (form.success) {
    await cloneBuddy(user.id, form.data.sourceId);
  }
  return redirect("/buddies");
}

export async function newBuddyAction(): Promise<never> {
  const user = await requireUser();
  const buddy = await createBuddy(user.id, {
    name: BUDDIES_COPY.newBuddyName,
    definition: starterBuddyDefinition(),
  });
  return buddyPage(buddy.id);
}

export async function saveBuddyAction(formData: FormData): Promise<never> {
  const user = await requireUser();
  const fields = formFields(formData);
  const form = SAVE_BUDDY_FORM.safeParse(fields);
  const parts = BUDDY_DEFINITION.safeParse(fields);
  if (!(form.success && parts.success)) {
    notFound();
  }
  const { buddyId, name } = form.data;
  const saved = await updateBuddy(user.id, buddyId, {
    name,
    definition: parts.data,
  });
  if (saved === undefined) {
    notFound();
  }
  return buddyPage(saved.id);
}

export async function resetBuddyPromptAction(
  formData: FormData,
): Promise<never> {
  const user = await requireUser();
  const form = RESET_PROMPT_FORM.safeParse(Object.fromEntries(formData));
  if (!form.success) {
    notFound();
  }
  const { buddyId } = form.data;
  const buddy = await getOwnBuddy(user.id, buddyId);
  if (buddy === undefined || buddy.boughtFrom !== undefined) {
    notFound();
  }
  const reset = await updateBuddy(user.id, buddy.id, {
    definition: { prompt: defaultBuddyPrompt(buddy.clonedFrom) },
  });
  if (reset === undefined) {
    notFound();
  }
  return buddyPage(reset.id);
}

export async function editBuiltInBuddyAction(
  formData: FormData,
): Promise<never> {
  const user = await requireUser();
  const form = BUDDY_FORM.safeParse(Object.fromEntries(formData));
  if (!(form.success && isBuddyId(form.data.buddyId))) {
    notFound();
  }
  const clone = await cloneBuddy(user.id, form.data.buddyId);
  if (clone === undefined) {
    notFound();
  }
  return buddyPage(clone.id);
}
