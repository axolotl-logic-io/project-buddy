import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import type { JSX } from "react";
import { ExperienceFeedback } from "@/components/experience/circle-progress.tsx";
import { SignedInHeader } from "@/components/signed-in-header.tsx";
import {
  parseThemeChoiceCookie,
  THEME_COOKIE_NAME,
  themeAttributes,
} from "@/themes/theme-choice.ts";
import { THEME_FONT_VARIABLES } from "@/themes/theme-fonts.ts";
import { SITE_COPY } from "@/ui/copy/site.ts";
import { APP_COLORS, APP_ICONS } from "@/ui/web-app.ts";
import "./globals.css";

// Next links the web app manifest (manifest.ts) itself. Safari on an
// iPhone reads the Home Screen icon and the app's title from these tags.
export const metadata: Metadata = {
  title: SITE_COPY.name,
  description: SITE_COPY.tagline,
  applicationName: SITE_COPY.name,
  appleWebApp: { capable: true, title: SITE_COPY.name },
  icons: { apple: APP_ICONS.apple.src },
};

// The browser's bar, and an installed app's, takes the default theme's
// background in each mode.
export const viewport: Viewport = {
  themeColor: [
    {
      media: "(prefers-color-scheme: light)",
      color: APP_COLORS.lightBackground,
    },
    {
      media: "(prefers-color-scheme: dark)",
      color: APP_COLORS.darkBackground,
    },
  ],
};

// The header reads the session outside any Suspense boundary, so that it
// arrives whole, links and all, with the page's first HTML (decision
// header-links-slot). Cache Components fails the build on such a read
// unless the root opts out of its static-shell check, which this does: every
// page renders per request, and waits for the session lookup.
export const instant = false;

// The first HTML includes the browser's appearance and the session header.
export default async function RootLayout({
  children,
  header,
}: LayoutProps<"/">): Promise<JSX.Element> {
  const saved = (await cookies()).get(THEME_COOKIE_NAME)?.value;
  const appearance = themeAttributes(parseThemeChoiceCookie(saved));
  return (
    <html
      {...appearance}
      className={`${THEME_FONT_VARIABLES} h-full antialiased`}
      lang="en"
    >
      <body className="flex min-h-full flex-col">
        <ExperienceFeedback>{header ?? <SignedInHeader />}</ExperienceFeedback>
        <main className="flex flex-1 flex-col">{children}</main>
      </body>
    </html>
  );
}
