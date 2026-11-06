"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/auth/current-user.ts";
import { restoreConstructVisual } from "@/constructs/restore-visual.ts";

export async function restoreVisualAction(id: string): Promise<boolean> {
  const user = await requireUser();
  const restored = await restoreConstructVisual(user.id, id);
  if (restored) {
    revalidatePath(`/constructs/${id}`);
  }
  return restored;
}
