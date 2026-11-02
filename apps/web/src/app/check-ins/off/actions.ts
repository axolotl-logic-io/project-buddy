"use server";

import { redirect } from "next/navigation";
import { saveCheckInFrequency } from "@/check-ins/check-in-store.ts";
import {
  CHECK_INS_OFF_PATH,
  readCheckInsOffLink,
} from "@/check-ins/check-ins-off-link.ts";

// Turns off the check-ins of the project the link in the form names, then
// shows the link's page again, which now says they are off. A link that
// isn't signed changes nothing.
export async function turnOffCheckInsAction(
  formData: FormData,
): Promise<never> {
  const parameters = {
    user: formData.get("user"),
    project: formData.get("project"),
    token: formData.get("token"),
  };
  const target = await readCheckInsOffLink(parameters);
  if (target !== undefined) {
    await saveCheckInFrequency(target.owner, target.projectId, "off");
  }
  const page = new URLSearchParams();
  for (const [name, value] of Object.entries(parameters)) {
    if (typeof value === "string") {
      page.set(name, value);
    }
  }
  return redirect(`${CHECK_INS_OFF_PATH}?${page.toString()}`);
}
