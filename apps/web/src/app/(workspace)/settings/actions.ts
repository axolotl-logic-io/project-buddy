"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/auth/current-user.ts";
import { saveInterviewConstruct } from "@/constructs/interview-construct.ts";

const FORM = z.object({ constructId: z.string() });
interface InterviewConstructState {
  readonly kind: "idle" | "saved" | "invalid";
}

async function setInterviewConstructAction(
  _state: InterviewConstructState,
  formData: FormData,
): Promise<InterviewConstructState> {
  const user = await requireUser();
  const form = FORM.safeParse(Object.fromEntries(formData));
  if (
    !(
      form.success &&
      (await saveInterviewConstruct(user.id, form.data.constructId))
    )
  ) {
    return { kind: "invalid" };
  }
  refresh();
  return { kind: "saved" };
}

export type { InterviewConstructState };
export { setInterviewConstructAction };
