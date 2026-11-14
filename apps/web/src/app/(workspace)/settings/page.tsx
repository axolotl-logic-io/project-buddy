import type { Metadata } from "next";
import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { AppearanceChoices } from "@/components/appearance-choices.tsx";
import { SETTINGS_COPY } from "@/ui/copy/settings.ts";
import { WORKSPACES_COPY } from "@/ui/copy/workspaces.ts";
import { NameForm } from "./name-form.tsx";
import { SignOutButtons } from "./sign-out-buttons.tsx";

const PROFILE_ID = "profile";
const APPEARANCE_ID = "appearance";
const APPEARANCE_HEADING_ID = "appearance-heading";
const SECURITY_ID = "security";
const SECURITY_HEADING_ID = "security-heading";

export const metadata: Metadata = { title: SETTINGS_COPY.title };

// All preferences stay visible, including bookmarked sections and payment feedback.
export default async function SettingsPage(): Promise<JSX.Element> {
  const user = await requireUser();
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
