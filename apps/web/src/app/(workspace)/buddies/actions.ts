"use server";

import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/auth/current-user.ts";
import { BUDDY_PARTS } from "@/buddies/buddy-parts-schema.ts";
import { cloneBuddy, getOwnBuddy, updateBuddy } from "@/buddies/buddy-store.ts";
import { isBuddyId } from "@/buddies/index.ts";
import { BUDDY_PART_KEYS, defaultPart } from "@/buddies/part-defaults.ts";

const CLONE_BUDDY_FORM = z.object({ sourceId: z.string() });

const BUDDY_FORM = z.object({ buddyId: z.string() });

// A browser sends a textarea's line breaks as CRLF.
const LINE_BREAK = /\r\n?/gu;

const SAVE_BUDDY_FORM = z.object({
  buddyId: z.string(),
  name: z.string().trim().min(1),
});

const RESET_PART_FORM = z.object({
  buddyId: z.string(),
  part: z.enum(BUDDY_PART_KEYS),
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

// The buddy's page.
function buddyPage(buddyId: string): never {
  return redirect(`/buddies/${buddyId}`);
}

// Clones the buddy the form names, a built-in one or one of her own, as a
// new buddy of hers named "<name> (clone)", then shows her buddies: an own
// card's Clone. A
// source that is missing, unknown or another user's clones nothing. A
// storage failure throws, for the error boundary.
export async function cloneBuddyAction(formData: FormData): Promise<never> {
  const user = await requireUser();
  const form = CLONE_BUDDY_FORM.safeParse(Object.fromEntries(formData));
  if (form.success) {
    await cloneBuddy(user.id, form.data.sourceId);
  }
  return redirect("/buddies");
}

// Saves the name and every part of her buddy that the form names, then
// shows its page. A form missing the name or a part, or whose buddy is
// malformed, unknown or another user's, saves nothing and is not found.
export async function saveBuddyAction(formData: FormData): Promise<never> {
  const user = await requireUser();
  const fields = formFields(formData);
  const form = SAVE_BUDDY_FORM.safeParse(fields);
  const parts = BUDDY_PARTS.safeParse(fields);
  if (!(form.success && parts.success)) {
    notFound();
  }
  const { buddyId, name } = form.data;
  const saved = await updateBuddy(user.id, buddyId, {
    name,
    parts: parts.data,
  });
  if (saved === undefined) {
    notFound();
  }
  return buddyPage(saved.id);
}

// Resets one part of her buddy to its default (see defaultPart), keeping
// every other part, then shows its page. A buddy that is malformed,
// unknown or another user's, or a part that isn't one, is not found.
export async function resetBuddyPartAction(formData: FormData): Promise<never> {
  const user = await requireUser();
  const form = RESET_PART_FORM.safeParse(Object.fromEntries(formData));
  if (!form.success) {
    notFound();
  }
  const { buddyId, part } = form.data;
  const buddy = await getOwnBuddy(user.id, buddyId);
  if (buddy === undefined) {
    notFound();
  }
  const reset = await updateBuddy(user.id, buddy.id, {
    parts: { ...buddy.parts, [part]: defaultPart(part, buddy.clonedFrom) },
  });
  if (reset === undefined) {
    notFound();
  }
  return buddyPage(reset.id);
}

// Customizes a built-in buddy, its Customize button: clones it as a new
// buddy of hers, as cloneBuddyAction does, then opens the clone's page. An id that is not a
// built-in buddy's clones nothing and is not found.
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
