import type { Route } from "next";
import Link from "next/link";
import type { JSX, ReactNode } from "react";
import type { Breadcrumb } from "@/components/breadcrumb.ts";
import { PageChangeBand } from "@/components/page-change-band.tsx";
import { QuickAdd } from "@/components/quick-add.tsx";
import { PanelLink, SitePanel } from "@/components/site-panel.tsx";
import { GRIMOIRE_COPY } from "@/ui/copy/grimoire.ts";
import { HOME_COPY } from "@/ui/copy/home.ts";
import { PROFILE_COPY } from "@/ui/copy/profile.ts";
import { QUESTS_COPY } from "@/ui/copy/quests.ts";
import { SETTINGS_COPY } from "@/ui/copy/settings.ts";
import { SITE_COPY, SITE_PANEL_COPY } from "@/ui/copy/site.ts";
import { TIMER_COPY } from "@/ui/copy/timer.ts";

// A breadcrumb that leads somewhere: every one but the current page.
function isLink(item: Breadcrumb): item is Breadcrumb & { href: Route } {
  return item.href !== undefined;
}

// The links to the pages above the current page, small and muted, lead
// into the current page's name. Each parent is a full-size target with
// its whole name available to assistive technology.
// The last item is the current page; an empty trail draws no content.
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
    <div className="trail-content">
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
      {/* page-error.tsx finds the band's heading by data-trail-heading. */}
      <h1 className="trail-heading" data-trail-heading="">
        {current.label}
      </h1>
      {current.action}
    </div>
  );
}

// The ids of the site panel's two groups' names. The header is on every
// page once, so they are unique.
const PLACES_LABEL_ID = "site-panel-places";
const YOU_LABEL_ID = "site-panel-you";

// Quick Add, then signed-in destinations, grouped into Places and You.
function AccountLinks(): JSX.Element {
  return (
    <nav aria-label={SITE_PANEL_COPY.title} className="flex flex-col">
      <QuickAdd />
      <hr className="panel-rule" />
      <p className="panel-label" id={PLACES_LABEL_ID}>
        {SITE_PANEL_COPY.placesLabel}
      </p>
      <ul aria-labelledby={PLACES_LABEL_ID} className="flex flex-col">
        <li>
          <PanelLink href="/">{HOME_COPY.headerLink}</PanelLink>
        </li>
        <li>
          <PanelLink href="/quests">{QUESTS_COPY.headerLink}</PanelLink>
        </li>
        <li>
          <PanelLink href="/grimoire">{GRIMOIRE_COPY.heading}</PanelLink>
        </li>
        <li>
          <PanelLink href="/timer">{TIMER_COPY.panelLink}</PanelLink>
        </li>
      </ul>
      <hr className="panel-rule" />
      <p className="panel-label" id={YOU_LABEL_ID}>
        {SITE_PANEL_COPY.youLabel}
      </p>
      <ul aria-labelledby={YOU_LABEL_ID} className="flex flex-col">
        <li>
          <PanelLink href="/profile">{PROFILE_COPY.headerLink}</PanelLink>
        </li>
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

function PageHeader({
  panel = VISITOR_PANEL,
  trail,
  loading,
}: {
  readonly panel?: ReactNode;
  readonly trail?: ReactNode;
  readonly loading?: boolean;
}): JSX.Element {
  return (
    <header className="page-header">
      <PageChangeBand loading={loading}>
        {panel}
        {trail}
        <div className="header-panel-control" />
      </PageChangeBand>
    </header>
  );
}

export { AccountLinks, PageHeader, TrailBand };
