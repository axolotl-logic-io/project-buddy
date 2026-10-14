import type { Metadata } from "next";
import type { JSX } from "react";
import { SiteFooter } from "@/components/site-footer.tsx";
import { SiteHeader } from "@/components/site-header.tsx";
import {
  DEFAULT_FLAG_ATTRIBUTES,
  FLAGS_PRE_PAINT_SCRIPT,
} from "@/flags/flag-choice.ts";
import {
  DEFAULT_THEME_ATTRIBUTES,
  THEME_PRE_PAINT_SCRIPT,
} from "@/themes/theme-choice.ts";
import { THEME_FONT_VARIABLES } from "@/themes/theme-fonts.ts";
import { SITE_COPY } from "@/ui/copy/site.ts";
import "./globals.css";

export const metadata: Metadata = {
  title: SITE_COPY.name,
  description: SITE_COPY.tagline,
};

// The header reads the session outside any Suspense boundary, so that it
// arrives whole, links and all, with the page's first HTML (decision
// header-links-slot). Cache Components fails the build on such a read
// unless the root opts out of its static-shell check, which this does: every
// page renders per request, and waits for the session lookup.
export const instant = false;

// Every page renders per request, because the header (the @header slot's
// links) reads who is signed in. The HTML still carries the default theme
// and shows every extra, and the pre-paint scripts apply the visitor's saved
// theme and hidden extras before the first paint. suppressHydrationWarning,
// on <html> alone, lets that choice stand when React hydrates.
export default function RootLayout({
  children,
  header,
}: LayoutProps<"/">): JSX.Element {
  return (
    <html
      {...DEFAULT_THEME_ATTRIBUTES}
      {...DEFAULT_FLAG_ATTRIBUTES}
      className={`${THEME_FONT_VARIABLES} h-full antialiased`}
      lang="en"
      suppressHydrationWarning={true}
    >
      <head>
        <script>{THEME_PRE_PAINT_SCRIPT}</script>
        <script>{FLAGS_PRE_PAINT_SCRIPT}</script>
      </head>
      <body className="flex min-h-full flex-col">
        <SiteHeader links={header} />
        <main className="flex flex-1 flex-col">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
