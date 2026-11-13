"use client";

import {
  type JSX,
  type ReactNode,
  type SyntheticEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { PlanSteps } from "@/components/plan/plan-steps.tsx";
import { usePlan } from "@/components/plan/use-plan.ts";
import { Button } from "@/components/ui/button.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import type { WorkspaceSection } from "@/components/workspace-section.ts";
import { WorkspaceTabs } from "@/components/workspace-tabs.tsx";
import { PLAN_COPY } from "@/ui/copy/plan.ts";
import { QUEST_SIDEBAR_COPY } from "@/ui/copy/quest-sidebar.ts";

const WIDE_SIDEBAR = "(min-width: 64rem)";

function subscribeWidth(notify: () => void): () => void {
  const media = globalThis.matchMedia(WIDE_SIDEBAR);
  media.addEventListener("change", notify);
  return (): void => media.removeEventListener("change", notify);
}

function isWide(): boolean {
  return globalThis.matchMedia(WIDE_SIDEBAR).matches;
}

function serverWidth(): boolean {
  return false;
}

function PlanPanel({
  children,
  sideSections,
  initialSection,
}: {
  readonly children?: ReactNode;
  readonly sideSections?: readonly WorkspaceSection[] | undefined;
  readonly initialSection?: string | undefined;
}): JSX.Element {
  const plan = usePlan();
  const wide = useSyncExternalStore(subscribeWidth, isWide, serverWidth);
  const [expanded, setExpanded] = useState<boolean | undefined>();
  const open = expanded ?? (wide || initialSection !== undefined);
  const panelId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) {
      return;
    }
    if (dialog.open) {
      dialog.close();
    }
    if (open) {
      if (wide) {
        // Nonmodal desktop navigation must not take focus from the composer.
        dialog.setAttribute("open", "");
      } else {
        dialog.showModal();
      }
    }
  }, [open, wide]);
  const expand = useCallback((): void => setExpanded(true), []);
  const collapse = useCallback((): void => {
    setExpanded(false);
    queueMicrotask(() => toggleRef.current?.focus());
  }, []);
  const cancel = useCallback(
    (event: SyntheticEvent<HTMLDialogElement>): void => {
      event.preventDefault();
      collapse();
    },
    [collapse],
  );
  const sections: WorkspaceSection[] = [];
  if (plan !== undefined) {
    sections.push({
      id: "plan",
      label: PLAN_COPY.heading,
      content: <PlanSteps />,
    });
  }
  sections.push(...(sideSections ?? []));
  return (
    <div className="adventure-layout" data-sidebar-open={open}>
      <div className="adventure-main">{children}</div>
      <Button
        ref={toggleRef}
        variant="quiet"
        className="quest-sidebar-toggle quest-sidebar-expand"
        aria-label={QUEST_SIDEBAR_COPY.expand}
        title={QUEST_SIDEBAR_COPY.expand}
        aria-expanded={open}
        aria-controls={panelId}
        hidden={open}
        onClick={expand}
      >
        <Icon name="sidebar" />
      </Button>
      <dialog
        id={panelId}
        ref={dialogRef}
        onCancel={cancel}
        className="quest-sidebar-frame"
        aria-label={QUEST_SIDEBAR_COPY.label}
      >
        <aside className="quest-sidebar" aria-label={QUEST_SIDEBAR_COPY.label}>
          <WorkspaceTabs
            label={QUEST_SIDEBAR_COPY.label}
            sections={sections}
            initialSection={initialSection ?? sections[0]?.id ?? ""}
            navigation={
              <Button
                variant="quiet"
                className="quest-sidebar-toggle"
                aria-label={QUEST_SIDEBAR_COPY.collapse}
                title={QUEST_SIDEBAR_COPY.collapse}
                aria-expanded={open}
                aria-controls={panelId}
                onClick={collapse}
              >
                <Icon name="sidebar" />
              </Button>
            }
          />
        </aside>
      </dialog>
    </div>
  );
}

export { PlanPanel };
