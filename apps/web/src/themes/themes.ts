// The site's themes. A theme is data: values for the token contract below,
// with three fixed palettes, their materials, and the fonts they share.
// Components and pages style themselves with the contract's Tailwind
// utilities only. They never name a theme, never test which theme or mode is
// active, never use palette colours and never use Tailwind's dark: variant
// (it follows the operating system, not the user's mode). So every theme,
// in every appearance, restyles all of them. contract.css clears Tailwind's own
// colours, radii, shadows and font families, so of those scales only the
// contract's utilities compile, plus Streamdown's names, which performances.css maps
// for the Markdown alone and no component writes (streamdown-names.test.ts).
//
// The browser's fixed appearance choice lives in
// theme-choice.ts, which saves it in a cookie and applies it before the
// first paint.
//
// THE TOKEN CONTRACT
// A theme's CSS file sets the tokens on the left; components use the
// Tailwind utilities on the right (contract.css exposes them).
//
// Ornament roles in contract.css provide neutral defaults for display type,
// labels, rules, frames, masked decoration and progress rings. The artwork
// masks are generated from the SVG symbols in apps/web/design/themes/.
//
// Colours. A theme sets each one for light, soot-brass and dark, and
// contract.css picks the fixed appearance. Each "on-" colour
// is the text and icons on the filled colour it names.
// theme-tokens.browser.test.tsx checks every pair that meets on the page for
// WCAG AA, in all three appearances.
//   background      the page                           bg-background
//   surface         panels on the page: menus, cards   bg-surface
//   navigation-surface  site panel                     bg-navigation-surface
//   trail-surface       trail band                     bg-trail-surface
//   sidebar-surface     quest sidebar                  bg-sidebar-surface
//   secondary-surface   secondary buttons              bg-secondary-surface
//   field           inside inputs, textareas, selects  bg-field
//   code-surface    behind code                        bg-code-surface
//   foreground      text, on any surface above         text-foreground
//   muted           secondary text: hints, dates,      text-muted
//                   empty states (not inside .markdown,
//                   where performances.css makes --muted
//                   Streamdown's surface colour)
//   line            borders of controls and panels     border-line
//   primary         the main action's fill; also text, bg-primary,
//                   such as a hovered link             text-primary
//   on-primary                                         text-on-primary
//   accent          a highlight that stands out from   bg-accent
//                   surface, such as the highlighted
//                   item of a menu
//   on-accent                                          text-on-accent
//   danger          errors, as text and as the border  text-danger,
//                   of an error's box or field; also   border-danger,
//                   the fill of a button that removes  bg-danger
//                   something for good
//   on-danger                                          text-on-danger
//   focus           the focus outline (contract.css    outline-focus,
//                   draws it on every :focus-visible)  ring-focus
//   shadow          the colour of shadows, used by     (no utility)
//                   the shadow tokens below
//   code-comment    syntax colours of highlighted      text-code-comment,
//   code-keyword    code, on code-surface              text-code-keyword,
//   code-string                                        text-code-string,
//   code-function                                      text-code-function,
//   code-constant                                      text-code-constant
// A colour is an oklch() or rgb() value inside the sRGB gamut, so the
// contrast test can read it (Biome rejects hex colours and light-dark()).
//
// Fonts: a font-family list each, usually a typeface variable from
// theme-fonts.ts.
//   --body-font       body text (set on <body>)         font-body
//   --heading-font    headings (set on h1 to h6)        font-heading
//   --mono-font       code                              font-mono


// The site's single visual identity. Old theme cookies resolve to this entry.
const THEMES = [{ id: "parchment", name: "Parchment" }] as const;

type ThemeId = (typeof THEMES)[number]["id"];

// Fixed appearances; light and dark retain the existing cookie values.
const THEME_MODES = ["light", "soot-brass", "dark"] as const;

type ThemeMode = (typeof THEME_MODES)[number];

interface ThemeChoice {
  readonly theme: ThemeId;
  readonly mode: ThemeMode;
}

const DEFAULT_THEME_CHOICE: ThemeChoice = {
  theme: THEMES[0].id,
  mode: "light",
};

const THEME_IDS: readonly ThemeId[] = THEMES.map(({ id }) => id);

const themeChoiceSchema = z.object({
  theme: z.enum(THEME_IDS).catch(DEFAULT_THEME_CHOICE.theme),
  mode: z.enum(THEME_MODES).catch(DEFAULT_THEME_CHOICE.mode),
});

// A choice read from outside the code, such as from the page's attributes.
// A missing, unknown or malformed part is the default, never an error.
function parseThemeChoice(raw: {
  readonly theme: unknown;
  readonly mode: unknown;
}): ThemeChoice {
  return themeChoiceSchema.parse(raw);
}

export type { ThemeChoice, ThemeId, ThemeMode };
export {
  DEFAULT_THEME_CHOICE,
  parseThemeChoice,
  THEME_IDS,
  THEME_MODES,
  THEMES,
};
