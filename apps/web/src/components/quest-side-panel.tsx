"use client";

import { usePathname, useSearchParams } from "next/navigation";
import {
  type JSX,
  type ReactNode,
  type RefObject,
  type SyntheticEvent,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { slideFromNow } from "@/components/panel-slide.ts";
import { Button } from "@/components/ui/button.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import { useHydrated } from "@/components/use-hydrated.ts";
import { useWideScreen } from "@/components/use-wide-screen.ts";

// The App Router keeps a page the user left mounted but hidden, with its
// header slot, so the document can hold several page headers. The quest
// panel's control belongs in the one on screen.
function headerControlOnScreen(): HTMLElement | null {
  for (const header of document.querySelectorAll(".page-header")) {
    if (header.checkVisibility()) {
      return header.querySelector<HTMLElement>(".header-panel-control");
    }
  }
  return null;
}

// Keeps slot in the header on screen while the page is shown, or in
// fallback when no header is. Hiding or leaving the page takes it out at
// once, so the next page's header never holds a quest panel control.
function useHeaderSlot(
  slot: HTMLElement | null,
  fallback: RefObject<HTMLElement | null>,
): void {
  useLayoutEffect(() => {
    if (slot === null) {
      return;
    }
    const own = slot;
    function follow(): void {
      const home = headerControlOnScreen() ?? fallback.current;
      if (home === null) {
        own.remove();
      } else if (own.parentElement !== home) {
        home.append(own);
      }
    }
    // Page changes add headers or hide and show kept ones.
    const observer = new MutationObserver(follow);
    observer.observe(document.body, {
      attributeFilter: ["style"],
      childList: true,
      subtree: true,
    });
    follow();
    return (): void => {
      observer.disconnect();
      own.remove();
    };
  }, [slot, fallback]);
}

function newHeaderSlot(): HTMLElement | null {
  if (typeof document === "undefined") {
    return null;
  }
  const slot = document.createElement("div");
  slot.className = "header-panel-slot";
  return slot;
}

function QuestSidePanel({
  children,
  panel,
  title,
  initialSection,
  labels,
  icon,
}: {
  readonly children?: ReactNode;
  readonly panel: ReactNode;
  readonly title: string;
  readonly icon?: Parameters<typeof Icon>[0]["name"];
  readonly initialSection?: string | undefined;
  readonly labels: {
    readonly label: string;
    readonly expand: string;
    readonly collapse: string;
  };
}): JSX.Element {
  const [headerSlot] = useState(newHeaderSlot);
  const layoutRef = useRef<HTMLDivElement>(null);
  useHeaderSlot(headerSlot, layoutRef);
  const isHydrated = useHydrated();
  const wide = useWideScreen();
  const [expanded, setExpanded] = useState<boolean | undefined>();
  // On a narrow screen the panel covers the page, so following one of its
  // links, such as Members, closes it to show where the link went.
  const pathname = usePathname();
  const search = useSearchParams();
  const location = `${pathname}?${search}`;
  const [shownAt, setShownAt] = useState(location);
  if (shownAt !== location) {
    setShownAt(location);
    if (!wide) {
      setExpanded(false);
    }
  }
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
  const expand = useCallback((): void => {
    slideFromNow(dialogRef.current);
    setExpanded(true);
  }, []);
  const collapse = useCallback((): void => {
    slideFromNow(dialogRef.current);
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
  if (isHydrated && headerSlot !== null) {
    expandControl = createPortal(expandButton, headerSlot);
  }
  return (
    <div
      className="quest-layout"
      data-sidebar-open={expanded ?? "auto"}
      ref={layoutRef}
    >
      <div className="quest-main">{children}</div>
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
            <h2 className="flex min-w-0 items-center gap-2 font-heading text-lg">
              {icon !== undefined && (
                <Icon name={icon} className="text-primary" />
              )}
              <span className="truncate">{title}</span>
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

export { QuestSidePanel };
