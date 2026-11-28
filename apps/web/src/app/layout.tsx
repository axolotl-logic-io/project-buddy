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

// React reveals a streamed page no sooner than 300 ms after the browser's
// first frame, to batch reveals. When the page follows the loading shell
// within milliseconds, painting the shell first would hold the page back
// that long. So the browser holds its first frame for an element the page
// never has, which lasts until the first response has been parsed, reveal
// scripts and all. The script lets the frame go then, before the browser
// warns of the missing element, or after FIRST_FRAME_HOLD_MS, so a slower
// response still shows the shell. A link added later can't hold a frame.
const HOLD_ID = "first-frame-hold";
const FIRST_FRAME_HOLD_MS = 200;
const RELEASE_HOLD = `(function(){var h=document.getElementById("${HOLD_ID}");function go(){if(h)h.remove()}setTimeout(go,${FIRST_FRAME_HOLD_MS});document.addEventListener("readystatechange",go)})()`;

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
      <head>
        <link
          blocking="render"
          href={`#${HOLD_ID}-end`}
          id={HOLD_ID}
          rel="expect"
        />
        <script>{RELEASE_HOLD}</script>
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
