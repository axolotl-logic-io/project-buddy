"use client";

import { type JSX, useId, useState } from "react";
import type {
  WorkspaceMenu,
  WorkspaceSection,
} from "@/components/workspace-section.ts";
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

// Keep every destination mounted so a menu change preserves editor drafts.
function PanelCollections({
  sections,
  initialSection,
}: {
  readonly sections: readonly WorkspaceSection[];
  readonly initialSection?: string | undefined;
}): JSX.Element {
  const buckets = sections.filter((section) => section.bucket === true);
  const actions = sections.filter(
    (section) => section.bucket !== true && section.id !== "spells",
  );
  const spells = sections.find((section) => section.id === "spells");
  const [bucket, setBucket] = useState(
    () =>
      buckets.find((section) => section.id === initialSection)?.id ??
      buckets[0]?.id ??
      "",
  );
  const [action, setAction] = useState(
    () =>
      actions.find((section) => section.id === initialSection)?.id ??
      actions[0]?.id ??
      "",
  );
  const tabs: WorkspaceSection[] = [];
  if (spells !== undefined) {
    tabs.push({ ...spells, content: <Collection section={spells} /> });
  }
  const [selected, setSelected] = useState(() => {
    if (initialSection === "spells" && spells !== undefined) {
      return "spells";
    }
    if (actions.some((section) => section.id === initialSection)) {
      return "actions";
    }
    if (buckets.length > 0) {
      return "buckets";
    }
    return tabs[0]?.id ?? "actions";
  });

  function group(
    id: string,
    items: readonly WorkspaceSection[],
    menu: WorkspaceMenu,
  ): WorkspaceSection[] {
    if (items.length === 0) {
      return [];
    }
    return [
      {
        id,
        label: menu.label,
        menu,
        content: items.map((item) => (
          <div key={item.id} hidden={menu.value !== item.id}>
            <Collection section={item} />
          </div>
        )),
      },
    ];
  }
  const bucketTabs = group("buckets", buckets, {
    label: QUEST_SIDEBAR_COPY.buckets,
    items: buckets,
    value: bucket,
    onValueChange(item: string): void {
      setBucket(item);
      setSelected("buckets");
    },
  });
  const actionTabs = group("actions", actions, {
    label: QUEST_SIDEBAR_COPY.actions,
    items: actions,
    value: action,
    onValueChange(item: string): void {
      setAction(item);
      setSelected("actions");
    },
  });

  return (
    <div className="panel-collections">
      <WorkspaceTabs
        label={QUEST_SIDEBAR_COPY.collections}
        value={selected}
        onValueChange={setSelected}
        sections={[...tabs, ...bucketTabs, ...actionTabs]}
      />
    </div>
  );
}

export { PanelCollections };
