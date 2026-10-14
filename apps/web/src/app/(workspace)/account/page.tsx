import type { Metadata } from "next";
import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { readMonthlyUsage } from "@/quota/spend-store.ts";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";
import { NameForm } from "./name-form.tsx";
import { UsageMeter } from "./usage-meter.tsx";

export const metadata: Metadata = { title: ACCOUNT_COPY.title };

// Her name and her spend this month, which the layout's shell streams in.
export default async function AccountPage(): Promise<JSX.Element> {
  const user = await requireUser();
  const usage = await readMonthlyUsage(user.id, new Date());
  return (
    <>
      <NameForm name={user.name} />
      <UsageMeter usage={usage} />
    </>
  );
}
