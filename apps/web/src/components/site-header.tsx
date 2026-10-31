import Link from "next/link";
import type { JSX, ReactNode } from "react";
import { currentUser } from "@/auth/current-user.ts";
import { MenuLink, SiteMenu } from "@/components/site-menu.tsx";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";
import { ACTIVITIES_COPY } from "@/ui/copy/activities.ts";
import { BUDDIES_COPY } from "@/ui/copy/buddies.ts";
import { CHAT_COPY } from "@/ui/copy/chat.ts";
import { GENERATION_COPY } from "@/ui/copy/generation.ts";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";
import { SETTINGS_COPY } from "@/ui/copy/settings.ts";
import { SITE_COPY, SITE_MENU_COPY } from "@/ui/copy/site.ts";

// The ids of the menu's two groups' names. The header is on every page
// once, so they are unique.
const PLACES_LABEL_ID = "site-menu-places";
const YOU_LABEL_ID = "site-menu-you";

// The site menu's links, in two named lists: Chats, Projects, Buddies and
// Activities, then Settings and Account.
function AccountLinks(): JSX.Element {
  return (
    <nav aria-label={SITE_MENU_COPY.title} className="flex flex-col">
      <p className="menu-label" id={PLACES_LABEL_ID}>
        {SITE_MENU_COPY.placesLabel}
      </p>
      <ul aria-labelledby={PLACES_LABEL_ID} className="flex flex-col">
        <li>
          <MenuLink href="/chat">{CHAT_COPY.headerLink}</MenuLink>
        </li>
        <li>
          <MenuLink href="/gallery">{GENERATION_COPY.heading}</MenuLink>
        </li>
        <li>
          <MenuLink href="/projects">{PROJECTS_COPY.headerLink}</MenuLink>
        </li>
        <li>
          <MenuLink href="/buddies">{BUDDIES_COPY.headerLink}</MenuLink>
        </li>
        <li>
          <MenuLink href="/activities">{ACTIVITIES_COPY.headerLink}</MenuLink>
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

// The menu's links for whoever is signed in, or nothing for a visitor,
// whom every page but signing in sends back to the sign-in page. Reads the
// session; the root layout's @header slot renders it with no loading state,
// so the header waits for it and arrives whole.
async function SignedInLinks(): Promise<JSX.Element | null> {
  if ((await currentUser()) === undefined) {
    return null;
  }
  return <AccountLinks />;
}

// The top of every page, signed in or not, in one row at every width: the
// site's name, linking home, and the button for the site's menu, which
// holds the links (the @header slot's, when signed in), the theme and
// mode choices and the Credits link.
function SiteHeader({
  links = null,
}: {
  readonly links?: ReactNode;
}): JSX.Element {
  return (
    <header className="flex items-center gap-2 border-line border-b bg-surface px-4 py-2 shadow-control sm:px-6">
      <Link className="header-title mr-auto" href="/">
        {SITE_COPY.name}
      </Link>
      <SiteMenu links={links} />
    </header>
  );
}

export { AccountLinks, SignedInLinks, SiteHeader };
