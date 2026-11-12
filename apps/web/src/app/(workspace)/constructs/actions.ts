"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/auth/current-user.ts";
import { CONSTRUCT_DEFINITION } from "@/constructs/construct-definition.ts";
import {
  cloneConstruct,
  createConstruct,
  getOwnConstruct,
} from "@/constructs/construct-store.ts";
import {
  constructResetPrompt,
  starterConstructDefinition,
} from "@/constructs/default-prompt.ts";
import { isConstructId } from "@/constructs/index.ts";
import { editConstructMetadata } from "@/constructs/visual-edit-store.ts";
import { retireDefinition } from "@/retirement/retirement-store.ts";
import { workshopPath } from "@/routes.ts";
import { CONSTRUCTS_COPY } from "@/ui/copy/constructs.ts";

const CLONE_CONSTRUCT_FORM = z.object({ sourceId: z.string() });

const CONSTRUCT_FORM = z.object({ constructId: z.string() });

const LINE_BREAK = /\r\n?/gu;

const VISUAL_DESCRIPTION_MAX = 4000;

const SAVE_CONSTRUCT_FORM = z.object({
  constructId: z.string(),
  name: z.string().trim().min(1),
  visualDescription: z.string().trim().max(VISUAL_DESCRIPTION_MAX).optional(),
});

const RESET_PROMPT_FORM = z.object({
  constructId: z.string(),
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

function constructPage(constructId: string): never {
  return redirect(`/constructs/${constructId}`);
}

export async function cloneConstructAction(formData: FormData): Promise<never> {
  const user = await requireUser();
  const form = CLONE_CONSTRUCT_FORM.safeParse(Object.fromEntries(formData));
  if (!form.success) {
    notFound();
  }
  const copy = await cloneConstruct(user.id, form.data.sourceId);
  if (copy === undefined) {
    notFound();
  }
  return constructPage(copy.id);
}

export async function newConstructAction(): Promise<never> {
  const user = await requireUser();
  const construct = await createConstruct(user.id, {
    name: CONSTRUCTS_COPY.newConstructName,
    definition: starterConstructDefinition(),
  });
  return constructPage(construct.id);
}

export async function saveConstructAction(formData: FormData): Promise<never> {
  const user = await requireUser();
  const fields = formFields(formData);
  const form = SAVE_CONSTRUCT_FORM.safeParse(fields);
  const { prompt } = fields;
  const parts = CONSTRUCT_DEFINITION.safeParse({ prompt });
  if (!(form.success && parts.success)) {
    notFound();
  }
  const { constructId, name } = form.data;
  const saved = await editConstructMetadata(user.id, constructId, {
    name,
    prompt: parts.data.prompt,
    visualDescription: form.data.visualDescription,
  });
  if (saved.kind !== "saved") {
    notFound();
  }
  return redirect(`/constructs/${constructId}?saved=1`);
}

export async function resetConstructPromptAction(
  formData: FormData,
): Promise<void> {
  const user = await requireUser();
  const form = RESET_PROMPT_FORM.safeParse(Object.fromEntries(formData));
  if (!form.success) {
    notFound();
  }
  const { constructId } = form.data;
  const construct = await getOwnConstruct(user.id, constructId);
  if (construct === undefined) {
    notFound();
  }
  const reset = await editConstructMetadata(user.id, construct.id, {
    prompt: constructResetPrompt(construct.clonedFrom).prompt,
  });
  if (reset.kind !== "saved") {
    notFound();
  }
  revalidatePath(`/constructs/${construct.id}`);
}

export async function editBuiltInConstructAction(
  formData: FormData,
): Promise<never> {
  const user = await requireUser();
  const form = CONSTRUCT_FORM.safeParse(Object.fromEntries(formData));
  if (!(form.success && isConstructId(form.data.constructId))) {
    notFound();
  }
  const clone = await cloneConstruct(user.id, form.data.constructId);
  if (clone === undefined) {
    notFound();
  }
  return constructPage(clone.id);
}

export async function retireConstructAction(
  formData: FormData,
): Promise<never> {
  const user = await requireUser();
  const form = CONSTRUCT_FORM.safeParse(Object.fromEntries(formData));
  if (form.success) {
    await retireDefinition(user.id, "construct", form.data.constructId);
    revalidatePath("/", "layout");
  }
  return redirect(`${workshopPath("construct")}?retired=1`);
}
