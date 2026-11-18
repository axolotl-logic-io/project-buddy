# Espresso Leather direction

Espresso Leather (theme cookie value `dark`) becomes a necromancer's grimoire: a leather-bound book of seals and sigils, tooled in brass and lit by a candle. It takes every motif from its timer, the necromantic seal. The aim is a handsome, warm, readable book, not a grim one. Project Buddy is a productivity site, so the ornament frames the work and never sits in its way.

## Motifs

Every ornament comes from the timer seal in `apps/web/src/components/timer/timer-dial.tsx`:

- **The seal**: a square overlaid with a diamond, inside two guide circles. It becomes the emblem, the swatch ornament and the divider's centre.
- **The sigil**: the timer's marker, a diamond crossed by a bar. It becomes the heading mark.
- **The spark**: the four-pointed star that a passed marker becomes. It becomes the list marker and the emblem's centre.
- **Tooled leather**: double fillets (two parallel lines pressed into a binding), small round tool stamps and gilt diamonds at the corners. They become frame corners, the header band and the portrait frame.
- **Candlelight**: one candle in the empty-state vignette, and a warm glow on hover instead of a dark shadow.

Skulls, bones, blood and runes are out of scope. The seal and the blackletter already say "necromancy"; more would make the site grim.

## Ornament density

Ornament marks the edges and openings of a page, never its working content.

| Place | Ornament |
| --- | --- |
| Site header and trail band | The gilt band under each band; brass rules |
| Page and section headings | The sigil before a section heading; no mark before a page heading, which already has the band above it |
| Cards, panels and dialogs | A tooled double fillet (border and inner keyline) with corners |
| Sign-in card and empty states | The seal emblem, and a blackletter initial in the lede |
| Construct portrait | The tooled portrait frame with corner seals |
| A construct reply's bulleted list and the site panel's lists | The spark marker |
| Notices and form errors | The small wax seal beside the text |
| Appearance swatch | The seal over the leather |

Ornament must not appear inside the conversation's messages (except list markers), the composer, task rows, Quick Notes, the spell editor's fields and reply list, row action menus, tabs, form fields or buttons. Those are dense or interactive, and ornament there slows reading and blurs targets. A page shows at most one emblem. The Timer page shows no emblem, divider or corner of its own, because the seal is already there.

## Type roles

All faces are the self-hosted fonts in `apps/web/src/themes/fonts/`. No new font is needed.

| Role | Face | Use |
| --- | --- | --- |
| Display | IM Fell English, regular (400) | The site title, page headings and the sign-in title. Its uneven old-press letters match the timer's inscriptions. It has one weight, so display weight is 400, never synthetic bold. |
| Blackletter accent | UnifrakturMaguntia | The timer's phase label (unchanged) and the rubricated initial of a sign-in or empty-state lede. Never body text, labels, headings or buttons. |
| Headings | Source Serif 4, semibold (600) | Section headings, card titles, dialog titles. |
| Body | Source Serif 4, regular (400) | All body text, lists and controls. See the change below. |
| Labels | Cormorant Garamond, semibold (600), uppercase, tracked 0.1em | The site panel's group labels, a chat speaker's name, small eyebrow labels such as **Current quest**. |
| Numerals | Cormorant Garamond, lining tabular figures | The timer countdown (unchanged) and the header's experience ring. |
| Code | JetBrains Mono | Command names and code. |
| Actions | Source Serif 4, semibold | The Letterpress label face, unchanged. |

**Change: body text moves from Nunito to Source Serif 4.** Nunito's round sans reads as a friendly app and works against the book. The conversation already uses Source Serif 4, so the change makes the whole page one book. Source Serif 4 has optical sizes and a large x-height, so it stays readable at 14 to 16 px on a dark ground. If Autumn prefers to keep Nunito for small metadata, only `--body-font` changes back.

## Palette roles on the leather

The leather texture is very dark: its median pixel is rgb(40 25 18), the 99.9th percentile rgb(59 44 36), and the brightest pixel rgb(78 63 56). Text sits directly on it in headings, trails and empty states, so every text ink is checked against the brightest areas, not the average.

| Role | Value | Material |
| --- | --- | --- |
| `--background` | rgb(36 24 17) | The leather's own brown, behind the texture while it loads |
| `--surface` | rgb(46 33 23) | Dressed leather: cards, panels, dialogs |
| `--field` | rgb(27 19 13) | A pressed, darker well for fields and the composer |
| `--foreground` | rgb(246 228 192) | Ivory |
| `--muted` | rgb(212 184 142) | Aged ivory |
| `--line` | rgb(178 140 88) | Blind-tooled brass: rules, keylines, ornament |
| `--primary` | rgb(234 190 112) | Candle-lit brass: links, the progress arc, gilt |
| `--accent` | rgb(218 166 88) | Deeper brass for the break arc and second emphasis |
| `--rubric` | rgb(238 140 108) | Cinnabar, for a rubricated initial only |
| `--danger` | rgb(255 160 130) | Sealing wax, kept apart from the rubric by use (see questions) |
| `--focus` | rgb(250 213 139) | Candle flame |
| `--action-fill` / `--on-action` | rgb(234 190 112) / rgb(42 27 14) | Gilt-stamped brass action |

The ornament inks are `--ornament-ink: var(--line)` for tooling and `--ornament-accent-ink: var(--primary)` for gilt. Rules and frames use `--line`. The rubric is the only red-family ink besides danger, and it appears only in an initial letter.

### Contrast against the texture

`tools/sample-texture.mjs` samples the texture in Playwright; `tools/contrast.py` checks every pair. All text inks pass WCAG AA (4.5:1) on the darkest pixel, the median, the 99.9th percentile and every surface. The lowest are muted on the brightest pixel (5.28:1) and accent on the brightest pixel (4.58:1). Line meets the 3:1 boundary pair everywhere, at 3.24:1 on the brightest pixel.

There are two exceptions:

- **Rubric on the brightest pixel is 4.11:1.** The rubric only colours a large initial, which needs 3:1, and it reaches 5.47:1 on the 99.9th percentile.
- **Focus on the brass fill is 1.24:1.** The focus outline sits 2 px outside the action, on the page or surface, where it reaches 7.15:1 or more. It never sits on the fill.

## Rules and dividers

A rule is a single 1 px fillet in `--line`. A divider adds the seal glyph at its centre and is used only between major sections, such as the sign-in card's alternatives or the profile's sections. Lists separate rows with plain rules and no glyph. A free-standing rule may end in the rule-end diamond (`orn-rule-end`), for example under the sign-in title.

## Frames and corners

Frames are book-square, not rounded: `--frame-radius` and `--box-radius` drop from 1 rem to 0.25 rem. A frame is a 1 px brass border with an inner 1 px keyline 4 px inside it, the double fillet of blind tooling. Gilt corner pieces sit on the keyline: two fillets turning around a gilt diamond, with one tool stamp. Corners are 1.25 rem, small enough for the quest card and the 360 px sign-in card.

## Action buttons

The actions keep Letterpress: Source Serif 4 semibold labels, 2 px corners, a 1 px keyline, flat resting surfaces, at least 44 px targets and a dashed focus outline. The grimoire changes only the materials:

- **Brass (primary)** is gilt stamped on the leather: a solid brass fill with dark ink.
- **Paper (secondary)** becomes dressed leather: the surface with a brass keyline and ivory label.
- **Ink (quiet)** is an ivory underlined label.
- **Sealing wax (danger)** is the coral wax fill with dark ink.
- **Hover** gives a candle glow, a soft brass halo, instead of a dark shadow, which is invisible on leather: `0 0 0 1px` of the fill plus a 10 px brass blur at about 25 %.
- **Pressed** gives a shallow dark inset, as before.

Buttons carry no ornament.

## Swatch ornament

The swatch shows the seal over the leather: a blind keyline with four gilt corner diamonds, the seal's circle, square and diamond, and a spark at its centre. Strokes are heavy enough to read at the 52 px swatch. The swatch paints it in Espresso Leather's own line and primary inks on any page, so it always previews this appearance.

## Chrome and the seal

The chrome echoes the seal in miniature and never competes with it. The header band and trail rules are thin brass tooling, and the header's experience ring echoes the dial. The page's largest brass figure is always the seal itself on the Timer, or the one emblem on a sign-in or empty page. Corners and heading marks stay at 1.25 rem or less, and the only blackletter is the phase label and a lede initial.

## Ornament set

The drafts are in `ornaments-draft.svg`. Each symbol draws in `currentColor` only, and `data-ink="accent"` marks its gilt layer. `evidence/ornaments-draft-preview.png` shows them as masks on the texture and on the surface.

| Symbol | Shape | Source |
| --- | --- | --- |
| `orn-heading` | The sigil: a diamond crossed by a bar | Hand-written |
| `orn-divider` | Seal ring holding a diamond, with pipped stubs | Hand-written |
| `orn-corner` | Double fillet, tool stamp and gilt diamond | Hand-written |
| `orn-rule-end` | Fillet ending in a stamp and a gilt diamond | Hand-written |
| `orn-band` | Gilt roll: two fillets, a diamond and dots | Hand-written |
| `orn-emblem` | The timer seal in miniature | Hand-written |
| `orn-swatch` | The seal inside a keyline with gilt corners | Hand-written |
| `orn-portrait` | Double fillet frame with corner seals and side sigils | Hand-written |
| `orn-vignette` | An open grimoire with a seal, and a lit candle | Book and flame adapted from Lucide `book-open` and `flame` (ISC licence) |
| `orn-notice` | A small wax seal | Hand-written |
| `orn-bullet` | The spark | Hand-written |

Lucide is already a dependency under the ISC licence, which needs no attribution on the Credits page.
