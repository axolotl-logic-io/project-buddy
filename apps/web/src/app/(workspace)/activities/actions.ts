"use server";

import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { ACTIVITY_PARTS } from "@/activities/activity-parts-schema.ts";
import {
  cloneActivity,
  getOwnActivity,
  updateActivity,
} from "@/activities/activity-store.ts";
import { isActivityId } from "@/activities/index.ts";
import {
  ACTIVITY_PART_KEYS,
  defaultActivityPart,
} from "@/activities/part-defaults.ts";
import { requireUser } from "@/auth/current-user.ts";

const CLONE_ACTIVITY_FORM = z.object({ sourceId: z.string() });

const ACTIVITY_FORM = z.object({ activityId: z.string() });

// A browser sends a textarea's line breaks as CRLF.
const LINE_BREAK = /\r\n?/gu;

const SAVE_ACTIVITY_FORM = z.object({
  activityId: z.string(),
  name: z.string().trim().min(1),
});

const RESET_PART_FORM = z.object({
  activityId: z.string(),
  part: z.enum(ACTIVITY_PART_KEYS),
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

// The activity's page.
function activityPage(activityId: string): never {
  return redirect(`/activities/${activityId}`);
}

// Clones the activity the form names, a built-in one or one of her own, as
// a new activity of hers named "<name> (clone)", then shows her activities:
// an own card's Clone. A source that is missing, unknown or another user's
// clones nothing. A storage failure throws, for the error boundary.
async function cloneActivityAction(formData: FormData): Promise<never> {
  const user = await requireUser();
  const form = CLONE_ACTIVITY_FORM.safeParse(Object.fromEntries(formData));
  if (form.success) {
    await cloneActivity(user.id, form.data.sourceId);
  }
  return redirect("/activities");
}

// Saves the name and every part of her activity that the form names, then
// shows its page. A form missing the name or a part, or whose activity is
// malformed, unknown or another user's, saves nothing and is not found.
async function saveActivityAction(formData: FormData): Promise<never> {
  const user = await requireUser();
  const fields = formFields(formData);
  const form = SAVE_ACTIVITY_FORM.safeParse(fields);
  const parts = ACTIVITY_PARTS.safeParse(fields);
  if (!(form.success && parts.success)) {
    notFound();
  }
  const { activityId, name } = form.data;
  const saved = await updateActivity(user.id, activityId, {
    name,
    parts: parts.data,
  });
  if (saved === undefined) {
    notFound();
  }
  return activityPage(saved.id);
}

// Resets one part of her activity to its default (see defaultActivityPart),
// keeping every other part, then shows its page. An activity that is
// malformed, unknown or another user's, or a part that isn't one, is not
// found.
async function resetActivityPartAction(formData: FormData): Promise<never> {
  const user = await requireUser();
  const form = RESET_PART_FORM.safeParse(Object.fromEntries(formData));
  if (!form.success) {
    notFound();
  }
  const { activityId, part } = form.data;
  const activity = await getOwnActivity(user.id, activityId);
  if (activity === undefined) {
    notFound();
  }
  const reset = await updateActivity(user.id, activity.id, {
    parts: {
      ...activity.parts,
      [part]: defaultActivityPart(part, activity.clonedFrom),
    },
  });
  if (reset === undefined) {
    notFound();
  }
  return activityPage(reset.id);
}

// Customizes a built-in activity, its Customize button: clones it as a new
// activity of hers, as cloneActivityAction does, then opens the clone's
// page. An id that is not a built-in activity's clones nothing and is not
// found.
async function editBuiltInActivityAction(formData: FormData): Promise<never> {
  const user = await requireUser();
  const form = ACTIVITY_FORM.safeParse(Object.fromEntries(formData));
  if (!(form.success && isActivityId(form.data.activityId))) {
    notFound();
  }
  const clone = await cloneActivity(user.id, form.data.activityId);
  if (clone === undefined) {
    notFound();
  }
  return activityPage(clone.id);
}

export {
  cloneActivityAction,
  editBuiltInActivityAction,
  resetActivityPartAction,
  saveActivityAction,
};
