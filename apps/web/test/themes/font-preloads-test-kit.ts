// For the tests of the theme's font preloads (src/proxy.ts): the font URLs a
// response's `Link` header preloads, and the URLs a theme's typefaces have
// in theme-font-urls.ts, which they are compared with.
import {
  THEME_TYPEFACES,
  TYPEFACE_FONT_URLS,
} from "@/themes/theme-font-urls.ts";
import type { ThemeId } from "@/themes/themes.ts";

// Each `<url>; params` entry of a Link header, and the params of a font.
const LINK_ENTRY = /<(?<url>[^>]+)>(?<params>[^,]*)/gu;
const AS_FONT = /;\s*as=font(?:;|$)/u;

// The URLs a response's Link header preloads as fonts, in its order, each
// as often as it names it.
function fontPreloads(response: Response): readonly string[] {
  const link = response.headers.get("link") ?? "";
  return [...link.matchAll(LINK_ENTRY)]
    .filter(({ groups: { params = "" } = {} }) => AS_FONT.test(params.trim()))
    .map(({ groups: { url = "" } = {} }) => url);
}

// The URL of each of a theme's typefaces, as the map gives them.
function themeFontUrls(theme: ThemeId): readonly (string | undefined)[] {
  return THEME_TYPEFACES[theme].map((typeface) => TYPEFACE_FONT_URLS[typeface]);
}

export { fontPreloads, themeFontUrls };
