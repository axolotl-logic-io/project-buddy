// Every theme's fonts, self-hosted from src/themes/fonts/<family>/ through
// next/font/local. Each font is a latin, wght-only variable woff2 copied from
// @fontsource-variable/<family>, with its licence (SIL Open Font License)
// beside it as OFL.txt. Each font sets a CSS variable on <html>, named
// after the typeface rather than a theme, and a theme's CSS file points its
// font tokens at the variables it uses. A browser downloads a font only once
// the page uses it, so only the default theme's fonts are preloaded
// (theme-fonts.test.ts checks this against DEFAULT_THEME_CHOICE).
import localFont from "next/font/local";

// Gravy Falls, the default theme.
const grandstander = localFont({
  src: "./fonts/grandstander/grandstander-latin-wght-normal.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
  variable: "--typeface-grandstander",
});

const nunito = localFont({
  src: "./fonts/nunito/nunito-latin-wght-normal.woff2",
  weight: "200 1000",
  style: "normal",
  display: "swap",
  variable: "--typeface-nunito",
});

const jetBrainsMono = localFont({
  src: "./fonts/jetbrains-mono/jetbrains-mono-latin-wght-normal.woff2",
  weight: "100 800",
  style: "normal",
  display: "swap",
  variable: "--typeface-jetbrains-mono",
});

// Ghost Hasslers (with JetBrains Mono for code).
const oswald = localFont({
  src: "./fonts/oswald/oswald-latin-wght-normal.woff2",
  weight: "200 700",
  style: "normal",
  display: "swap",
  variable: "--typeface-oswald",
  preload: false,
});

const archivo = localFont({
  src: "./fonts/archivo/archivo-latin-wght-normal.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
  variable: "--typeface-archivo",
  preload: false,
});

// Ay, Liens!
const martianMono = localFont({
  src: "./fonts/martian-mono/martian-mono-latin-wght-normal.woff2",
  weight: "100 800",
  style: "normal",
  display: "swap",
  variable: "--typeface-martian-mono",
  preload: false,
});

const ibmPlexSans = localFont({
  src: "./fonts/ibm-plex-sans/ibm-plex-sans-latin-wght-normal.woff2",
  weight: "100 700",
  style: "normal",
  display: "swap",
  variable: "--typeface-ibm-plex-sans",
  preload: false,
});

// The classes that define every font variable, for <html>.
const THEME_FONT_VARIABLES = [
  grandstander.variable,
  nunito.variable,
  jetBrainsMono.variable,
  oswald.variable,
  archivo.variable,
  martianMono.variable,
  ibmPlexSans.variable,
].join(" ");

export { THEME_FONT_VARIABLES };
