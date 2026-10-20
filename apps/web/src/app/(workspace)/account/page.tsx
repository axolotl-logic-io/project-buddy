import type { Metadata } from "next";
import Link from "next/link";
import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { readMonthlyUsage } from "@/quota/spend-store.ts";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";
import { INVITATIONS_COPY } from "@/ui/copy/invitations.ts";
import { NameForm } from "./name-form.tsx";
import { UsageMeter } from "./usage-meter.tsx";

export const metadata: Metadata = { title: ACCOUNT_COPY.title };

// Her name and her spend this month, which the layout's shell streams in.
export default async function AccountPage(): Promise<JSX.Element> {
  const user = await requireUser();
  const usage = await readMonthlyUsage(user.id, new Date());
  return (
    <>
      {user.role === "admin" && (
        <Link className="text-link" href="/invitations">
          {INVITATIONS_COPY.heading}
        </Link>
      )}
      <NameForm name={user.name} />
      <UsageMeter usage={usage} />
    </>
  );
}
