// The site's themes. A theme is data: values for the token contract below,
// with a light and a dark value for each colour, plus the fonts it names.
// Components and pages style themselves with the contract's Tailwind
// utilities only. They never name a theme, never test which theme or mode is
// active, never use palette colours and never use Tailwind's dark: variant
// (it follows the operating system, not the user's mode). So every theme,
// in either mode, restyles all of them. contract.css clears Tailwind's own
// colours, radii, shadows and font families, so of those scales only the
// contract's utilities compile, plus Streamdown's names, which chat.css maps
// for the Markdown alone and no component writes (streamdown-names.test.ts).
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
//   surface         panels on the page: menus, cards   bg-surface
//   field           inside inputs, textareas, selects  bg-field
//   code-surface    behind code                        bg-code-surface
//   foreground      text, on any surface above         text-foreground
//   muted           secondary text: hints, dates,      text-muted
//                   empty states (not inside .markdown,
//                   where chat.css makes --muted
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
// Spacing, one value for both modes:
//   --space-unit      the step of every spacing         any spacing
//                     utility, such as 0.25rem          utility: p-4,
//                     (Tailwind's own)                  gap-2, size-4
// Heading sizes, one value for both modes, each in rem and larger than body
// text (1rem), from the site's title down to a section's heading, with a
// page's heading at least 1.2 times a section's (contract.test.ts checks
// both). page-roles.css's heading roles use them; the line heights are the
// contract's.
//   --site-title-size       the site's name, as the   text-site-title
//                           heading of the home and
//                           login pages
//   --site-title-wide-size  the same from sm up, at   text-site-title-wide
//                           least as large
//   --page-heading-size     a page's heading          text-page-heading
//   --page-heading-phone-size  the same below sm, at  text-page-heading-phone
//                           most as large, and still
//                           clearly above a section's
//   --section-heading-size  a heading inside a page   text-section-heading
// Title sizes, one value for both modes, each in rem, for titles that
// aren't a page's headings (contract.test.ts checks each sits below the
// heading named). page-roles.css's title roles use them.
//   --header-title-size     the site's name in the    text-header-title
//                           header, below a page's
//                           heading and above body
//                           text
//   --card-title-size       a card's title, such as   text-card-title
//                           a quest's name, below
//                           a section's heading, at
//                           least body text
// Shape and depth, one value for both modes:
//   --control-radius  buttons, inputs, menu items       rounded-control
//   --box-radius      panels, cards, menus              rounded-box
//   --line-width      the width of every border, and    border (any side)
//                     of a chosen card's outline and a  (and read by
//                     link's underline                  page-roles.css)
//   --control-shadow  buttons and inputs                shadow-control
//   --raised-shadow   panels that float: menus, cards   shadow-raised
//   --focus-glow      a box-shadow layer added to the   (set on
//                     focused element's shadows, such   :focus-visible and
//                     as `0 0 6px <colour>`, or         the focused
//                     `0 0 transparent` for none        .field-box)
// Decoration:
//   --page-decoration a background-image behind the     (set on <body>)
//                     page, or `none`
// The site's menu, one value for both modes, read by page-roles.css's
// .site-menu and .menu-* roles:
//   --menu-decoration      a background-image behind the menu's panel, or
//                          `none`; hidden with the page decoration
//   --menu-label-case      a text-transform for its groups' names
//   --menu-label-tracking  their letter-spacing
//   --menu-separator       a background for the rule between its groups
//   --menu-separator-size  that rule's height
//   --header-ink      the shared HUD's permanent dark ground
//   --header-paper    light text and medallion on the HUD
//   --header-line     HUD separators and button shadow
//   --header-gold     HUD accent, controls and focus rings
// A shadow or decoration that should differ by mode uses colour tokens, as
// in color-mix(in oklab, var(--shadow) 30%, transparent).
//
import { z } from "zod";

// The site's single visual identity. Old theme cookies resolve to this entry.
const THEMES = [{ id: "parchment", name: "Parchment" }] as const;

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
