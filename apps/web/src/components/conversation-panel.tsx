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
}: {
  readonly children?: ReactNode;
  readonly panel: ReactNode;
  readonly title: string;
  readonly initialSection?: string | undefined;
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
  const headingRef = useRef<HTMLDivElement>(null);
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
      const entry = [
        ...dialog.querySelectorAll<HTMLElement>("[data-panel-section]"),
      ].find(
        (element) =>
          element.getAttribute("data-panel-section") === initialSection,
      );
      if (entry !== undefined) {
        dialog.scrollTop +=
          entry.getBoundingClientRect().top -
          dialog.getBoundingClientRect().top -
          (headingRef.current?.getBoundingClientRect().height ?? 0);
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
          <div className="quest-panel-heading" ref={headingRef}>
            <h2 className="font-heading text-lg">{title}</h2>
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
          </div>
          {panel}
        </aside>
      </dialog>
    </div>
  );
}

export { ConversationPanel };
