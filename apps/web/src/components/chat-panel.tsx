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
import { createPortal } from "react-dom";
import { TaskRows } from "@/components/tasks/task-rows.tsx";
import { useTasks } from "@/components/tasks/use-tasks.ts";
import { Button } from "@/components/ui/button.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import { useWideScreen } from "@/components/use-wide-screen.ts";
import type { WorkspaceSection } from "@/components/workspace-section.ts";
import { WorkspaceTabs } from "@/components/workspace-tabs.tsx";
import { QUEST_SIDEBAR_COPY } from "@/ui/copy/quest-sidebar.ts";
import { TASKS_COPY } from "@/ui/copy/tasks.ts";

// The parallel header slot can be replaced during navigation. Subscribe
// to its DOM presence so the control follows the current header.
function subscribeHeaderControl(notify: () => void): () => void {
  const observer = new MutationObserver(notify);
  observer.observe(document.body, { childList: true, subtree: true });
  return (): void => observer.disconnect();
}

function headerControlElement(): HTMLElement | null {
  return document.querySelector<HTMLElement>(".header-panel-control");
}

function serverHeaderControl(): null {
  return null;
}

const BUCKETS_ID = "buckets";

// The open bucket, headed by its name. Every bucket stays mounted, so
// switching buckets keeps drafts as switching tabs does.
function BucketPanels({
  buckets,
  open,
}: {
  readonly buckets: readonly WorkspaceSection[];
  readonly open: string;
}): JSX.Element {
  return (
    <>
      {buckets.map((bucket) => (
        <section
          key={bucket.id}
          hidden={bucket.id !== open}
          aria-labelledby={`bucket-${bucket.id}`}
          className="bucket-panel"
        >
          <h2 id={`bucket-${bucket.id}`} className="bucket-heading">
            {bucket.label}
          </h2>
          {bucket.content}
        </section>
      ))}
    </>
  );
}

// The sidebar's sections as its tabs: the buckets folded into one Buckets
// tab, first, whose menu chooses among them, then the rest in order.
function sidebarTabs(
  sections: readonly WorkspaceSection[],
  open: string,
  choose: (id: string) => void,
): WorkspaceSection[] {
  const buckets = sections.filter((section) => section.bucket === true);
  const rest = sections.filter((section) => section.bucket !== true);
  if (buckets.length === 0) {
    return rest;
  }
  return [
    {
      id: BUCKETS_ID,
      label: QUEST_SIDEBAR_COPY.buckets,
      content: <BucketPanels buckets={buckets} open={open} />,
      menu: {
        label: QUEST_SIDEBAR_COPY.buckets,
        items: buckets.map(({ id, label }) => ({ id, label })),
        value: open,
        onValueChange: choose,
      },
    },
    ...rest,
  ];
}

// The tab a sidebar opens on: Buckets when its first section is a bucket.
function firstTab(
  first: string,
  firstBucket: WorkspaceSection | undefined,
): string {
  if (firstBucket === undefined) {
    return first;
  }
  return BUCKETS_ID;
}

function ChatPanel({
  children,
  sideSections,
  initialSection,
}: {
  readonly children?: ReactNode;
  readonly sideSections?: readonly WorkspaceSection[] | undefined;
  readonly initialSection?: string | undefined;
}): JSX.Element {
  const headerControl = useSyncExternalStore(
    subscribeHeaderControl,
    headerControlElement,
    serverHeaderControl,
  );
  const tasks = useTasks();
  const wide = useWideScreen();
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
  if (tasks !== undefined) {
    sections.push({
      id: "tasks",
      label: TASKS_COPY.heading,
      content: <TaskRows />,
      bucket: true,
    });
  }
  sections.push(...(sideSections ?? []));
  const first = initialSection ?? sections[0]?.id ?? "";
  const firstBucket = sections.find(
    (section) => section.bucket === true && section.id === first,
  );
  const [bucket, setBucket] = useState(
    firstBucket?.id ??
      sections.find((section) => section.bucket === true)?.id ??
      "",
  );
  const [tab, setTab] = useState(firstTab(first, firstBucket));
  function chooseBucket(id: string): void {
    setBucket(id);
    setTab(BUCKETS_ID);
  }
  const tabs = sidebarTabs(sections, bucket, chooseBucket);
  const expandButton = (
    <Button
      ref={toggleRef}
      variant="quiet"
      className="panel-toggle panel-edge-tab quest-sidebar-expand"
      aria-label={QUEST_SIDEBAR_COPY.expand}
      title={QUEST_SIDEBAR_COPY.expand}
      aria-expanded={open}
      aria-controls={panelId}
      hidden={open}
      onClick={expand}
    >
      <Icon name="sidebar" />
    </Button>
  );
  let expandControl = expandButton;
  if (headerControl !== null) {
    expandControl = createPortal(expandButton, headerControl);
  }
  return (
    <div className="adventure-layout" data-sidebar-open={open}>
      <div className="adventure-main">{children}</div>
      {expandControl}
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
            sections={tabs}
            value={tab}
            onValueChange={setTab}
            navigation={
              <Button
                variant="quiet"
                className="panel-toggle panel-edge-tab quest-sidebar-collapse"
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

export { ChatPanel };
