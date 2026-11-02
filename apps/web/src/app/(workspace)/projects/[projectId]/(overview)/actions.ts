"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/auth/current-user.ts";
import { CHECK_IN_FREQUENCY } from "@/check-ins/check-in-frequency.ts";
import { saveCheckInFrequency } from "@/check-ins/check-in-store.ts";
import { PROJECT_ID } from "@/ids.ts";
import { CHECK_IN_SETTING_COPY } from "@/ui/copy/check-ins.ts";

const CHECK_IN_SETTING_FORM = z.object({
  projectId: PROJECT_ID,
  frequency: CHECK_IN_FREQUENCY,
});

// The check-in setting's state: as first shown, saved, or refused because
// the form named no frequency or no project of hers. A storage failure
// throws, for the error boundary.
type CheckInSettingState =
  | { readonly kind: "idle" }
  | { readonly kind: "saved" }
  | { readonly kind: "invalid"; readonly message: string };

const INVALID: CheckInSettingState = {
  kind: "invalid",
  message: CHECK_IN_SETTING_COPY.invalid,
};

export type { CheckInSettingState };

// Saves how often the buddy checks in on her project.
export async function saveCheckInSettingAction(
  _state: CheckInSettingState,
  formData: FormData,
): Promise<CheckInSettingState> {
  const user = await requireUser();
  const form = CHECK_IN_SETTING_FORM.safeParse(Object.fromEntries(formData));
  if (!form.success) {
    return INVALID;
  }
  const { projectId, frequency } = form.data;
  if (!(await saveCheckInFrequency(user.id, projectId, frequency))) {
    return INVALID;
  }
  refresh();
  return { kind: "saved" };
}
