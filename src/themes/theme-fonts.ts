// Every theme's fonts, self-hosted by next/font from Google Fonts (all under
// the SIL Open Font License). Each font sets a CSS variable on <html>, named
// after the typeface rather than a theme, and a theme's CSS file points its
// font tokens at the variables it uses. A browser downloads a font only once
// the page uses it, so only the default theme's fonts are preloaded.
import { Grandstander, JetBrains_Mono, Nunito } from "next/font/google";

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

// The classes that define every font variable, for <html>.
const THEME_FONT_VARIABLES = [
  grandstander.variable,
  nunito.variable,
  jetBrainsMono.variable,
].join(" ");

export { THEME_FONT_VARIABLES };
