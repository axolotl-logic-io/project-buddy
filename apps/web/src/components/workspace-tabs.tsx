"use client";

import { Tabs } from "radix-ui";
import { type JSX, type ReactNode, useState } from "react";
import type { WorkspaceSection } from "@/components/workspace-section.ts";

// Panels stay mounted so switching sections preserves drafts and pending forms.
// The caller validates initialSection against its own query/route contract.
function WorkspaceTabs({
  label,
  sections,
  initialSection,
  navigation,
  preserveState = true,
  value,
  onValueChange,
}: {
  readonly label: string;
  readonly sections: readonly WorkspaceSection[];
  readonly initialSection?: string;
  readonly navigation?: ReactNode;
  readonly preserveState?: boolean;
  readonly value?: string;
  readonly onValueChange?: (value: string) => void;
}): JSX.Element {
  const [selected, setSelected] = useState(
    initialSection ?? sections[0]?.id ?? "",
  );
  return (
    <Tabs.Root
      value={value ?? selected}
      onValueChange={onValueChange ?? setSelected}
    >
      <div className="workspace-rail">
        <Tabs.List aria-label={label} className="workspace-tablist">
          {sections.map((section) => (
            <Tabs.Trigger
              key={section.id}
              value={section.id}
              className="workspace-tab"
            >
              {section.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        {navigation}
      </div>
      {sections
        .filter(
          (section) =>
            preserveState === true || section.id === (value ?? selected),
        )
        .map((section) => (
          <Tabs.Content
            key={section.id}
            value={section.id}
            forceMount={true}
            hidden={(value ?? selected) !== section.id}
            className="workspace-content"
          >
            {section.content}
          </Tabs.Content>
        ))}
    </Tabs.Root>
  );
}

export { WorkspaceTabs };
