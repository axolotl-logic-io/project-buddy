import type { MetadataRoute } from "next";
import { SITE_COPY } from "@/ui/copy/site.ts";
import { APP_COLORS, APP_ICONS } from "@/ui/web-app.ts";

// The PNG icon a phone shows for the app at its size.
function pngIcon(
  icon: { readonly src: string; readonly size: number },
  purpose: "any" | "maskable",
): NonNullable<MetadataRoute.Manifest["icons"]>[number] {
  return {
    src: icon.src,
    sizes: `${icon.size}x${icon.size}`,
    type: "image/png",
    purpose,
  };
}

// The web app manifest at /manifest.webmanifest, which lets a phone install
// Project Buddy on its Home Screen and open it in its own window, at the
// landing page.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_COPY.name,
    short_name: SITE_COPY.name,
    description: SITE_COPY.tagline,
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: APP_COLORS.lightBackground,
    theme_color: APP_COLORS.lightBackground,
    icons: [
      pngIcon(APP_ICONS.small, "any"),
      pngIcon(APP_ICONS.large, "any"),
      pngIcon(APP_ICONS.large, "maskable"),
    ],
  };
}
