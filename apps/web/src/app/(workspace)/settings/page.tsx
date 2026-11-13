import type { Metadata } from "next";
import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { availableBatteryCatalog } from "@/batteries/catalog.ts";
import { readBatteryPurchases } from "@/batteries/purchases.ts";
import { AppearanceChoices } from "@/components/appearance-choices.tsx";
import { interviewConstruct } from "@/constructs/interview-construct.ts";
import { ownConstructChoices } from "@/constructs/own-construct-choices.ts";
import { readGoldBalance } from "@/gold/gold-store.ts";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";
import { SETTINGS_COPY } from "@/ui/copy/settings.ts";
import { WORKSPACES_COPY } from "@/ui/copy/workspaces.ts";
import { BatteryPurchases } from "./battery-purchases.tsx";
import { GoldBalance } from "./gold-balance.tsx";
import { InterviewConstructForm } from "./interview-construct-form.tsx";
import { NameForm } from "./name-form.tsx";
import { SignOutButtons } from "./sign-out-buttons.tsx";

const PROFILE_ID = "profile";
const APPEARANCE_ID = "appearance";
const APPEARANCE_HEADING_ID = "appearance-heading";
const GENERAL_ID = "general";
const BATTERIES_ID = "batteries";
const SECURITY_ID = "security";
const SECURITY_HEADING_ID = "security-heading";

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
      <div id={PROFILE_ID} className="flex flex-col gap-3">
        <NameForm name={user.name} />
      </div>
      <section
        id={APPEARANCE_ID}
        aria-labelledby={APPEARANCE_HEADING_ID}
        className="panel"
      >
        <h2 id={APPEARANCE_HEADING_ID} className="section-heading">
          {WORKSPACES_COPY.appearance}
        </h2>
        <AppearanceChoices settings={true} />
      </section>
      <div id={GENERAL_ID}>
        <InterviewConstructForm
          constructId={chosen.id}
          userConstructs={constructs}
        />
      </div>
      <section
        id={BATTERIES_ID}
        aria-label={ACCOUNT_COPY.goldHeading}
        className="flex flex-col gap-3"
      >
        <GoldBalance microUsd={gold} />
        {(catalog.length > 0 ||
          purchases.length > 0 ||
          battery !== undefined) && (
          <BatteryPurchases
            result={battery}
            catalog={catalog}
            purchases={purchases}
          />
        )}
      </section>
      <section
        id={SECURITY_ID}
        aria-labelledby={SECURITY_HEADING_ID}
        className="panel flex flex-col gap-4"
      >
        <h2 id={SECURITY_HEADING_ID} className="section-heading">
          {WORKSPACES_COPY.security}
        </h2>
        <SignOutButtons />
      </section>
    </div>
  );
}
