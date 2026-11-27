"use server";

import { refresh } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/auth/current-user.ts";
import { GRIMOIRE_COPY } from "@/ui/copy/grimoire.ts";
import { forgottenTabHref } from "./forgotten-tab.ts";
import { checkFinalReply, MAX_RITE_NAME, RITE_FIELDS } from "./rite.ts";
import {
  changeRiteAvailability,
  OWN_RITE_ID,
  readRite,
  saveRite,
} from "./rite-store.ts";

type RiteSave =
  | {
      readonly kind: "invalid";
      readonly field: "name" | "firstMessage" | "replies" | "finalReply";
      readonly message: string;
    }
  | { readonly kind: "unavailable" }
  | { readonly kind: "saved"; readonly id: string };

const SAVE = RITE_FIELDS.extend({ id: OWN_RITE_ID.optional() }).superRefine(
  checkFinalReply,
);

async function saveRiteAction(request: unknown): Promise<RiteSave> {
  const user = await requireUser();
  const parsed = SAVE.safeParse(request);
  if (!parsed.success) {
    const [issue] = parsed.error.issues;
    if (issue?.path[0] === "name") {
      return {
        kind: "invalid",
        field: "name",
        message: GRIMOIRE_COPY.invalidName,
      };
    }
    if (issue?.path[0] === "firstMessage") {
      return {
        kind: "invalid",
        field: "firstMessage",
        message: GRIMOIRE_COPY.invalidFirstMessage,
      };
    }
    if (issue?.path[0] === "replies") {
      return {
        kind: "invalid",
        field: "replies",
        message: GRIMOIRE_COPY.invalidReplies,
      };
    }
    if (issue?.path[0] === "finalReply") {
      return {
        kind: "invalid",
        field: "finalReply",
        message: GRIMOIRE_COPY.invalidFinalReply,
      };
    }
    return { kind: "unavailable" };
  }
  const { id, ...definition } = parsed.data;
  const rite = await saveRite(user.id, definition, id);
  if (rite === undefined) {
    return { kind: "unavailable" };
  }
  refresh();
  return { kind: "saved", id: rite.id };
}

async function copyRiteAction(form: FormData): Promise<void> {
  const user = await requireUser();
  const id = z.string().safeParse(form.get("id")).data;
  if (id === undefined) {
    notFound();
  }
  const source = await readRite(user.id, id);
  if (source === undefined) {
    notFound();
  }
  const copied = await saveRite(user.id, {
    name: GRIMOIRE_COPY.copyName(source.name).slice(0, MAX_RITE_NAME),
    firstMessage: source.firstMessage,
    replies: source.replies,
    order: source.order,
    loop: source.loop,
    finalReply: source.finalReply,
  });
  if (copied === undefined) {
    notFound();
  }
  redirect(`/grimoire/${copied.id}`);
}

const AVAILABILITY = z.object({
  id: OWN_RITE_ID,
  change: z.enum(["forget", "restore", "delete"]),
});

// Forgets, restores or deletes the user's rite, then shows the Forgotten
// tab reporting the change, or that the rite was unavailable, when the id
// is unknown or foreign, or the rite isn't in a state to change that way.
async function changeRiteAction(form: FormData): Promise<void> {
  const user = await requireUser();
  const input = AVAILABILITY.safeParse(Object.fromEntries(form)).data;
  if (
    input === undefined ||
    !(await changeRiteAvailability(user.id, input.id, input.change))
  ) {
    redirect(forgottenTabHref("unavailable"));
  }
  redirect(forgottenTabHref(input.change, input.id));
}

export { changeRiteAction, copyRiteAction, saveRiteAction };
