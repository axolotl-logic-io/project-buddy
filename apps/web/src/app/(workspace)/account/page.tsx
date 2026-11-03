import type { Metadata } from "next";
import Link from "next/link";
import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { readGoldBalance } from "@/gold/gold-store.ts";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";
import { INVITATIONS_COPY } from "@/ui/copy/invitations.ts";
import { GoldBalance } from "./gold-balance.tsx";
import { NameForm } from "./name-form.tsx";

export const metadata: Metadata = { title: ACCOUNT_COPY.title };

// Her name and her gold, which the layout's shell streams in.
export default async function AccountPage(): Promise<JSX.Element> {
  const user = await requireUser();
  const gold = await readGoldBalance(user.id);
  return (
    <>
      {user.role === "admin" && (
        <Link className="text-link" href="/invitations">
          {INVITATIONS_COPY.heading}
        </Link>
      )}
      <NameForm name={user.name} />
      <GoldBalance microUsd={gold} />
    </>
  );
}
