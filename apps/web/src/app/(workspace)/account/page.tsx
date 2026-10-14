import type { Metadata } from "next";
import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { readMonthlyUsage } from "@/quota/spend-store.ts";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";
import { UsageMeter } from "./usage-meter.tsx";

export const metadata: Metadata = { title: ACCOUNT_COPY.title };

// Her spend this month, which the layout's shell streams in.
export default async function AccountPage(): Promise<JSX.Element> {
  const user = await requireUser();
  return <UsageMeter usage={await readMonthlyUsage(user.id, new Date())} />;
}
