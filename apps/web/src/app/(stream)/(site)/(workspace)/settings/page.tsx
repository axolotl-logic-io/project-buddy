import type { Metadata } from "next";
import type { JSX } from "react";
import { timeZoneChoices } from "@/accounts/time-zone.ts";
import { requireUser } from "@/auth/current-user.ts";
import { AppearanceChoices } from "@/components/appearance-choices.tsx";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";
import { SETTINGS_COPY } from "@/ui/copy/settings.ts";
import { WORKSPACES_COPY } from "@/ui/copy/workspaces.ts";
import { SignOutButtons } from "./sign-out-buttons.tsx";
import { TimeZoneForm } from "./time-zone-form.tsx";

const APPEARANCE_ID = "appearance";
const APPEARANCE_HEADING_ID = "appearance-heading";
const TIME_ZONE_ID = "time-zone";
const TIME_ZONE_HEADING_ID = "time-zone-heading";
const SECURITY_ID = "security";
const SECURITY_HEADING_ID = "security-heading";

export const metadata: Metadata = { title: SETTINGS_COPY.title };

// A navigation here shows the page at once, from its App Shell.
export const instant = true;

// All preferences stay visible, including bookmarked sections and payment
// feedback. A visitor, or a session that has ended, goes to sign in.
export default async function SettingsPage(): Promise<JSX.Element> {
  const user = await requireUser();
  return (
    <div className="page-column gap-4">
      <section
        id={APPEARANCE_ID}
        aria-labelledby={APPEARANCE_HEADING_ID}
        className="panel flex flex-col gap-3"
      >
        <h2 id={APPEARANCE_HEADING_ID} className="section-heading">
          {WORKSPACES_COPY.appearance}
        </h2>
        <AppearanceChoices settings={true} />
      </section>
      <section
        id={TIME_ZONE_ID}
        aria-labelledby={TIME_ZONE_HEADING_ID}
        className="panel flex flex-col gap-3"
      >
        <h2 id={TIME_ZONE_HEADING_ID} className="section-heading">
          {ACCOUNT_COPY.timeZoneHeading}
        </h2>
        <TimeZoneForm saved={user.timeZone} choices={timeZoneChoices()} />
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
