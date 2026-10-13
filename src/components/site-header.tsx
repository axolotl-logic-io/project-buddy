import Link from "next/link";
import type { JSX, ReactNode } from "react";
import { currentUser } from "@/auth/current-user.ts";
import { ThemePicker } from "@/components/theme-picker.tsx";
import { Button } from "@/components/ui/button.tsx";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";
import { PERSONAS_COPY } from "@/ui/copy/personas.ts";
import { SETTINGS_COPY } from "@/ui/copy/settings.ts";
import { SITE_COPY } from "@/ui/copy/site.ts";

// The links to Personas, Settings and Account. Hidden, they keep their room in the
// header, unseen and unfocusable, while the real ones stream in.
function AccountLinks({ hidden }: { readonly hidden: boolean }): JSX.Element {
  // Tighter padding below sm, so the three links and the theme picker fit
  // one row on an iPhone 15.
  let className = "px-2 sm:px-4";
  if (hidden) {
    className = `${className} invisible`;
  }
  return (
    <>
      <Button
        aria-hidden={hidden}
        asChild={true}
        className={className}
        variant="secondary"
      >
        <Link href="/personas">{PERSONAS_COPY.headerLink}</Link>
      </Button>
      <Button
        aria-hidden={hidden}
        asChild={true}
        className={className}
        variant="secondary"
      >
        <Link href="/settings">{SETTINGS_COPY.headerLink}</Link>
      </Button>
      <Button
        aria-hidden={hidden}
        asChild={true}
        className={className}
        variant="secondary"
      >
        <Link href="/account">{ACCOUNT_COPY.headerLink}</Link>
      </Button>
    </>
  );
}

// The header's links for whoever is signed in, or nothing for a visitor,
// whom every page but signing in sends back to the sign-in page. Reads the
// session, so the root layout's @header slot streams it in.
async function SignedInLinks(): Promise<JSX.Element | null> {
  if ((await currentUser()) === undefined) {
    return null;
  }
  return <AccountLinks hidden={false} />;
}

// What the @header slot shows while it reads the session: room for the
// links, so the header keeps its height when they arrive. It is busy
// (aria-busy) until then, as a page's skeleton is.
function SignedInLinksLoading(): JSX.Element {
  return (
    <div aria-busy="true" className="contents">
      <AccountLinks hidden={true} />
    </div>
  );
}

// The top of every page, signed in or not: the site's name, linking home,
// links (the @header slot's Personas, Settings and Account, when signed
// in), and the theme picker. The links and the picker share a row; on a
// narrow screen that row wraps under the name, so a phone's header takes at
// most two rows, with tighter spacing and the picker as an icon below sm.
// Only where even that row doesn't fit (the narrowest phones) does it wrap
// too, rather than scroll sideways.
function SiteHeader({
  links = null,
}: {
  readonly links?: ReactNode;
}): JSX.Element {
  return (
    <header className="flex flex-wrap items-center justify-between gap-2 border-line border-b bg-surface px-4 py-3 shadow-control sm:gap-x-4 sm:px-6">
      <Link className="header-title" href="/">
        {SITE_COPY.name}
      </Link>
      <div className="ml-auto flex flex-wrap items-center justify-end gap-2 sm:gap-3">
        {links}
        <ThemePicker />
      </div>
    </header>
  );
}

export { SignedInLinks, SignedInLinksLoading, SiteHeader };
