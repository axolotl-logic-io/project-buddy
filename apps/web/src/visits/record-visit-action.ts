"use server";

import { currentUser } from "@/auth/current-user.ts";
import { AppError } from "@/errors/app-error.ts";
import { recordSignedInDay } from "@/visits/signed-in-days-store.ts";

// Called by the visible page, never by account reads, rendering, prefetch
// or polling. Accepts neither an account nor a date from the client. A
// session that expired or was revoked since rendering records nothing.
async function recordVisitAction(): Promise<"added" | "known" | "unavailable"> {
  try {
    const user = await currentUser();
    if (user === undefined) {
      return "unavailable";
    }
    if (await recordSignedInDay(user.id, new Date())) {
      return "added";
    }
    return "known";
  } catch (error) {
    if (error instanceof AppError) {
      return "unavailable";
    }
    throw error;
  }
}

export { recordVisitAction };
