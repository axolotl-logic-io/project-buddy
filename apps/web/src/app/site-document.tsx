import type { JSX, ReactNode } from "react";
import { SAVED_THEME_SCRIPT, themeAttributes } from "@/themes/theme-choice.ts";
import { THEME_FONT_VARIABLES } from "@/themes/theme-fonts.ts";
import type { ThemeChoice } from "@/themes/themes.ts";
import "./globals.css";

// React reveals a streamed page no sooner than 300 ms after the browser's
// first frame, to batch reveals. When the page follows the loading shell
// within milliseconds, painting the shell first would hold the page back
// that long. So the browser holds its first frame for an element the page
// never has, which lasts until the first response has been parsed, reveal
// scripts and all. The script lets the frame go then, before the browser
// warns of the missing element, or after FIRST_FRAME_HOLD_MS, so a slower
// response still shows the shell. A link added later can't hold a frame.
const HOLD_ID = "first-frame-hold";
const FIRST_FRAME_HOLD_MS = 200;
const RELEASE_HOLD = `(function(){var h=document.getElementById("${HOLD_ID}");function go(){if(h)h.remove()}setTimeout(go,${FIRST_FRAME_HOLD_MS});document.addEventListener("readystatechange",go)})()`;

// The document every root layout renders, in the appearance its HTML
// starts with. The saved appearance replaces it before the first paint,
// so <html> may differ from the HTML by the time React hydrates.
function SiteDocument({
  appearance,
  children,
}: {
  readonly appearance: ThemeChoice;
  readonly children: ReactNode;
}): JSX.Element {
  return (
    <html
      {...themeAttributes(appearance)}
      className={`${THEME_FONT_VARIABLES} h-full antialiased`}
      lang="en"
      suppressHydrationWarning={true}
    >
      <head>
        <script>{SAVED_THEME_SCRIPT}</script>
        <link
          blocking="render"
          href={`#${HOLD_ID}-end`}
          id={HOLD_ID}
          rel="expect"
        />
        <script>{RELEASE_HOLD}</script>
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}

export { SiteDocument };
