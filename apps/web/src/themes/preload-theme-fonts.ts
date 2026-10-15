// Starts loading a theme's fonts when the user points at or focuses it in the
// theme picker, so choosing it shows its typefaces without a flash of the
// fallback font. The applied theme's fonts already came with the page (the
// proxy's Link header, src/proxy.ts), so it preloads nothing for that one.
//
// React adds a `<link rel="preload">` to <head> and treats calls with the
// same href as one, so a font shared by two themes, or a theme pointed at
// twice, is fetched once. Font preloads need `crossorigin`, or the browser
// won't reuse the fetch for the @font-face rule's CORS-mode request.
import { preload } from "react-dom";
import {
  THEME_TYPEFACES,
  TYPEFACE_FONT_URLS,
} from "@/themes/theme-font-urls.ts";
import type { ThemeId } from "@/themes/themes.ts";

export function preloadThemeFonts(theme: ThemeId, appliedTheme: ThemeId): void {
  if (theme === appliedTheme) {
    return;
  }
  for (const typeface of THEME_TYPEFACES[theme]) {
    const url = TYPEFACE_FONT_URLS[typeface];
    if (url !== undefined) {
      preload(url, {
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
      });
    }
  }
}
