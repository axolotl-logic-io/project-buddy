import Link from "next/link";
import type { JSX, ReactNode } from "react";
import { currentUser } from "@/auth/current-user.ts";
import { ThemePicker } from "@/components/theme-picker.tsx";
import { Button } from "@/components/ui/button.tsx";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";
import { BUDDIES_COPY } from "@/ui/copy/buddies.ts";
import { CHAT_COPY } from "@/ui/copy/chat.ts";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";
import { SETTINGS_COPY } from "@/ui/copy/settings.ts";
import { SITE_COPY } from "@/ui/copy/site.ts";

// The links to the central chat, Projects, Buddies, Settings and Account.
function AccountLinks(): JSX.Element {
  // Tighter padding below sm, so the five links and the theme picker fit
  // the two rows they share with the site's name on an iPhone 15.
  const className = "px-2 sm:px-4";
  return (
    <>
      <Button asChild={true} className={className} variant="secondary">
        <Link href="/chat">{CHAT_COPY.headerLink}</Link>
      </Button>
      <Button asChild={true} className={className} variant="secondary">
        <Link href="/projects">{PROJECTS_COPY.headerLink}</Link>
      </Button>
      <Button asChild={true} className={className} variant="secondary">
        <Link href="/buddies">{BUDDIES_COPY.headerLink}</Link>
      </Button>
      <Button asChild={true} className={className} variant="secondary">
        <Link href="/settings">{SETTINGS_COPY.headerLink}</Link>
      </Button>
      <Button asChild={true} className={className} variant="secondary">
        <Link href="/account">{ACCOUNT_COPY.headerLink}</Link>
      </Button>
    </>
  );
}

// The header's links for whoever is signed in, or nothing for a visitor,
// whom every page but signing in sends back to the sign-in page. Reads the
// session; the root layout's @header slot renders it with no loading state,
// so the header waits for it and arrives whole.
async function SignedInLinks(): Promise<JSX.Element | null> {
  if ((await currentUser()) === undefined) {
    return null;
  }
  return <AccountLinks />;
}

// The top of every page, signed in or not: the site's name, linking home,
// links (the @header slot's Chat, Projects, Buddies, Settings and Account,
// when signed in), and the theme picker. From sm up the links and the picker
// share a row beside the name. Below sm they flow on from the name's own
// row and wrap after it, so a phone's header takes at most two rows, with
// tighter spacing and the picker as an icon. Only where even two rows don't
// fit (the narrowest phones) does it take a third, rather than scroll
// sideways.
function SiteHeader({
  links = null,
}: {
  readonly links?: ReactNode;
}): JSX.Element {
  return (
    <header className="flex flex-wrap items-center justify-end gap-2 border-line border-b bg-surface px-4 py-3 shadow-control sm:gap-x-4 sm:px-6">
      <Link className="header-title mr-auto" href="/">
        {SITE_COPY.name}
      </Link>
      <div className="contents sm:flex sm:flex-wrap sm:items-center sm:justify-end sm:gap-3">
        {links}
        <ThemePicker />
      </div>
    </header>
  );
}

export { AccountLinks, SignedInLinks, SiteHeader };
