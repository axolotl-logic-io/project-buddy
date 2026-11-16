"use client";

import Link from "next/link";
import {
  type JSX,
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
const DOCKED_KEY = "site-panel";
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

function isDocked(): boolean {
  return localStorage.getItem(DOCKED_KEY) === DOCKED;
}

function serverDocked(): boolean {
  return false;
}

function setDocked(docked: boolean): void {
  if (docked) {
    localStorage.setItem(DOCKED_KEY, DOCKED);
  } else {
    localStorage.removeItem(DOCKED_KEY);
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

// The site panel, on the left of every page, mirroring the chat panel on
// the right: a button floating under the header's left end opens it under
// the header, holding links (the @header slot's, or none for a visitor),
// the theme and mode choices, and, for everyone, a link to the Credits
// page. The open panel hides that button and puts its own close button in
// the same place, so the same spot opens and closes it.
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
function SitePanel({ links }: { readonly links: ReactNode }): JSX.Element {
  const wide = useWideScreen();
  const docked = useSyncExternalStore(subscribeDocked, isDocked, serverDocked);
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
  const appearanceId = useId();

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
          toggleRef.current?.focus();
        }
      }
    } else if (wide) {
      if (modal) {
        dialog.close();
      }
      // A docked panel must not take focus from the page beside it, but
      // opening it from its button, which it hides, moves focus to its
      // close button in the same place.
      const fromButton = document.activeElement === toggleRef.current;
      dialog.setAttribute("open", "");
      if (fromButton) {
        closeRef.current?.focus();
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
    toggleRef.current?.focus();
    if (wide) {
      setDocked(!docked);
    } else {
      setDrawerOpen(true);
    }
  }, [docked, wide]);
  const close = useCallback((): void => {
    if (wide) {
      setDocked(false);
    } else {
      dialogRef.current?.close();
    }
  }, [wide]);
  // The drawer closes itself on Escape, a click beside it or a link; the
  // panel follows. A panel the effect has opened again since stays open.
  const markClosed = useCallback((): void => {
    if (dialogRef.current?.open === true) {
      return;
    }
    if (wide) {
      setDocked(false);
    } else {
      setDrawerOpen(false);
    }
  }, [wide]);

  return (
    <>
      <Button
        aria-controls={panelId}
        aria-expanded={panelOpen}
        className="panel-toggle site-panel-toggle"
        onClick={toggle}
        ref={toggleRef}
        title={SITE_PANEL_COPY.title}
        variant="quiet"
      >
        <Icon name="site-panel" />
        <span className="sr-only">{SITE_PANEL_COPY.title}</span>
      </Button>
      <dialog
        aria-labelledby={titleId}
        className="site-panel"
        closedby="any"
        id={panelId}
        onClose={markClosed}
        ref={dialogRef}
      >
        <div className="site-panel-heading">
          <Button
            aria-controls={panelId}
            aria-expanded={panelOpen}
            aria-label={SITE_PANEL_COPY.close}
            className="panel-toggle site-panel-close"
            onClick={close}
            ref={closeRef}
            title={SITE_PANEL_COPY.close}
            variant="quiet"
          >
            <Icon name="site-panel" />
          </Button>
          <h2 className="header-title" id={titleId}>
            {SITE_PANEL_COPY.title}
          </h2>
        </div>
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
      </dialog>
    </>
  );
}

export { PanelLink, SitePanel };
