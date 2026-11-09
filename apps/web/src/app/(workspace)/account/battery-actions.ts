"use server";

import { refresh } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/auth/current-user.ts";
import { startBatteryPurchase } from "@/batteries/purchases.ts";

const FORM = z.object({ package: z.string() }).strict();

export async function buyBatteries(formData: FormData): Promise<void> {
  const user = await requireUser();
  const form = FORM.safeParse(Object.fromEntries(formData));
  if (!form.success) {
    notFound();
  }
  const url = await startBatteryPurchase(user.id, form.data.package);
  if (url === undefined) {
    notFound();
  }
  redirect(url);
}

export async function refreshBatteryPayments(): Promise<void> {
  await requireUser();
  refresh();
}
