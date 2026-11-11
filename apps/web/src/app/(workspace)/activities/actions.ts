"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { ACTIVITY_DEFINITION } from "@/activities/activity-definition.ts";
import {
  cloneActivity,
  createActivity,
  getOwnActivity,
  updateActivity,
} from "@/activities/activity-store.ts";
import {
  activityResetPrompt,
  starterActivityDefinition,
} from "@/activities/default-prompt.ts";
import { isActivityId } from "@/activities/index.ts";
import { requireUser } from "@/auth/current-user.ts";
import { retireDefinition } from "@/retirement/retirement-store.ts";
import { workshopPath } from "@/routes.ts";
import { ACTIVITIES_COPY } from "@/ui/copy/activities.ts";

const CLONE_ACTIVITY_FORM = z.object({ sourceId: z.string() });

const ACTIVITY_FORM = z.object({ activityId: z.string() });

const LINE_BREAK = /\r\n?/gu;

const SAVE_ACTIVITY_FORM = z.object({
  activityId: z.string(),
  name: z.string().trim().min(1),
});

const RESET_PROMPT_FORM = z.object({
  activityId: z.string(),
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

function activityPage(activityId: string): never {
  return redirect(`/activities/${activityId}`);
}

async function cloneActivityAction(formData: FormData): Promise<never> {
  const user = await requireUser();
  const form = CLONE_ACTIVITY_FORM.safeParse(Object.fromEntries(formData));
  if (form.success) {
    await cloneActivity(user.id, form.data.sourceId);
  }
  return redirect(workshopPath("activity"));
}

async function newActivityAction(): Promise<never> {
  const user = await requireUser();
  const activity = await createActivity(user.id, {
    name: ACTIVITIES_COPY.newActivityName,
    definition: starterActivityDefinition(),
  });
  return activityPage(activity.id);
}

async function saveActivityAction(formData: FormData): Promise<never> {
  const user = await requireUser();
  const fields = formFields(formData);
  const form = SAVE_ACTIVITY_FORM.safeParse(fields);
  const parts = ACTIVITY_DEFINITION.safeParse(fields);
  if (!(form.success && parts.success)) {
    notFound();
  }
  const { activityId, name } = form.data;
  const saved = await updateActivity(user.id, activityId, {
    name,
    definition: parts.data,
  });
  if (saved === undefined) {
    notFound();
  }
  return redirect(`/activities/${saved.id}?saved=1`);
}

async function resetActivityPromptAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const form = RESET_PROMPT_FORM.safeParse(Object.fromEntries(formData));
  if (!form.success) {
    notFound();
  }
  const { activityId } = form.data;
  const activity = await getOwnActivity(user.id, activityId);
  if (activity === undefined || activity.boughtFrom !== undefined) {
    notFound();
  }
  const reset = await updateActivity(user.id, activity.id, {
    definition: {
      ...activity.definition,
      prompt: activityResetPrompt(activity.clonedFrom).prompt,
    },
  });
  if (reset === undefined) {
    notFound();
  }
  revalidatePath(`/activities/${reset.id}`);
}

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
  newActivityAction,
  resetActivityPromptAction,
  saveActivityAction,
};

export async function retireActivityAction(formData: FormData): Promise<never> {
  const user = await requireUser();
  const form = ACTIVITY_FORM.safeParse(Object.fromEntries(formData));
  if (form.success) {
    await retireDefinition(user.id, "activity", form.data.activityId);
    revalidatePath("/", "layout");
  }
  return redirect(`${workshopPath("activity")}&retired=1`);
}
