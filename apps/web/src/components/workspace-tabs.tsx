"use client";

import { DropdownMenu, Tabs } from "radix-ui";
import { type JSX, type ReactNode, useCallback, useState } from "react";
import { POINTER_FOCUS_HANDLERS } from "@/components/tab-pointer-focus.ts";
import { Icon } from "@/components/ui/icon.tsx";
import type {
  WorkspaceMenu,
  WorkspaceSection,
} from "@/components/workspace-section.ts";

// A section's tab. A section with a menu is still a tab, so arrow keys move
// along the row as before, and it also opens its menu: Enter, Space, Arrow
// Down or a click. The tab's id and panel win over the menu's, so the
// tabpanel stays labelled by its tab; the menu names itself instead.
function SectionTab({
  section,
}: {
  readonly section: WorkspaceSection;
}): JSX.Element {
  if (section.menu === undefined) {
    return (
      <Tabs.Trigger
        value={section.id}
        className="workspace-tab"
        {...POINTER_FOCUS_HANDLERS}
      >
        {section.label}
      </Tabs.Trigger>
    );
  }
  return (
    <Tabs.Trigger value={section.id} asChild={true}>
      <DropdownMenu.Trigger
        className="workspace-tab workspace-menu-tab"
        {...POINTER_FOCUS_HANDLERS}
      >
        {section.label}
        <Icon name="chevron-down" />
      </DropdownMenu.Trigger>
    </Tabs.Trigger>
  );
}

// The open menu hangs from its tab: the tab and the menu share a fill and a
// border, and the menu starts at the row's bottom line (page-roles.css).
function SectionMenu({ menu }: { readonly menu: WorkspaceMenu }): JSX.Element {
  return (
    <DropdownMenu.Content
      className="workspace-menu"
      aria-label={menu.label}
      align="start"
      sideOffset={0}
      loop={true}
    >
      <DropdownMenu.RadioGroup
        value={menu.value}
        onValueChange={menu.onValueChange}
      >
        {menu.items.map((item) => (
          <DropdownMenu.RadioItem
            key={item.id}
            value={item.id}
            className="editable-menu-item workspace-menu-item"
          >
            {item.label}
            <DropdownMenu.ItemIndicator className="workspace-menu-check">
              <Icon name="check" />
            </DropdownMenu.ItemIndicator>
          </DropdownMenu.RadioItem>
        ))}
      </DropdownMenu.RadioGroup>
    </DropdownMenu.Content>
  );
}

// Panels stay mounted so switching sections preserves drafts and pending forms.
// The caller validates initialSection against its own query/route contract.
// At most one section opens a menu; opening it selects that section's tab.
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
  const current = value ?? selected;
  const select = onValueChange ?? setSelected;
  const menuSection = sections.find((section) => section.menu !== undefined);
  const menuId = menuSection?.id;
  const openChange = useCallback(
    (open: boolean): void => {
      if (open && menuId !== undefined) {
        select(menuId);
      }
    },
    [menuId, select],
  );
  return (
    <Tabs.Root value={current} onValueChange={select}>
      <DropdownMenu.Root onOpenChange={openChange}>
        <div className="workspace-rail">
          <Tabs.List aria-label={label} className="workspace-tablist">
            {sections.map((section) => (
              <SectionTab key={section.id} section={section} />
            ))}
          </Tabs.List>
          {menuSection?.menu !== undefined && (
            <SectionMenu menu={menuSection.menu} />
          )}
          {navigation}
        </div>
      </DropdownMenu.Root>
      {sections
        .filter((section) => preserveState === true || section.id === current)
        .map((section) => (
          <Tabs.Content
            key={section.id}
            value={section.id}
            forceMount={true}
            hidden={current !== section.id}
            className="workspace-content"
          >
            {section.content}
          </Tabs.Content>
        ))}
    </Tabs.Root>
  );
}

export { WorkspaceTabs };
