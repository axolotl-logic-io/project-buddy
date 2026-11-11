import type { Metadata } from "next";
import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { AppearanceChoices } from "@/components/appearance-choices.tsx";
import { PageWorkspace } from "@/components/page-workspace.tsx";
import type { WorkspaceSection } from "@/components/workspace-section.ts";
import { WorkspaceTabs } from "@/components/workspace-tabs.tsx";
import { interviewConstruct } from "@/constructs/interview-construct.ts";
import { ownConstructChoices } from "@/constructs/own-construct-choices.ts";
import { readVapidKeysIfSet } from "@/env.ts";
import { NOTIFICATIONS_COPY, SETTINGS_COPY } from "@/ui/copy/settings.ts";
import { WORKSPACES_COPY } from "@/ui/copy/workspaces.ts";
import { InterviewConstructForm } from "./interview-construct-form.tsx";
import { NotificationSwitch } from "./notification-switch.tsx";

const NOTIFICATIONS_HEADING_ID = "notifications-heading";

export const metadata: Metadata = { title: SETTINGS_COPY.title };

// Account preferences and the current device's notification switch.
export default async function SettingsPage(): Promise<JSX.Element> {
  const user = await requireUser();
  const [chosen, constructs] = await Promise.all([
    interviewConstruct(user.id),
    ownConstructChoices(),
  ]);
  const publicKey = readVapidKeysIfSet()?.publicKey;
  const sections: WorkspaceSection[] = [
    {
      id: "general",
      label: WORKSPACES_COPY.general,
      content: (
        <InterviewConstructForm
          constructId={chosen.id}
          userConstructs={constructs}
        />
      ),
    },
    {
      id: "appearance",
      label: WORKSPACES_COPY.appearance,
      content: <AppearanceChoices settings={true} />,
    },
  ];
  if (publicKey !== undefined) {
    sections.push({
      id: "notifications",
      label: NOTIFICATIONS_COPY.heading,
      content: (
        <section
          aria-labelledby={NOTIFICATIONS_HEADING_ID}
          className="flex flex-col gap-3"
        >
          <h2 className="section-heading" id={NOTIFICATIONS_HEADING_ID}>
            {NOTIFICATIONS_COPY.heading}
          </h2>
          <p className="field-hint">{NOTIFICATIONS_COPY.hint}</p>
          <NotificationSwitch publicKey={publicKey} />
        </section>
      ),
    });
  }
  return (
    <PageWorkspace
      title={SETTINGS_COPY.heading}
      intro={WORKSPACES_COPY.settingsIntro}
    >
      <WorkspaceTabs label={SETTINGS_COPY.heading} sections={sections} />
    </PageWorkspace>
  );
}
