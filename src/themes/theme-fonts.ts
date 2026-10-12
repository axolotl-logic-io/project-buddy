// Every theme's fonts, self-hosted by next/font from Google Fonts (all under
// the SIL Open Font License). Each font sets a CSS variable on <html>, named
// after the typeface rather than a theme, and a theme's CSS file points its
// font tokens at the variables it uses. A browser downloads a font only once
// the page uses it, so only the default theme's fonts are preloaded
// (theme-fonts.test.ts checks this against DEFAULT_THEME_CHOICE).
import {
  Archivo,
  Grandstander,
  IBM_Plex_Sans,
  JetBrains_Mono,
  Martian_Mono,
  Nunito,
  Oswald,
} from "next/font/google";

// Gravy Falls, the default theme.
const grandstander = Grandstander({
  variable: "--typeface-grandstander",
  subsets: ["latin"],
});

const nunito = Nunito({
  variable: "--typeface-nunito",
  subsets: ["latin"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--typeface-jetbrains-mono",
  subsets: ["latin"],
});

// Ghost Hasslers (with JetBrains Mono for code).
const oswald = Oswald({
  variable: "--typeface-oswald",
  subsets: ["latin"],
  preload: false,
});

const archivo = Archivo({
  variable: "--typeface-archivo",
  subsets: ["latin"],
  preload: false,
});

// Ay, Liens!
const martianMono = Martian_Mono({
  variable: "--typeface-martian-mono",
  subsets: ["latin"],
  preload: false,
});

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--typeface-ibm-plex-sans",
  subsets: ["latin"],
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
