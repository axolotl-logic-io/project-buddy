import Link from "next/link";
import type { JSX, ReactNode } from "react";
import { currentUser } from "@/auth/current-user.ts";
import type { Breadcrumb } from "@/components/breadcrumb.ts";
import { HeaderSize } from "@/components/header-size.tsx";
import { MenuLink, SiteMenu } from "@/components/site-menu.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import { HOME_PATH } from "@/routes.ts";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";
import { ACTIVITIES_COPY } from "@/ui/copy/activities.ts";
import { CHAT_COPY } from "@/ui/copy/chat.ts";
import { CONSTRUCTS_COPY } from "@/ui/copy/constructs.ts";
import { GENERATION_COPY } from "@/ui/copy/generation.ts";
import { MARKETPLACE_COPY } from "@/ui/copy/marketplace.ts";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";
import { RETIREMENT_COPY } from "@/ui/copy/retirement.ts";
import { SETTINGS_COPY } from "@/ui/copy/settings.ts";
import { SITE_COPY, SITE_MENU_COPY } from "@/ui/copy/site.ts";
import { SPELLBOOK_COPY } from "@/ui/copy/spells.ts";
import { WORKSHOP_COPY } from "@/ui/copy/workshop.ts";

// Parents remain full-size keyboard targets. The final item names the current
// page; long names are visually shortened without shortening accessible names.
function Breadcrumbs({
  items,
}: {
  readonly items: readonly Breadcrumb[];
}): JSX.Element | null {
  if (items.length === 0) {
    return null;
  }
  return (
    <nav aria-label={SITE_COPY.breadcrumbs} className="header-breadcrumbs">
      <ol>
        {items.map((item, index) => (
          <li key={item.href ?? "current"}>
            {index > 0 && (
              <span aria-hidden="true" className="breadcrumb-separator">
                {SITE_COPY.breadcrumbSeparator}
              </span>
            )}
            {item.href !== undefined && (
              <Link href={item.href} title={item.label}>
                <span>{item.label}</span>
              </Link>
            )}
            {item.href === undefined && (
              <span aria-current="page" title={item.label}>
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

// The ids of the menu's two groups' names. The header is on every page
// once, so they are unique.
const PLACES_LABEL_ID = "site-menu-places";
const YOU_LABEL_ID = "site-menu-you";

// Signed-in destinations, grouped into Places and You.
function AccountLinks(): JSX.Element {
  return (
    <nav aria-label={SITE_MENU_COPY.title} className="flex flex-col">
      <p className="menu-label" id={PLACES_LABEL_ID}>
        {SITE_MENU_COPY.placesLabel}
      </p>
      <ul aria-labelledby={PLACES_LABEL_ID} className="flex flex-col">
        <li>
          <MenuLink href="/projects">{PROJECTS_COPY.headerLink}</MenuLink>
        </li>
        <li>
          <MenuLink href="/chat">{CHAT_COPY.headerLink}</MenuLink>
        </li>
        <li>
          <MenuLink href="/constructs">{CONSTRUCTS_COPY.headerLink}</MenuLink>
        </li>
        <li>
          <MenuLink href="/activities">{ACTIVITIES_COPY.headerLink}</MenuLink>
        </li>
        <li>
          <MenuLink href="/spellbook">{SPELLBOOK_COPY.headerLink}</MenuLink>
        </li>
        <li>
          <MenuLink href="/workshop">{WORKSHOP_COPY.heading}</MenuLink>
        </li>
        <li>
          <MenuLink href="/retirement">{RETIREMENT_COPY.heading}</MenuLink>
        </li>
        <li>
          <MenuLink href="/gallery">{GENERATION_COPY.heading}</MenuLink>
        </li>
        <li>
          <MenuLink href="/marketplace">{MARKETPLACE_COPY.headerLink}</MenuLink>
        </li>
      </ul>
      <hr className="menu-rule" />
      <p className="menu-label" id={YOU_LABEL_ID}>
        {SITE_MENU_COPY.youLabel}
      </p>
      <ul aria-labelledby={YOU_LABEL_ID} className="flex flex-col">
        <li>
          <MenuLink href="/settings">{SETTINGS_COPY.headerLink}</MenuLink>
        </li>
        <li>
          <MenuLink href="/account">{ACCOUNT_COPY.headerLink}</MenuLink>
        </li>
      </ul>
      <hr className="menu-rule" />
    </nav>
  );
}

// Reads the session for the header slot and supplies the signed-in menu
// and its shortcuts, or the public menu for a visitor. place names the map's
// place the page belongs to, if any, beside the site's name.
async function SignedInLinks({
  place,
  breadcrumbs,
}: {
  readonly place?: string | undefined;
  readonly breadcrumbs?: readonly Breadcrumb[];
} = {}): Promise<JSX.Element> {
  const user = await currentUser();
  if (user === undefined) {
    return <SiteMenu links={null} />;
  }
  return (
    <>
      {place !== undefined && <p className="hud-place">{place}</p>}
      <SiteMenu links={<AccountLinks />} shortcuts={true} />
      {breadcrumbs !== undefined && <Breadcrumbs items={breadcrumbs} />}
    </>
  );
}

// Every page has a menu, including public pages and the not-found page.
const VISITOR_MENU: JSX.Element = <SiteMenu links={null} />;

// The site's header, set as a game's HUD: an ink bar with a gold rim, whose
// title, behind a compass, leads back to Home. Home uses a frosted paper
// bar over the map while other pages keep the ink HUD (page-roles.css).
function SiteHeader({
  links = VISITOR_MENU,
}: {
  readonly links?: ReactNode;
}): JSX.Element {
  return (
    <header className="site-header">
      <HeaderSize />
      <Link className="header-title hud-title" href={HOME_PATH}>
        <span className="hud-medallion">
          <Icon name="compass" />
        </span>
        {SITE_COPY.name}
      </Link>
      {links}
    </header>
  );
}

export { AccountLinks, Breadcrumbs, SignedInLinks, SiteHeader };
