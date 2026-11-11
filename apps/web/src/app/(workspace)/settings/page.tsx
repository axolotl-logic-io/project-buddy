import type { Metadata } from "next";
import Link from "next/link";
import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { availableBatteryCatalog } from "@/batteries/catalog.ts";
import { readBatteryPurchases } from "@/batteries/purchases.ts";
import { AppearanceChoices } from "@/components/appearance-choices.tsx";
import { Button } from "@/components/ui/button.tsx";
import { interviewConstruct } from "@/constructs/interview-construct.ts";
import { ownConstructChoices } from "@/constructs/own-construct-choices.ts";
import { readGoldBalance } from "@/gold/gold-store.ts";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";
import { INVITATIONS_COPY } from "@/ui/copy/invitations.ts";
import { SETTINGS_COPY } from "@/ui/copy/settings.ts";
import { WORKSPACES_COPY } from "@/ui/copy/workspaces.ts";
import { BatteryPurchases } from "../account/battery-purchases.tsx";
import { GoldBalance } from "../account/gold-balance.tsx";
import { NameForm } from "../account/name-form.tsx";
import { SignOutButtons } from "../account/sign-out-buttons.tsx";
import { InterviewConstructForm } from "./interview-construct-form.tsx";

export const metadata: Metadata = { title: SETTINGS_COPY.title };

// All preferences stay visible, including bookmarked sections and payment feedback.
export default async function SettingsPage({
  searchParams = Promise.resolve({}),
}: {
  readonly searchParams?: Promise<{ battery?: string }>;
} = {}): Promise<JSX.Element> {
  const { battery } = await searchParams;
  const user = await requireUser();
  const [chosen, constructs, gold, purchases] = await Promise.all([
    interviewConstruct(user.id),
    ownConstructChoices(),
    readGoldBalance(user.id),
    readBatteryPurchases(user.id),
  ]);
  const catalog = availableBatteryCatalog();
  return (
    <div className="workspace-content flex flex-col gap-4">
      <div id="profile" className="flex flex-col gap-3">
        <NameForm name={user.name} />
        {user.role === "admin" && (
          <Button asChild={true} className="self-start" variant="secondary">
            <Link href="/invitations">{INVITATIONS_COPY.heading}</Link>
          </Button>
        )}
      </div>
      <section id="appearance" aria-labelledby="appearance-heading" className="panel">
        <h2 id="appearance-heading" className="section-heading">
          {WORKSPACES_COPY.appearance}
        </h2>
        <AppearanceChoices settings={true} />
      </section>
      <div id="general">
        <InterviewConstructForm constructId={chosen.id} userConstructs={constructs} />
      </div>
      <section id="batteries" aria-label={ACCOUNT_COPY.goldHeading} className="flex flex-col gap-3">
        <GoldBalance microUsd={gold} />
        {(catalog.length > 0 || purchases.length > 0) && (
          <BatteryPurchases result={battery} catalog={catalog} purchases={purchases} />
        )}
      </section>
      <section id="security" aria-labelledby="security-heading" className="panel flex flex-col gap-4">
        <h2 id="security-heading" className="section-heading">{WORKSPACES_COPY.security}</h2>
        <SignOutButtons />
      </section>
    </div>
  );
}
