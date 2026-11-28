import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import type { JSX, ReactNode } from "react";
import { HeaderLinksAt } from "@/components/header-links.tsx";
import { PAGE_ADDRESS_HEADER } from "@/page-delivery.ts";
import { readSavedThemeChoice } from "@/themes/saved-theme-choice.ts";
import SiteLayout from "../(stream)/(site)/layout.tsx";
import { SiteDocument } from "../site-document.tsx";
import { SITE_METADATA, SITE_VIEWPORT } from "../site-metadata.ts";

export const metadata: Metadata = SITE_METADATA;
export const viewport: Viewport = SITE_VIEWPORT;

// Every complete page is rendered for its request, as a whole.
export const instant = false;

// The route directories here link to the site's pages and actions. This
// root layout gives those same entry points a complete HTML response,
// outside the streaming boundary and in the saved appearance, for a
// browser that cannot run scripts.
export default async function DocumentLayout({
  children,
}: {
  readonly children: ReactNode;
}): Promise<JSX.Element> {
  const [appearance, requestHeaders] = await Promise.all([
    readSavedThemeChoice(),
    headers(),
  ]);
  const address = requestHeaders.get(PAGE_ADDRESS_HEADER) ?? "/";
  const [pathname = ""] = address.split("?");
  const path = pathname.split("/").filter(Boolean);
  return (
    <SiteDocument appearance={appearance}>
      <SiteLayout header={<HeaderLinksAt path={path} />}>{children}</SiteLayout>
    </SiteDocument>
  );
}
