import Link from "next/link";
import type { JSX, ReactNode } from "react";
import { currentUser } from "@/auth/current-user.ts";
import { ThemePicker } from "@/components/theme-picker.tsx";
import { Button } from "@/components/ui/button.tsx";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";
import { SETTINGS_COPY } from "@/ui/copy/settings.ts";
import { SITE_COPY } from "@/ui/copy/site.ts";

// The links to Settings and Account. Hidden, they keep their room in the
// header, unseen and unfocusable, while the real ones stream in.
function AccountLinks({ hidden }: { readonly hidden: boolean }): JSX.Element {
  let className = "";
  if (hidden) {
    className = "invisible";
  }
  return (
    <>
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
// links, so the header keeps its height when they arrive.
function SignedInLinksLoading(): JSX.Element {
  return <AccountLinks hidden={true} />;
}

// The top of every page, signed in or not: the site's name, linking home,
// links (the @header slot's Settings and Account, when signed in), and the
// theme picker. On a narrow screen they wrap under the name, and onto a
// second row if need be, rather than scroll sideways.
function SiteHeader({
  links = null,
}: {
  readonly links?: ReactNode;
}): JSX.Element {
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-line border-b bg-surface px-6 py-3 shadow-control">
      <Link className="header-title" href="/">
        {SITE_COPY.name}
      </Link>
      <div className="ml-auto flex flex-wrap items-center justify-end gap-3">
        {links}
        <ThemePicker />
      </div>
    </header>
  );
}

export { SignedInLinks, SignedInLinksLoading, SiteHeader };
