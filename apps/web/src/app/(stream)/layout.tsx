import type { Metadata, Viewport } from "next";
import type { JSX, ReactNode } from "react";
import { DEFAULT_THEME_CHOICE } from "@/themes/themes.ts";
import { SiteDocument } from "../site-document.tsx";
import { SITE_METADATA, SITE_VIEWPORT } from "../site-metadata.ts";

export const metadata: Metadata = SITE_METADATA;
export const viewport: Viewport = SITE_VIEWPORT;

// The root layout of every streamed page. It reads nothing from the
// request, so it is part of the App Shell: the saved appearance is applied
// in the browser before the first paint. Its site child keeps the header
// and main together through the router's transitions.
export default function StreamLayout({
  children,
}: {
  readonly children: ReactNode;
}): JSX.Element {
  return (
    <SiteDocument appearance={DEFAULT_THEME_CHOICE}>{children}</SiteDocument>
  );
}
