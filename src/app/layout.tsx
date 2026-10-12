import type { Metadata } from "next";
import type { JSX } from "react";
import { SiteFooter } from "@/components/site-footer.tsx";
import { SiteHeader } from "@/components/site-header.tsx";
import {
  DEFAULT_THEME_ATTRIBUTES,
  PRE_PAINT_SCRIPT,
} from "@/themes/theme-choice.ts";
import { THEME_FONT_VARIABLES } from "@/themes/theme-fonts.ts";
import { COPY } from "@/ui/copy.ts";
import "./globals.css";

export const metadata: Metadata = {
  title: COPY.site.name,
  description: COPY.site.tagline,
};

// The HTML is the same for every visitor, so pages stay prerendered: it
// carries the default theme, and PRE_PAINT_SCRIPT applies the visitor's
// saved choice before the first paint. suppressHydrationWarning, on <html>
// alone, lets that choice stand when React hydrates.
export default function RootLayout({
  children,
}: LayoutProps<"/">): JSX.Element {
  return (
    <html
      {...DEFAULT_THEME_ATTRIBUTES}
      className={`${THEME_FONT_VARIABLES} h-full antialiased`}
      lang="en"
      suppressHydrationWarning={true}
    >
      <head>
        <script>{PRE_PAINT_SCRIPT}</script>
      </head>
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <main className="flex flex-1 flex-col">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
