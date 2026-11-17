"use client";

import Link from "next/link";
import {
  type JSX,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { AppearanceChoices } from "@/components/appearance-choices.tsx";
import { closePanelAround } from "@/components/close-panel-around.ts";
import { Button } from "@/components/ui/button.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import { useWideScreen } from "@/components/use-wide-screen.ts";
import { CREDITS_COPY } from "@/ui/copy/credits.ts";
import { SITE_PANEL_COPY } from "@/ui/copy/site.ts";
import { THEME_COPY } from "@/ui/copy/theme.ts";

// Whether the panel is docked on a wide screen is the user's choice, kept
// in this browser, so it stays docked from page to page and after a reload.
// It starts closed.
const DOCKED = "docked";
const dockedListeners = new Set<() => void>();

function subscribeDocked(notify: () => void): () => void {
  dockedListeners.add(notify);
  globalThis.addEventListener("storage", notify);
  return (): void => {
    dockedListeners.delete(notify);
    globalThis.removeEventListener("storage", notify);
  };
}

function isDocked(key: string): boolean {
  return localStorage.getItem(key) === DOCKED;
}

function serverDocked(): boolean {
  return false;
}

function setDocked(key: string, docked: boolean): void {
  if (docked) {
    localStorage.setItem(key, DOCKED);
  } else {
    localStorage.removeItem(key);
  }
  for (const notify of dockedListeners) {
    notify();
  }
}

// A link in the site panel. Following it closes the panel's drawer, since
// the page may change without reloading.
function PanelLink({
  href,
  children,
}: {
  readonly href: string;
  readonly children: string;
}): JSX.Element {
  return (
    <Link className="panel-link" href={href} onClick={closePanelAround}>
      {children}
    </Link>
  );
}

const PANEL_CONTROLS = "button, a[href], input, select, textarea";

// Native dialogs can send a final Tab to the document body. Keep the drawer's
// first and last controls adjacent in keyboard order instead.
function containDrawerFocus(event: KeyboardEvent<HTMLDialogElement>): void {
  if (event.key !== "Tab" || !event.currentTarget.matches(":modal")) {
    return;
  }
  const controls = [
    ...event.currentTarget.querySelectorAll<HTMLElement>(PANEL_CONTROLS),
  ].filter(
    (control) =>
      !control.matches(":disabled") &&
      control.getClientRects().length > 0 &&
      getComputedStyle(control).visibility !== "hidden",
  );
  const first = controls.at(0);
  const last = controls.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
}

// The site panel, on the left of every page, mirroring the chat panel on
// the right: a button at the breadcrumb row's left end opens it from
// that row, holding links (the @header slot's, or none for a visitor),
// the appearance choices, and, for everyone, a link to the Credits
// page. The open panel hides that button and puts its own close button
// at the same point.
// It opens over the page and never changes the page's size or flow. On a
// wide screen it docks there, leaving the page in reach, and stays open
// from page to page until the user closes it. Narrower, it is a
// modal drawer over the page, so the keyboard stays in it, and Escape, its
// close button, following a link or a click beside it (where the browser
// supports closedby) closes it. The page beside it isn't dimmed, so a theme
// or mode chosen in it shows there at once.
// Opening it from its button moves focus to the close button, and closing
// it returns focus to its button. The links are in the page's first HTML,
// inside the closed panel.
function SidePanel({
  children,
  title,
  closeLabel,
  storageKey,
  side = "left",
}: {
  readonly children: ReactNode;
  readonly title: string;
  readonly closeLabel: string;
  readonly storageKey: string;
  readonly side?: "left" | "right";
}): JSX.Element {
  const wide = useWideScreen();
  const readDocked = useCallback(
    (): boolean => isDocked(storageKey),
    [storageKey],
  );
  const docked = useSyncExternalStore(
    subscribeDocked,
    readDocked,
    serverDocked,
  );
  let panelClass = "site-panel";
  let toggleClass = "panel-toggle panel-edge-tab site-panel-toggle";
  let icon: "site-panel" | "sidebar" = "site-panel";
  if (side === "right") {
    panelClass += " timer-panel";
    toggleClass += " timer-panel-toggle";
    icon = "sidebar";
  }
  const [drawerOpen, setDrawerOpen] = useState(false);
  let panelOpen: boolean = drawerOpen;
  if (wide) {
    panelOpen = docked;
  }
  const dialogRef = useRef<HTMLDialogElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) {
      return;
    }
    const modal = dialog.matches(":modal");
    if (!panelOpen) {
      if (dialog.open) {
        // The open panel hides its button, so focus inside it goes back to
        // the button once it shows again.
        const focusInside = dialog.contains(document.activeElement);
        dialog.close();
        if (focusInside) {
          toggleRef.current?.focus({ preventScroll: true });
        }
      }
    } else if (wide) {
      if (modal) {
        dialog.close();
      }
      // A docked panel must not take focus from the page beside it, but
      // opening it from its button, which it hides, moves focus to its
      // close button.
      const fromButton = document.activeElement === toggleRef.current;
      dialog.setAttribute("open", "");
      if (fromButton) {
        closeRef.current?.focus({ preventScroll: true });
      }
    } else if (!modal) {
      if (dialog.open) {
        dialog.close();
      }
      dialog.showModal();
    }
  }, [panelOpen, wide]);

  // The button takes focus, which closing the drawer returns to it, even
  // where a click doesn't focus a button, as in Safari.
  const toggle = useCallback((): void => {
    toggleRef.current?.focus({ preventScroll: true });
    if (wide) {
      setDocked(storageKey, !docked);
    } else {
      setDrawerOpen(true);
    }
  }, [docked, storageKey, wide]);
  const close = useCallback((): void => {
    if (wide) {
      setDocked(storageKey, false);
    } else {
      dialogRef.current?.close();
    }
  }, [storageKey, wide]);
  // The drawer closes itself on Escape, a click beside it or a link; the
  // panel follows. A panel the effect has opened again since stays open.
  const markClosed = useCallback((): void => {
    if (dialogRef.current?.open === true) {
      return;
    }
    if (wide) {
      setDocked(storageKey, false);
    } else {
      setDrawerOpen(false);
    }
  }, [storageKey, wide]);

  return (
    <>
      <Button
        aria-controls={panelId}
        aria-expanded={panelOpen}
        className={toggleClass}
        onClick={toggle}
        ref={toggleRef}
        title={title}
        variant="quiet"
      >
        <Icon name={icon} />
        <span className="sr-only">{title}</span>
      </Button>
      <dialog
        aria-labelledby={titleId}
        className={panelClass}
        closedby="any"
        id={panelId}
        onClose={markClosed}
        onKeyDown={containDrawerFocus}
        ref={dialogRef}
      >
        <div className="site-panel-heading">
          <Button
            aria-controls={panelId}
            aria-expanded={panelOpen}
            aria-label={closeLabel}
            className="panel-toggle panel-edge-tab site-panel-close"
            onClick={close}
            ref={closeRef}
            title={closeLabel}
            variant="quiet"
          >
            <Icon name={icon} />
          </Button>
          <h2 className="header-title" id={titleId}>
            {title}
          </h2>
        </div>
        {children}
      </dialog>
    </>
  );
}

function SitePanel({ links }: { readonly links: ReactNode }): JSX.Element {
  const appearanceId = useId();
  return (
    <SidePanel
      title={SITE_PANEL_COPY.title}
      closeLabel={SITE_PANEL_COPY.close}
      storageKey="site-panel"
    >
      {links}
      <hr className="panel-rule" />
      <section aria-labelledby={appearanceId} className="flex flex-col">
        <h3 className="panel-label" id={appearanceId}>
          {THEME_COPY.picker}
        </h3>
        <AppearanceChoices />
      </section>
      <hr className="panel-rule" />
      <PanelLink href="/credits">{CREDITS_COPY.panelLink}</PanelLink>
    </SidePanel>
  );
}

export { PanelLink, SidePanel, SitePanel };
