# Theme interface

This page is the contract between the component layer and an appearance. A theme thread reads it to know what it may set, what each value does and what the build checks.

Components choose semantic roles and never palette colours. A theme sets token values and ornament assets only. It never writes selectors for components, and it never changes the three background textures.

Status: published 2026-11-17 for stage 2 of the appearance threads.

## Theme folder

Each appearance has one folder. The folder name and the theme cookie value differ for two of them:

| Appearance | Folder | Cookie value and `data-mode` | Texture |
| --- | --- | --- | --- |
| Ivory Vellum | `themes/ivory-vellum/` | `light` | `/textures/ivory-vellum.webp` |
| Soot & Brass | `themes/soot-brass/` | `soot-brass` | `/textures/soot-brass.webp` |
| Espresso Leather | `themes/espresso-leather/` | `dark` | `/textures/espresso-leather.webp` |

A folder holds two files that the build reads:

- `tokens.css`: token values for the appearance.
- `ornaments.svg`: the ornament symbols.

Other files in the folder, such as `DIRECTION.md`, `tools/` and `evidence/`, are for people and are not read by the build.

To start a theme, copy `themes/_template/<folder>/` to `themes/<folder>/`. The template holds today's values from `apps/web/src/themes/` plus placeholder ornaments, so a copied folder builds at once.

### Build lookup

The build uses `themes/<folder>/` when that folder has a `tokens.css`. Otherwise it falls back to `themes/_template/<folder>/` and says so. While `ornaments.svg` is still called `ornaments-draft.svg`, the build doesn't read it; rename it when it is ready.

To check a theme, run the build from the repository root:

```sh
python3 outputs/theme-redesign/build.py
```

The build prints the folder it used for each appearance. It warns when a required symbol is missing or when the SVG has a symbol that no component reads. It stops with a message if the SVG is not valid XML.

## tokens.css format

The file is one rule inside the `appearance` layer. Ivory Vellum is the default appearance, so it also sets `:root`:

```css
@layer appearance {
  :root,
  [data-mode="light"] {
    color-scheme: light;
    --background: rgb(244 236 216);
    /* ... every token below ... */
  }
}
```

Soot & Brass uses `[data-mode="soot-brass"]` and Espresso Leather uses `[data-mode="dark"]`, without `:root`.

These rules apply to the file:

- Set values only. Don't add selectors, nested rules or `@media` blocks.
- Write colours as `rgb()` values. `color-mix()` of other tokens is allowed.
- Point the texture at `url("/textures/<file>.webp")`. The build inlines the unchanged file.
- Use only the `--typeface-*` tokens for fonts. They are the self-hosted fonts in `apps/web/src/themes/fonts/`.
- Leave out a token to keep its default from `system/tokens.css`. The template lists every token, so keeping it complete is easier to review.

### Typefaces

The build defines these tokens from the self-hosted fonts:

| Token | Face |
| --- | --- |
| `--typeface-source-serif-4` | Source Serif 4, variable weight 200–900 |
| `--typeface-nunito` | Nunito, variable weight 200–1000 |
| `--typeface-jetbrains-mono` | JetBrains Mono |
| `--typeface-im-fell-english` | IM Fell English, regular 400 only |
| `--typeface-im-fell-english-italic` | IM Fell English, italic 400 only |
| `--typeface-cormorant-garamond` | Cormorant Garamond, variable weight 300–700 |
| `--typeface-unifrakturmaguntia` | UnifrakturMaguntia, blackletter |

A theme that wants a face not in this list must name it, its licence (SIL OFL or self-hosted) and the reason in `DIRECTION.md`. The PR then adds the font file under `apps/web/src/themes/fonts/`.

## Existing tokens

These tokens exist today in `apps/web/src/themes/contract.css` and `themes.ts`. Every one stays, with the same meaning.

### Colour

| Token | Role | Contrast rule |
| --- | --- | --- |
| `--background` | The page under the texture | — |
| `--surface` | Cards, panels, dialogs, notices | — |
| `--field` | Fields and the composer | — |
| `--code-surface` | Code blocks | — |
| `--foreground` | Text | 4.5:1 on background (the texture pixel closest in lightness), surface and field |
| `--muted` | Secondary text | 4.5:1 on the same surfaces |
| `--line` | Borders of controls and frames | 3:1 against the surfaces it divides |
| `--primary`, `--on-primary` | Links, selection, the progress arc; text on primary | 4.5:1 as text; pair 4.5:1 |
| `--accent`, `--on-accent` | Accent text; text on accent | 4.5:1 as text; pair 4.5:1 |
| `--danger`, `--on-danger` | Errors and destructive actions | 4.5:1 as text; pair 4.5:1 |
| `--focus` | The keyboard focus outline (dashed on an appearance swatch) | 3:1 on every surface except the site header, which uses `--header-focus` |
| `--shadow` | Shadows and the scrim | — |
| `--code-comment`, `--code-keyword`, `--code-string`, `--code-function`, `--code-constant` | Code highlighting | 4.5:1 on code-surface |
| `--navigation-surface` | The site panel | — |
| `--trail-surface` | The trail band | text pairs 4.5:1 |
| `--sidebar-surface` | The quest sidebar | text pairs 4.5:1 |
| `--secondary-surface` | Hover and selected rows | text pairs 4.5:1 |
| `--header-ink`, `--header-paper`, `--header-line`, `--header-gold` | The site header: its surface, text, rim and medallion | paper on ink 4.5:1 |
| `--page-decoration` | The page texture, `url("/textures/…")` | — |
| `--action-fill`, `--on-action` | A primary action's fill and label | 4.5:1 |
| `--action-paper`, `--action-ink` | A secondary action's paper and label | 4.5:1 |

### Type

`--body-font`, `--heading-font`, `--mono-font`, `--action-font`, `--conversation-font`, `--conversation-text-size`, `--conversation-leading`, `--site-title-size`, `--site-title-wide-size`, `--page-heading-size`, `--page-heading-phone-size`, `--section-heading-size`, `--header-title-size` and `--card-title-size`.

A theme may set `--body-font` to any typeface in the list, independently of the others. Body text covers controls, field labels, list rows and metadata, so check dense lists at 13–14 px and the 320 px layout with the face you choose.

### Shape

`--space-unit`, `--action-radius`, `--action-line-width`, `--action-hover-shadow`, `--action-pressed-shadow`, `--control-radius`, `--box-radius`, `--line-width`, `--control-shadow`, `--raised-shadow`, `--focus-glow` and `--conversation-field-radius`.

### Site panel

| Token | Role |
| --- | --- |
| `--panel-decoration` | A layer painted over the site panel's surface |
| `--panel-label-case` | `text-transform` of the site panel's group labels |
| `--panel-label-tracking` | Letter spacing of the site panel's group labels |
| `--panel-separator` | The image between the site panel's groups |
| `--panel-separator-size` | The separator's height |

### Timer

The Timer keeps its 42 tokens unchanged. A theme may tune them, but the Timer's look is not part of this redesign.

- Fonts and sizes: `--timer-body-font`, `--timer-phase-font`, `--timer-numeral-font`, `--timer-blackletter-font`, `--timer-next-font`, `--timer-phase-size`, `--timer-numeral-size`, `--timer-number-scale`, `--timer-hours-scale`, `--timer-number-leading`.
- Illustration switches: `--timer-hourglass-display`, `--timer-ring-display`, `--timer-inscription-display`, `--timer-sigil-display`, `--timer-chapter-display`, `--timer-seal-display`.
- Inks: `--timer-sand`, `--timer-arc`, `--timer-marker-active`, `--timer-track`, `--timer-ornament-ink`, `--timer-mark-glow`, `--timer-hatch-opacity`.
- Dial geometry: `--timer-radius`, `--timer-stroke`, `--timer-guide-outer`, `--timer-guide-middle`, `--timer-guide-inner`.
- Layout: `--timer-face-columns`, `--timer-face-width`, `--timer-face-ratio`, `--timer-face-height`, `--timer-stage-padding`, `--timer-face-padding`, `--timer-readout-align`, `--timer-phase-position`, `--timer-phase-gap`, `--timer-next-position`, `--timer-next-offset`, `--timer-next-margin`, `--timer-next-padding`, `--timer-next-rule`.

## New tokens

`system/tokens.css` declares each new token with a default that gives a plain site: no ornament, the heading face for display text and the line colour for rules. A theme that sets nothing new still renders correctly.

### Type roles

| Token | Default | Role |
| --- | --- | --- |
| `--display-font` | heading-font | The site title, a page's heading, the sign-in title, a dialog's title |
| `--display-weight` | `600` | Display weight. Use `400` for a single-weight face such as IM Fell English |
| `--display-tracking` | `0em` | Display letter spacing |
| `--label-font` | heading-font | Small labels: site panel group labels, chat speakers, the current quest label, a menu's label, dates in a dated list, the ring's caption |
| `--label-ink` | muted | The colour of those labels, except chat speakers, which stay primary. Set rubric for red-letter labels; it must reach 4.5:1 |
| `--label-case` | `none` | `text-transform` of small labels other than the site panel's |
| `--label-caps` | `normal` | `font-variant-caps` of all small labels, including the site panel's. Use `all-small-caps` for tracked small capitals |
| `--label-tracking` | `0em` | Letter spacing of small labels other than the site panel's |
| `--label-weight` | `400` | Weight of the current quest label, a menu's label and a dated list's dates. The chat speaker (700), the progress ring's caption (600) and the site panel's labels (600) keep their own. |
| `--numeral-font` | heading-font | Figures: the circle number in the progress ring, an ability's points, a collection tab's count. The collection count asks for lining figures, so an old-style face's zero doesn't read as "o" |
| `--initial-font` | display-font | A rubricated initial: the first letter of the sign-in lede and an empty state's copy |
| `--initial-size` | `1em` | The initial's size, such as `2.6em` for a drop initial |
| `--initial-float` | `none` | `left` for a drop initial; `none` for a raised one |
| `--initial-gap` | `0.08em` | The space after the initial. A face whose capitals overhang their box, such as a blackletter, needs about `0.15em`. |

The site panel's group labels keep the existing `--panel-label-case` and `--panel-label-tracking`. To make every label match, set `--label-case` and `--label-tracking` to the same values.

### Colour roles for ornament

| Token | Default | Role | Contrast rule |
| --- | --- | --- | --- |
| `--rubric` | accent | Initials and the heading mark; label-ink may use it | 4.5:1 when it colours text |
| `--ornament-ink` | line | The main ink of every ornament | Decorative; none |
| `--ornament-accent-ink` | primary | The second ink, such as gold leaf or brass | Decorative; none. Never use it for text |
| `--rule-ink` | line | Rules and dividers between content | 3:1 against the surfaces it divides |
| `--frame-ink` | line | The border and keyline of a frame | 3:1 |
| `--scrim` | shadow at 45% | The dimmed page behind a dialog | — |

### Site header focus

| Token | Default | Role | Contrast rule |
| --- | --- | --- | --- |
| `--header-focus` | focus | The colour of the keyboard focus outline inside the site header. Its style and width stay those of the page's focus outline | 3:1 against header-ink |

The site header has its own band, coloured by `--header-ink`, which may be much darker or lighter than the page. Check `--focus` against header-ink. When it falls below 3:1, set `--header-focus`; header-gold or header-paper often passes.

### Rules and frames

| Token | Default | Role |
| --- | --- | --- |
| `--rule-style` | `solid` | A rule's border style: `solid`, `double` or `dotted`. Don't use `dashed`: a dashed outline means keyboard focus |
| `--rule-width` | `1px` | A rule's width; `3px` or more for `double` |
| `--frame-style` | `solid` | A frame's border style |
| `--frame-width` | line-width | A frame's border width |
| `--frame-radius` | box-radius | A frame's corner radius |
| `--frame-inset` | `0px` | The gap between the border and the inner keyline |
| `--frame-keyline` | `0px` | The inner keyline's width; `0px` turns it off |
| `--header-decoration` | `none` | A layer over the site header |
| `--trail-decoration` | `none` | A layer over the trail band |
| `--frame-decoration` | `none` | A layer over every frame |

### Progress ring

| Token | Default | Role |
| --- | --- | --- |
| `--ring-track` | line at 35% | The ring's track |
| `--ring-arc` | primary | The ring's progress arc. 3:1 against the disc |
| `--ring-disc` | surface | The ring's centre |
| `--ring-ink` | foreground | The circle number. 4.5:1 on the disc |
| `--ring-stroke` | `0.1` | The stroke as a share of the diameter |

In the site header the ring uses the header tokens instead: header-line for the track, header-gold for the arc, header-paper for the disc and header-ink for the number.

### Ornament sizes

Each ornament slot reads a size token. Every size defaults to `0px`, so a slot that a theme leaves at 0 takes no room and shows nothing.

| Token | Suggested value | Sets |
| --- | --- | --- |
| `--orn-corner-size` | 1–1.25rem | The default for the per-kind corner sizes below |
| `--orn-corner-panel-size` | corner-size | Corners of a page-level panel |
| `--orn-corner-dialog-size` | corner-size | Corners of a dialog |
| `--orn-corner-feature-size` | corner-size | Corners of a feature card, such as the sign-in card |
| `--orn-corner-card-size` | `0px` | Corners of a plain card |
| `--orn-divider-width` | 1.5–2rem | A divider glyph's width; its height is half of it |
| `--orn-heading-width` | 0.875–1rem | The square mark before a section heading |
| `--orn-band-height` | 0.5–0.75rem | The band's height. A band of fine lines needs at least 0.5rem to show |
| `--orn-emblem-size` | 3–4rem | The square emblem on the sign-in card, and in an empty state unless the next token says otherwise |
| `--orn-empty-emblem-size` | emblem-size | The emblem in an empty state only. Set `0px` when the empty state shows a vignette |
| `--orn-portrait-bleed` | 0.375–0.75rem | How far the portrait frame reaches past the image on each side |
| `--portrait-radius` | action-radius | The portrait's corner radius. `50%` makes a round medallion; the built-in art keeps its figure inside a central circle of 88% of the width |
| `--orn-bullet-size` | 0.375–0.5rem | A list marker |
| `--orn-vignette-width` | 0 or 7.5–10rem | Optional. The empty-state picture's width; its height follows the symbol's ratio |
| `--orn-notice-size` | 0 or 1–1.25rem | Optional. The notice mark |
| `--orn-rule-end-height` | 0 or 0.5–0.75rem | Optional. A rule terminal's height; its width follows the symbol's ratio |

The build writes the `--orn-*` image tokens, such as `--orn-corner-tl` and `--orn-vignette-ratio`. Don't set them in `tokens.css`.

## Frame corners

Corners go on outer frames only. The component layer decides which frames are outer; the theme decides how large each kind's corners are.

- A page-level panel, a dialog and a feature card (`data-frame="feature"`, such as the sign-in card) read their own size token.
- A plain card reads `--orn-corner-card-size`, which is `0px` by default.
- A frame inside another frame, a list, a chat transcript, the quest sidebar or the site panel never has corners, whatever the tokens say.

To turn corners off for one kind, set its size to `0px`. To turn every corner off, set `--orn-corner-size` to `0px` and leave the per-kind tokens at their defaults.

## ornaments.svg format

The file is one `<svg>` holding `<symbol>` elements. Each symbol is a mask: draw in black, and only opacity counts. The component paints the mask with an ink token.

```xml
<svg xmlns="http://www.w3.org/2000/svg">
  <symbol id="orn-heading" viewBox="0 0 16 16">
    <path d="M8 1v14" fill="none" stroke="#000" stroke-width="1.5"/>
    <path data-ink="accent" d="m8 4 4 4-4 4-4-4Z"/>
  </symbol>
</svg>
```

These rules apply to every symbol:

- A child with `data-ink="accent"` is painted with `--ornament-accent-ink`. Every other child is painted with `--ornament-ink`. Put `data-ink` on the symbol's direct children; wrap a group in `<g data-ink="accent">` if needed.
- Start each viewBox at `0 0`. The build mirrors corners and rule ends around the viewBox.
- Draw shapes only: `path`, `circle`, `ellipse`, `rect`, `line`, `polyline`, `polygon` and `g`. Don't use `<use>`, `<image>`, `<text>`, `<style>`, filters, external references or ids that other elements point to. Each symbol becomes its own standalone image.
- Keep comments free of `--`, which XML doesn't allow inside a comment. The build strips comments before parsing.
- Give strokes `fill="none"` and an explicit `stroke-width` in viewBox units.
- Record the source and licence of each symbol in `DIRECTION.md`: hand-written, or adapted from a named icon library with its licence (such as Lucide, ISC). Don't use image generation.

### Symbols

| Symbol | Status | viewBox | Size token | Where it shows |
| --- | --- | --- | --- | --- |
| `orn-corner` | Required | Square, `0 0 24 24` | Per-kind corner sizes | The top-left corner of an outer frame. The build mirrors it to the other three corners. Draw the corner's two arms along the top and left edges; the frame's border runs under them |
| `orn-divider` | Required | 2:1, such as `0 0 32 16` or `0 0 48 24` | `--orn-divider-width` | The centre of a divider, between two rules |
| `orn-heading` | Required | Square, `0 0 16 16` | `--orn-heading-width` | Before a section heading's text |
| `orn-band` | Required | One tile, such as `0 0 16 6` or `0 0 48 6` | `--orn-band-height` | Repeated along the trail band's foot. The tile must join its neighbours at the left and right edges |
| `orn-emblem` | Required | Square, `0 0 48 48` | `--orn-emblem-size` | The emblem of an empty state and the sign-in card |
| `orn-swatch` | Required | Square, `0 0 64 64` | The swatch's size | Over the appearance swatch's texture. See [Appearance swatch](#appearance-swatch) |
| `orn-portrait` | Required | Square, `0 0 100 100` | `--orn-portrait-bleed` | The frame around a construct's portrait. See [Portrait frame](#portrait-frame) |
| `orn-bullet` | Required | Square, `0 0 8 8` | `--orn-bullet-size` | A list marker in a construct's reply and the site panel. One ink: accent children are painted in ornament-ink too |
| `orn-vignette` | Optional | 120 wide, 40–80 tall, such as `0 0 120 48` | `--orn-vignette-width` | The picture above an empty state's emblem. The build writes its ratio |
| `orn-notice` | Optional | Square, `0 0 16 16` or `0 0 12 12` | `--orn-notice-size` | Set over a notice's top start corner, half outside it |
| `orn-rule-end` | Optional | About 3:1, such as `0 0 24 8` | `--orn-rule-end-height` | The left end of a free-standing rule. The build mirrors it for the right end. The rule's line meets it at the viewBox's right edge, at mid-height |

A theme that omits an optional symbol, or leaves its size at 0, shows nothing in that place and leaves no gap.

An empty state shows the vignette and then the emblem. Two pictures where one would do look crowded, so a theme normally shows one of them. To show the vignette alone, set `--orn-vignette-width` and set `--orn-empty-emblem-size: 0px`. The sign-in card shows only the emblem and reads `--orn-emblem-size`, so it keeps its emblem either way.

### Appearance swatch

The swatch is a native radio named by its appearance, such as "Ivory Vellum". Its face sets its own `data-mode`, so it always shows its own appearance: its own texture, `--background`, `--line`, inks and `orn-swatch`, whatever the page's appearance.

The `orn-swatch` symbol must meet these rules:

- It is square and fills the face. The face is 3.25rem in the site panel and 5.5rem in Settings, so the symbol must read at 52 px.
- It is decoration only. The face is `aria-hidden`, and the radio's name carries the meaning.
- It leaves the texture visible: draw a frame and one small central motif, not a full picture.
- It doesn't draw a selection ring or focus outline. The component draws a solid ring for selection and a dashed outline for keyboard focus, outside the face.

### Portrait frame

The portrait frame sits outside the image. The component adds `--orn-portrait-bleed` of margin on every side of the portrait, then stretches the `orn-portrait` symbol over the image and its margin.

- Draw the frame in the outer band of the viewBox. With a bleed of 0.75rem on a 16rem portrait, the image covers about 91% of the frame's width, so keep the inner edge of the drawing within the outer 4% of the viewBox.
- Keep the centre empty. Anything drawn there covers the construct.
- Keep the frame within 6% of the image's width from its edge (9.5 on the 100-unit board). The built-in art keeps only ground and motes in that strip.
- To frame a round portrait, set `--portrait-radius: 50%` and draw a round frame.
- The symbol is stretched to a square, so draw it square.

## Theme checks

The build and the PR's tests check a theme in these ways:

- **XML:** `ornaments.svg` parses, and every required symbol is present.
- **Contrast:** each pair in the tables above meets its ratio. Text on the texture is measured against the texture pixel closest in lightness to the text: the darkest pixel for dark text on a light texture, and the lightest pixel for light text on a dark texture.
- **Focus:** the dashed focus outline stays distinct from the solid selection ring on every surface.
- **Fit:** every view fits at 320 px with no horizontal scroll, and targets stay at least 44 px.
- **Reduced motion:** a theme adds no animation; components handle motion.

## Template

`themes/_template/` has one folder per appearance. Each holds a complete `tokens.css`, with today's values and plain defaults for every new token, and an `ornaments.svg` with simple placeholder symbols for every id, including the three optional ones. The template's optional slot sizes are 0, so its placeholders don't show until a theme sets a size.
