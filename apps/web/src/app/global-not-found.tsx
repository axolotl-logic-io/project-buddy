import type { Metadata, Viewport } from "next";
import type { JSX } from "react";
import { DEFAULT_THEME_CHOICE } from "@/themes/themes.ts";
import SiteLayout from "./(stream)/(site)/layout.tsx";
import NotFound from "./(stream)/(site)/not-found.tsx";
import { SiteDocument } from "./site-document.tsx";
import { SITE_METADATA, SITE_VIEWPORT } from "./site-metadata.ts";

export const metadata: Metadata = SITE_METADATA;
export const viewport: Viewport = SITE_VIEWPORT;

// Unmatched addresses, which no root layout renders.
export default function GlobalNotFound(): JSX.Element {
  return (
    <SiteDocument appearance={DEFAULT_THEME_CHOICE}>
      <SiteLayout header={null}>
        <NotFound />
      </SiteLayout>
    </SiteDocument>
  );
}
