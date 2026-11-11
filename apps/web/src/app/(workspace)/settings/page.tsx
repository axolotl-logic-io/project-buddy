import type { Metadata } from "next";
import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { AppearanceChoices } from "@/components/appearance-choices.tsx";
import { PageWorkspace } from "@/components/page-workspace.tsx";
import type { WorkspaceSection } from "@/components/workspace-section.ts";
import { WorkspaceTabs } from "@/components/workspace-tabs.tsx";
import { interviewConstruct } from "@/constructs/interview-construct.ts";
import { ownConstructChoices } from "@/constructs/own-construct-choices.ts";
import { SETTINGS_COPY } from "@/ui/copy/settings.ts";
import { WORKSPACES_COPY } from "@/ui/copy/workspaces.ts";
import { InterviewConstructForm } from "./interview-construct-form.tsx";

export const metadata: Metadata = { title: SETTINGS_COPY.title };

// Account preferences.
export default async function SettingsPage(): Promise<JSX.Element> {
  const user = await requireUser();
  const [chosen, constructs] = await Promise.all([
    interviewConstruct(user.id),
    ownConstructChoices(),
  ]);
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
  return (
    <PageWorkspace
      title={SETTINGS_COPY.heading}
      intro={WORKSPACES_COPY.settingsIntro}
    >
      <WorkspaceTabs label={SETTINGS_COPY.heading} sections={sections} />
    </PageWorkspace>
  );
}
