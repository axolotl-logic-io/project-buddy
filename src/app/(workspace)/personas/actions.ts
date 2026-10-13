"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/auth/current-user.ts";
import { clonePersona } from "@/personas/persona-store.ts";

const CLONE_PERSONA_FORM = z.object({ sourceId: z.string() });

// Clones the persona the form names, a built-in one or one of her own, as a
// new persona of hers named "<name> (copy)", then shows her personas. A
// source that is missing, unknown or another user's clones nothing. A
// storage failure throws, for the error boundary.
export async function clonePersonaAction(formData: FormData): Promise<never> {
  const user = await requireUser();
  const form = CLONE_PERSONA_FORM.safeParse(Object.fromEntries(formData));
  if (form.success) {
    await clonePersona(user.id, form.data.sourceId);
  }
  // Back to the list, which shows the clone: a persona has no page of its
  // own yet to open instead.
  return redirect("/personas");
}
