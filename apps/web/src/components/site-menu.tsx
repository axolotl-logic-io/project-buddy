"use client";

import Link from "next/link";
import {
  type JSX,
  type MouseEvent,
  type ReactNode,
  useCallback,
  useId,
  useRef,
  useState,
} from "react";
import { AppearanceChoices } from "@/components/appearance-choices.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import { SITE_MENU_COPY } from "@/ui/copy/site.ts";
import { THEME_COPY } from "@/ui/copy/theme.ts";

// Closes the menu that holds the clicked control, if any.
function closeMenuAround(
  event: MouseEvent<HTMLAnchorElement | HTMLButtonElement>,
): void {
  event.currentTarget.closest("dialog")?.close();
}

// A link in the site's menu. Following it closes the menu, since the page
// may change without reloading.
function MenuLink({
  href,
  children,
}: {
  readonly href: string;
  readonly children: string;
}): JSX.Element {
  return (
    <Link className="menu-link" href={href} onClick={closeMenuAround}>
      {children}
    </Link>
  );
}

// The site's menu: a button in the header that slides a panel in from the
// right edge, holding links (the @header slot's, or none for a visitor)
// and the theme and mode choices. The panel is a modal dialog, so the
// keyboard stays in it, and Escape, its close button or a click beside it
// (where the browser supports closedby) closes it. The page beside it
// isn't dimmed, so a theme or mode chosen in it shows there at once.
// Closing it returns focus to the button. The links are in the page's first
// HTML, inside the closed panel.
function SiteMenu({ links }: { readonly links: ReactNode }): JSX.Element {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const titleId = useId();
  const appearanceId = useId();

  const openMenu = useCallback((): void => {
    dialogRef.current?.showModal();
    setOpen(true);
  }, []);
  const markClosed = useCallback((): void => {
    setOpen(false);
  }, []);

  return (
    <>
      <Button
        aria-controls={panelId}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="min-w-(--target-size)"
        onClick={openMenu}
        variant="secondary"
      >
        <Icon name="menu" />
        <span className="sr-only">{SITE_MENU_COPY.title}</span>
      </Button>
      <dialog
        aria-labelledby={titleId}
        className="site-menu"
        closedby="any"
        id={panelId}
        onClose={markClosed}
        ref={dialogRef}
      >
        <div className="flex items-center justify-between gap-2 pb-1 pl-2">
          <h2 className="header-title" id={titleId}>
            {SITE_MENU_COPY.title}
          </h2>
          <Button
            aria-label={SITE_MENU_COPY.close}
            className="min-w-(--target-size)"
            onClick={closeMenuAround}
            variant="secondary"
          >
            <Icon name="close" />
          </Button>
        </div>
        {links}
        <section aria-labelledby={appearanceId} className="flex flex-col">
          <h3 className="menu-label" id={appearanceId}>
            {THEME_COPY.picker}
          </h3>
          <AppearanceChoices />
        </section>
      </dialog>
    </>
  );
}

export { MenuLink, SiteMenu };
