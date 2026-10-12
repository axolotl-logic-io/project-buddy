// The site's themes. A theme is data: values for the token contract below,
// with a light and a dark value for each colour, plus the fonts it names.
// Components and pages style themselves with the contract's Tailwind
// utilities only. They never name a theme, never test which theme or mode is
// active, never use palette colours and never use Tailwind's dark: variant
// (it follows the operating system, not the user's mode). So every theme,
// in either mode, restyles all of them.
//
// The user's choice of theme and mode (Light, Dark or System) lives in
// theme-choice.ts, which saves it in a cookie and applies it before the
// first paint.
//
// THE TOKEN CONTRACT
// A theme's CSS file sets the tokens on the left; components use the
// Tailwind utilities on the right (contract.css exposes them).
//
// Colours. A theme sets each one twice, as --light-<token> and
// --dark-<token>, and contract.css picks one by the mode. Each "on-" colour
// is the text and icons on the filled colour it names. contrast.test.ts
// checks every pair that meets on the page for WCAG AA, in both modes.
//   background      the page                           bg-background
//   surface         panels on the page: the header,    bg-surface
//                   menus, cards
//   field           inside inputs, textareas, selects  bg-field
//   code-surface    behind code                        bg-code-surface
//   foreground      text, on any surface above         text-foreground
//   muted           secondary text: hints, dates,      text-muted
//                   empty states
//   line            borders of controls and panels     border-line
//   primary         the main action's fill; also text, bg-primary,
//                   such as a hovered link             text-primary
//   on-primary                                         text-on-primary
//   accent          a highlight, such as the           bg-accent
//                   highlighted item of a menu
//   on-accent                                          text-on-accent
//   danger          errors, as text                    text-danger
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
// Shape and depth, one value for both modes:
//   --control-radius  buttons, inputs, menu items       rounded-control
//   --box-radius      panels, cards, menus              rounded-box
//   --line-width      the width of every border         border (any side)
//   --control-shadow  buttons and inputs                shadow-control
//   --raised-shadow   panels that float: menus, cards   shadow-raised
//   --focus-glow      a filter added to the focus       (set on
//                     outline, such as drop-shadow(),   :focus-visible)
//                     or `none`
// Decoration:
//   --page-decoration a background-image behind the     (set on <body>)
//                     page, or `none`
// A shadow or decoration that should differ by mode uses colour tokens, as
// in color-mix(in oklab, var(--shadow) 30%, transparent).
//
// ADDING A THEME
// 1. src/themes/<id>.css: copy gravy-falls.css, then change the layer name,
//    the [data-theme="<id>"] selector, the typeface fallbacks and every
//    value. contrast.test.ts fails until every colour is set, in the gamut
//    and passing in both modes.
// 2. src/themes/themes.css: one `@import "./<id>.css" layer(themes);` line.
// 3. src/themes/theme-fonts.ts: the theme's fonts, with `preload: false`,
//    and their variables in THEME_FONT_VARIABLES.
// 4. THEMES below: one entry with the id (kebab-case) and the name the
//    picker shows.
import { z } from "zod";

// The themes the picker offers, in its order, each with the name it shows.
// The first is the default.
const THEMES = [
  { id: "gravy-falls", name: "Gravy Falls" },
  { id: "ghost-hasslers", name: "Ghost Hasslers" },
  { id: "ay-liens", name: "Ay, Liens!" },
] as const;

type ThemeId = (typeof THEMES)[number]["id"];

// Light and Dark pick a mode; System follows the operating system.
const THEME_MODES = ["light", "dark", "system"] as const;

type ThemeMode = (typeof THEME_MODES)[number];

interface ThemeChoice {
  readonly theme: ThemeId;
  readonly mode: ThemeMode;
}

const DEFAULT_THEME_CHOICE: ThemeChoice = {
  theme: THEMES[0].id,
  mode: "system",
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
