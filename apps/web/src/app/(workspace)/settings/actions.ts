"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/auth/current-user.ts";
import { saveInterviewBuddy } from "@/buddies/interview-buddy.ts";

const FORM = z.object({ buddyId: z.string() });
interface InterviewBuddyState {
  readonly kind: "idle" | "saved" | "invalid";
}

async function setInterviewBuddyAction(
  _state: InterviewBuddyState,
  formData: FormData,
): Promise<InterviewBuddyState> {
  const user = await requireUser();
  const form = FORM.safeParse(Object.fromEntries(formData));
  if (
    !(form.success && (await saveInterviewBuddy(user.id, form.data.buddyId)))
  ) {
    return { kind: "invalid" };
  }
  refresh();
  return { kind: "saved" };
}

export type { InterviewBuddyState };
export { setInterviewBuddyAction };
