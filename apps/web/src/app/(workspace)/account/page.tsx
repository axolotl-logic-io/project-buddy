import type { Metadata } from "next";
import Link from "next/link";
import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { availableBatteryCatalog } from "@/batteries/catalog.ts";
import { readBatteryPurchases } from "@/batteries/purchases.ts";
import { WorkspaceTabs } from "@/components/workspace-tabs.tsx";
import { readGoldBalance } from "@/gold/gold-store.ts";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";
import { INVITATIONS_COPY } from "@/ui/copy/invitations.ts";
import { WORKSPACES_COPY } from "@/ui/copy/workspaces.ts";
import { BatteryPurchases } from "./battery-purchases.tsx";
import { GoldBalance } from "./gold-balance.tsx";
import { NameForm } from "./name-form.tsx";
import { SignOutButtons } from "./sign-out-buttons.tsx";

export const metadata: Metadata = { title: ACCOUNT_COPY.title };

// Her name and her gold, which the layout's shell streams in.
export default async function AccountPage({
  searchParams = Promise.resolve({}),
}: {
  readonly searchParams?: Promise<{ battery?: string; section?: string }>;
} = {}): Promise<JSX.Element> {
  const { battery, section } = await searchParams;
  const user = await requireUser();
  const gold = await readGoldBalance(user.id);
  const catalog = availableBatteryCatalog();
  const purchases = await readBatteryPurchases(user.id);
  let initialSection = "profile";
  if (battery !== undefined || section === "batteries") {
    initialSection = "batteries";
  }
  return (
    <WorkspaceTabs
      label={ACCOUNT_COPY.heading}
      initialSection={initialSection}
      sections={[
        {
          id: "profile",
          label: WORKSPACES_COPY.profile,
          content: (
            <div className="flex flex-col gap-4">
              {user.role === "admin" && (
                <Link className="back-link" href="/invitations">
                  {INVITATIONS_COPY.heading}
                </Link>
              )}
              <NameForm name={user.name} />
            </div>
          ),
        },
        {
          id: "batteries",
          label: ACCOUNT_COPY.goldHeading,
          content: (
            <div className="flex flex-col gap-4">
              <GoldBalance microUsd={gold} />
              {(catalog.length > 0 || purchases.length > 0) && (
                <BatteryPurchases
                  result={battery}
                  catalog={catalog}
                  purchases={purchases}
                />
              )}
            </div>
          ),
        },
        {
          id: "security",
          label: WORKSPACES_COPY.security,
          content: (
            <section
              className="flex flex-col gap-4"
              aria-label={ACCOUNT_COPY.signOutHeading}
            >
              <h2 className="section-heading">{ACCOUNT_COPY.signOutHeading}</h2>
              <SignOutButtons />
            </section>
          ),
        },
      ]}
    />
  );
}
