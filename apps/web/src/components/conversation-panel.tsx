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
import { Button } from "@/components/ui/button.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import { useWideScreen } from "@/components/use-wide-screen.ts";
import { QUEST_SIDEBAR_COPY } from "@/ui/copy/quest-sidebar.ts";

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

function ConversationPanel({
  children,
  panel,
  title,
  initialSection,
  labels = QUEST_SIDEBAR_COPY,
  icon,
}: {
  readonly children?: ReactNode;
  readonly panel: ReactNode;
  readonly title: string;
  readonly icon?: Parameters<typeof Icon>[0]["name"];
  readonly initialSection?: string | undefined;
  readonly labels?: {
    readonly label: string;
    readonly expand: string;
    readonly collapse: string;
  };
}): JSX.Element {
  const headerControl = useSyncExternalStore(
    subscribeHeaderControl,
    headerControlElement,
    serverHeaderControl,
  );
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
      if (initialSection !== undefined) {
        dialog.scrollTop = 0;
      }
    }
  }, [open, wide, initialSection]);
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
  const expandButton = (
    <Button
      ref={toggleRef}
      variant="quiet"
      className="panel-toggle panel-edge-tab quest-sidebar-expand"
      aria-label={labels.expand}
      title={labels.expand}
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
    <div className="adventure-layout" data-sidebar-open={expanded ?? "auto"}>
      <div className="adventure-main">{children}</div>
      {expandControl}
      <dialog
        id={panelId}
        ref={dialogRef}
        onCancel={cancel}
        className="quest-sidebar-frame"
        aria-label={labels.label}
      >
        <aside className="quest-sidebar" aria-label={labels.label}>
          <div className="quest-panel-heading">
            <h2 className="flex items-center gap-2 font-heading text-lg">
              {icon !== undefined && (
                <Icon name={icon} className="text-primary" />
              )}
              {title}
            </h2>
            <Button
              variant="quiet"
              className="panel-toggle panel-edge-tab quest-sidebar-collapse"
              aria-label={labels.collapse}
              title={labels.collapse}
              aria-expanded={open}
              aria-controls={panelId}
              onClick={collapse}
            >
              <Icon name="sidebar" />
            </Button>
          </div>
          {panel}
        </aside>
      </dialog>
    </div>
  );
}

export { ConversationPanel };
