// Every theme's fonts, self-hosted from src/themes/fonts/<family>/ through
// next/font/local. Each font is a latin, wght-only variable woff2 copied from
// @fontsource-variable/<family>, with its licence (SIL Open Font License)
// beside it as OFL.txt. Each font sets a CSS variable on <html>, named
// after the typeface rather than a theme, and a theme's CSS file points its
// font tokens at the variables it uses. A browser downloads a font only once
// the page uses it. next/font preloads no font (`preload: false`, checked by
// theme-fonts.test.ts). The proxy sends preload hints for the saved
// appearance using theme-font-urls.ts.
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

const fell = localFont({
  src: "./fonts/im-fell-english/im-fell-english-latin-400-normal.woff2",
  weight: "400",
  style: "normal",
  display: "swap",
  variable: "--typeface-im-fell-english",
  preload: false,
});

const fellItalic = localFont({
  src: "./fonts/im-fell-english/im-fell-english-latin-400-italic.woff2",
  weight: "400",
  style: "italic",
  display: "swap",
  variable: "--typeface-im-fell-english-italic",
  preload: false,
});

const cormorant = localFont({
  src: "./fonts/cormorant-garamond/cormorant-garamond-latin-wght-normal.woff2",
  weight: "300 700",
  style: "normal",
  display: "swap",
  variable: "--typeface-cormorant-garamond",
  preload: false,
});

const blackletter = localFont({
  src: "./fonts/unifrakturmaguntia/unifrakturmaguntia-latin-400-normal.woff2",
  weight: "400",
  style: "normal",
  display: "swap",
  variable: "--typeface-unifrakturmaguntia",
  preload: false,
});

const THEME_FONT_VARIABLES = [
  fell.variable,
  fellItalic.variable,
  cormorant.variable,
  blackletter.variable,
  sourceSerif.variable,
  nunito.variable,
  jetBrainsMono.variable,
].join(" ");

export { THEME_FONT_VARIABLES };
