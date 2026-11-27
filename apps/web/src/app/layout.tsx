import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import type { JSX } from "react";
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

// Appearance is request-specific. The site's shared loading boundary
// streams the shell while the header and page resolve together.
export const instant = false;

export default async function RootLayout({
  children,
}: Pick<LayoutProps<"/">, "children">): Promise<JSX.Element> {
  const saved = (await cookies()).get(THEME_COOKIE_NAME)?.value;
  const appearance = themeAttributes(parseThemeChoiceCookie(saved));
  return (
    <html
      {...appearance}
      className={`${THEME_FONT_VARIABLES} h-full antialiased`}
      lang="en"
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
