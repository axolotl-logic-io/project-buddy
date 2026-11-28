// The metadata and viewport every root layout exports.
import type { Metadata, Viewport } from "next";
import { SITE_COPY } from "@/ui/copy/site.ts";
import { APP_COLORS, APP_ICONS } from "@/ui/web-app.ts";

// Next links the web app manifest (manifest.ts) itself. Safari on an
// iPhone reads the Home Screen icon and the app's title from these tags.
const SITE_METADATA: Metadata = {
  title: SITE_COPY.name,
  description: SITE_COPY.tagline,
  applicationName: SITE_COPY.name,
  appleWebApp: { capable: true, title: SITE_COPY.name },
  icons: { apple: APP_ICONS.apple.src },
};

// The browser's bar, and an installed app's, takes the default theme's
// background in each mode.
const SITE_VIEWPORT: Viewport = {
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

export { SITE_METADATA, SITE_VIEWPORT };
