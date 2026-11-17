"use client";

import { type JSX, useId } from "react";
import type { WorkspaceSection } from "@/components/workspace-section.ts";
import { WorkspaceTabs } from "@/components/workspace-tabs.tsx";
import { QUEST_SIDEBAR_COPY } from "@/ui/copy/quest-sidebar.ts";

function Collection({
  section,
}: {
  readonly section: WorkspaceSection;
}): JSX.Element {
  const headingId = useId();
  return (
    <section className="bucket-panel" aria-labelledby={headingId}>
      <h2 id={headingId} className="bucket-heading">
        {section.icon}
        <span>{section.label}</span>
      </h2>
      {section.description !== undefined && (
        <p className="bucket-description">{section.description}</p>
      )}
      {section.content}
    </section>
  );
}

// Named collection tabs keep their editors mounted, including hidden drafts.
function PanelCollections({
  sections,
  initialSection,
}: {
  readonly sections: readonly WorkspaceSection[];
  readonly initialSection?: string | undefined;
}): JSX.Element {
  const selected =
    sections.find((section) => section.id === initialSection)?.id ??
    sections[0]?.id ??
    "";
  return (
    <div className="panel-collections">
      <WorkspaceTabs
        label={QUEST_SIDEBAR_COPY.collections}
        initialSection={selected}
        sections={sections.map((section) => ({
          ...section,
          content: <Collection section={section} />,
        }))}
      />
    </div>
  );
}

// Utility disclosures stay mounted and honor existing direct-entry URLs.
function PanelUtilities({
  sections,
  initialSection,
}: {
  readonly sections: readonly WorkspaceSection[];
  readonly initialSection?: string | undefined;
}): JSX.Element {
  return (
    <div className="panel-utilities">
      {sections
        .filter((section) => section.bucket !== true)
        .map((section) => (
          <details
            key={section.id}
            open={initialSection === section.id}
            data-panel-section={section.id}
          >
            <summary>
              {section.id === "actions" && QUEST_SIDEBAR_COPY.spellsStatus}
              {section.id !== "actions" && section.label}
            </summary>
            <section
              aria-label={section.label}
              className="panel-utility-content"
            >
              {section.content}
            </section>
          </details>
        ))}
    </div>
  );
}

export { PanelCollections, PanelUtilities };
