/// <reference types="vite/client" />
// For the browser tests (*.browser.test.tsx): every theme's fonts, which
// next/font/local (theme-fonts.ts) sets up on the site but which can't run
// under Vitest. installThemeFonts loads each src/themes/fonts/<family>/
// woff2 as a FontFace and sets --typeface-<family> on <html> to it, the
// variable theme-fonts.ts gives that family, so a new font needs no edit
// here. A theme's font token that names a variable no font defines is left
// empty, and fails fontsLoaded. next/font's own wiring, each variable naming
// the family whose @font-face loads its file, is checked against the build
// by `npm run check:build-fonts` (scripts/check-build-font-urls.ts).

// Each font's URL, by its path under this folder.
const FONT_URLS = import.meta.glob<string>("./fonts/*/*.woff2", {
  query: "?url",
  import: "default",
  eager: true,
});

// Every weight a variable font may have; each font keeps to its own range.
const ANY_WEIGHT = "1 1000";

const FONT_TOKENS = ["body-font", "heading-font", "mono-font"] as const;

// Loads every theme's fonts into the page and points each --typeface-*
// variable on <html> at its font. Each face is named after its folder, as
// a quoted family, so it can't be mistaken for a font on the computer.
function installThemeFonts(): void {
  const root = document.documentElement;
  for (const [path, url] of Object.entries(FONT_URLS)) {
    // A font's path is ./fonts/<family>/<file>.woff2.
    const [, , family] = path.split("/");
    if (family === undefined) {
      throw new Error(`A font outside a family folder: ${path}`);
    }
    const face = new FontFace(`${family} test kit`, `url("${url}")`, {
      weight: ANY_WEIGHT,
      style: "normal",
    });
    document.fonts.add(face);
    root.style.setProperty(`--typeface-${family}`, `"${family} test kit"`);
  }
}

// For each font token, whether the page has loaded the first family it
// names: a theme's typeface, not a fallback. A token that names no family
// counts as not loaded.
async function fontsLoaded(): Promise<Record<string, boolean>> {
  const style = getComputedStyle(document.documentElement);
  const entries = await Promise.all(
    FONT_TOKENS.map(async (token) => {
      const [family = ""] = style.getPropertyValue(`--${token}`).split(",");
      if (family.trim() === "") {
        return [token, false] as const;
      }
      const faces = await document.fonts.load(`1rem ${family.trim()}`);
      return [token, faces.length > 0] as const;
    }),
  );
  return Object.fromEntries(entries);
}

const ALL_FONTS_LOADED: Record<string, boolean> = Object.fromEntries(
  FONT_TOKENS.map((token) => [token, true]),
);

// Loads each of the theme's fonts, and fails unless each token names a
// loaded face, then waits until the page's text uses them, so what a test
// measures is the theme's text, not a fallback's.
async function loadFonts(): Promise<void> {
  const loaded = await fontsLoaded();
  if (JSON.stringify(loaded) !== JSON.stringify(ALL_FONTS_LOADED)) {
    throw new Error(
      `Not every font token names a loaded face: ${JSON.stringify(loaded)}`,
    );
  }
  await document.fonts.ready;
}

export { ALL_FONTS_LOADED, fontsLoaded, installThemeFonts, loadFonts };
