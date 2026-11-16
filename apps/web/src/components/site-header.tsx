import type { Route } from "next";
import Link from "next/link";
import type { JSX, ReactNode } from "react";
import type { Breadcrumb } from "@/components/breadcrumb.ts";
import { HeaderSize } from "@/components/header-size.tsx";
import { QuickNote } from "@/components/quick-note.tsx";
import { PanelLink, SitePanel } from "@/components/site-panel.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import { HOME_PATH } from "@/routes.ts";
import { QUESTS_COPY } from "@/ui/copy/quests.ts";
import { RETIREMENT_COPY } from "@/ui/copy/retirement.ts";
import { SETTINGS_COPY } from "@/ui/copy/settings.ts";
import { SITE_COPY, SITE_PANEL_COPY } from "@/ui/copy/site.ts";
import { TIMER_COPY } from "@/ui/copy/timer.ts";
import { WORKSHOP_COPY } from "@/ui/copy/workshop.ts";

// The header's parts, free of server code, so a client component such as the
// header slot's error boundary can draw the header too. The signed-in header,
// which reads the session, is signed-in-header.tsx.

// A breadcrumb that leads somewhere: every one but the current page.
function isLink(item: Breadcrumb): item is Breadcrumb & { href: Route } {
  return item.href !== undefined;
}

// The page's place, as a band under the header's bar: the links to the
// pages above it, small and muted, leading into the current page's name,
// which is the page's one heading. Each parent stays a full-size target and
// keeps its whole name as its accessible name, however much of it shows.
// The last item is the current page; an empty trail draws no band.
function TrailBand({
  items,
}: {
  readonly items: readonly Breadcrumb[];
}): JSX.Element | null {
  const current = items.at(-1);
  if (current === undefined) {
    return null;
  }
  const parents = items.slice(0, -1).filter(isLink);
  return (
    <div className="trail-band">
      {parents.length > 0 && (
        <nav aria-label={SITE_COPY.breadcrumbs} className="trail-parents">
          <ol>
            {parents.map((parent) => (
              <li key={`${parent.href}/${parent.label}`}>
                <Link href={parent.href} title={parent.label}>
                  {parent.label}
                </Link>
                {parent.action}
                <span aria-hidden="true" className="breadcrumb-separator">
                  {SITE_COPY.breadcrumbSeparator}
                </span>
              </li>
            ))}
          </ol>
        </nav>
      )}
      <h1 className="trail-heading">{current.label}</h1>
      {current.action}
    </div>
  );
}

// The ids of the site panel's two groups' names. The header is on every
// page once, so they are unique.
const PLACES_LABEL_ID = "site-panel-places";
const YOU_LABEL_ID = "site-panel-you";

// Quick Note, then signed-in destinations, grouped into Places and You.
function AccountLinks(): JSX.Element {
  return (
    <nav aria-label={SITE_PANEL_COPY.title} className="flex flex-col">
      <QuickNote />
      <hr className="panel-rule" />
      <p className="panel-label" id={PLACES_LABEL_ID}>
        {SITE_PANEL_COPY.placesLabel}
      </p>
      <ul aria-labelledby={PLACES_LABEL_ID} className="flex flex-col">
        <li>
          <PanelLink href="/quests">{QUESTS_COPY.headerLink}</PanelLink>
        </li>

        <li>
          <PanelLink href="/workshop">{WORKSHOP_COPY.heading}</PanelLink>
        </li>
        <li>
          <PanelLink href="/timer">{TIMER_COPY.panelLink}</PanelLink>
        </li>
        <li>
          <PanelLink href="/retirement">{RETIREMENT_COPY.heading}</PanelLink>
        </li>
      </ul>
      <hr className="panel-rule" />
      <p className="panel-label" id={YOU_LABEL_ID}>
        {SITE_PANEL_COPY.youLabel}
      </p>
      <ul aria-labelledby={YOU_LABEL_ID} className="flex flex-col">
        <li>
          <PanelLink href="/settings">{SETTINGS_COPY.headerLink}</PanelLink>
        </li>
      </ul>
    </nav>
  );
}

// Every page has a site panel, including public pages and the not-found
// page.
const VISITOR_PANEL: JSX.Element = <SitePanel links={null} />;

// The site's header, set as a game's HUD: an ink bar with a gold rim. The
// site panel's button starts it, on the side the panel opens, and the
// brand, a compass medallion and the site's name, leads back to Quests. On a
// phone the medallion alone shows, and the name stays its accessible name.
// A page with a trail adds the trail band under the rim; the bar scrolls
// away and the band stays pinned.
function SiteHeader({
  panel = VISITOR_PANEL,
  trail,
}: {
  readonly panel?: ReactNode;
  readonly trail?: ReactNode;
}): JSX.Element {
  return (
    <header className="site-header">
      <HeaderSize />
      {panel}
      <Link className="header-title hud-title" href={HOME_PATH}>
        <span className="hud-medallion">
          <Icon name="compass" />
        </span>
        <span className="hud-name">{SITE_COPY.name}</span>
      </Link>
      {trail}
    </header>
  );
}

export { AccountLinks, SiteHeader, TrailBand };
