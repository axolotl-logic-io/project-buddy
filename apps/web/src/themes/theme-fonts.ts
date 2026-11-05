// Every theme's fonts, self-hosted from src/themes/fonts/<family>/ through
// next/font/local. Each font is a latin, wght-only variable woff2 copied from
// @fontsource-variable/<family>, with its licence (SIL Open Font License)
// beside it as OFL.txt. Each font sets a CSS variable on <html>, named
// after the typeface rather than a theme, and a theme's CSS file points its
// font tokens at the variables it uses. A browser downloads a font only once
// the page uses it. next/font preloads no font (`preload: false`, checked by
// theme-fonts.test.ts), since its preloads go in the HTML every visitor
// shares; the proxy sends preload hints for the saved theme's fonts instead,
// using theme-font-urls.ts.
import localFont from "next/font/local";

const sourceSerif = localFont({
  src: "./fonts/source-serif-4/source-serif-4-latin-wght-normal.woff2",
  weight: "200 900",
  style: "normal",
  display: "swap",
  variable: "--typeface-source-serif-4",
  preload: false,
});

const nunito = localFont({
  src: "./fonts/nunito/nunito-latin-wght-normal.woff2",
  weight: "200 1000",
  style: "normal",
  display: "swap",
  variable: "--typeface-nunito",
  preload: false,
});

const jetBrainsMono = localFont({
  src: "./fonts/jetbrains-mono/jetbrains-mono-latin-wght-normal.woff2",
  weight: "100 800",
  style: "normal",
  display: "swap",
  variable: "--typeface-jetbrains-mono",
  preload: false,
});

const THEME_FONT_VARIABLES = [
  sourceSerif.variable,
  nunito.variable,
  jetBrainsMono.variable,
].join(" ");

export { THEME_FONT_VARIABLES };
