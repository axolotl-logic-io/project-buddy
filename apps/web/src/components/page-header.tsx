import type { JSX, ReactNode } from "react";
import { PageChangeBand } from "@/components/page-change-band.tsx";
import { QuickAdd } from "@/components/quick-add.tsx";
import { PanelLink, SitePanel } from "@/components/site-panel.tsx";
import { GRIMOIRE_COPY } from "@/ui/copy/grimoire.ts";
import { HOME_COPY } from "@/ui/copy/home.ts";
import { PROFILE_COPY } from "@/ui/copy/profile.ts";
import { QUESTS_COPY } from "@/ui/copy/quests.ts";
import { SETTINGS_COPY } from "@/ui/copy/settings.ts";
import { SITE_PANEL_COPY } from "@/ui/copy/site.ts";
import { TIMER_COPY } from "@/ui/copy/timer.ts";

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

export { AccountLinks, PageHeader };
