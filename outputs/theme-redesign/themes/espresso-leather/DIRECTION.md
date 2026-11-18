# Espresso Leather direction

Espresso Leather (theme cookie value `dark`) becomes a necromancer's grimoire: a leather-bound book of seals and sigils, tooled in brass and lit by a candle. It takes every motif from its timer, the necromantic seal. The aim is a handsome, warm, readable book, not a grim one. Project Buddy is a productivity site, so the ornament frames the work and never sits in its way.

The appearance is built: [tokens.css](tokens.css) sets every token, and [ornaments.svg](ornaments.svg) draws every symbol. The screenshots in `evidence/` show each view at 1280 px and 360 px.

## Motifs

Every ornament comes from the timer seal in `apps/web/src/components/timer/timer-dial.tsx`:

- **The seal**: a square overlaid with a diamond, inside two guide circles. It becomes the emblem, the swatch ornament and the divider's centre.
- **The sigil**: the timer's marker, a diamond crossed by a bar. It becomes the heading mark.
- **The spark**: the four-pointed star that a passed marker becomes. It becomes the list marker and the emblem's centre.
- **Tooled leather**: double fillets (two parallel lines pressed into a binding), small round tool stamps and gilt diamonds. They become frame corners, the band under the trail and the portrait frame.
- **Candlelight**: one candle in the empty-state vignette, and a warm glow on hover instead of a dark shadow.

Skulls, bones, blood and runes are out of scope. The seal and the blackletter already say "necromancy"; more would make the site grim.

## Ornament density

Ornament marks the edges and openings of a page, never its working content.

| Place | Ornament |
| --- | --- |
| Trail band | The gilt band along its lower edge; brass rules |
| Section headings | The sigil before the heading |
| Panels, dialogs and the sign-in card | A tooled double fillet (border and inner keyline) with gilt corners |
| Plain cards | The double fillet with no corners |
| Sign-in card | The seal emblem, a divider under the title, and a rubricated initial |
| Empty states | The grimoire and candle above the seal emblem, and a rubricated initial |
| Construct portrait | The tooled portrait frame with corner seals |
| Lists in construct replies and the site panel | The spark marker |
| Notices and form errors | The small wax seal over the notice's top corner |
| Appearance swatch | The seal over the leather |

Ornament must not appear inside conversation messages (except list markers), the composer, task rows, Quick Notes, the spell editor's fields and reply list, row menus, tabs, form fields or buttons. Those are dense or interactive, and ornament there slows reading and blurs targets. The Timer page shows no emblem, divider or corner of its own, because the seal is already there.

## Type roles

All faces are the self-hosted fonts in `apps/web/src/themes/fonts/`. No new font is needed.

| Role | Face | Use |
| --- | --- | --- |
| Display | IM Fell English, regular (400), tracked 0.01em | The site title, page headings, the trail title and the sign-in title. Its uneven old-press letters match the timer's inscriptions. It has one weight, so display weight is 400, never synthetic bold. |
| Blackletter accent | UnifrakturMaguntia | The timer's phase label (unchanged) and the rubricated initial. Never body text, labels, headings or buttons. |
| Headings | Source Serif 4, semibold | Section headings, card titles, dialog titles. |
| Body | Source Serif 4, regular | All body text, lists and controls. See [Choices awaiting Autumn](#choices-awaiting-autumn). |
| Labels | Source Serif 4, uppercase, tracked 0.08em | The site panel's group labels, chat speakers, **Current quest**, menu labels and the dates in dated lists. |
| Numerals | Cormorant Garamond | The timer countdown (unchanged), the experience ring and ability scores. |
| Code | JetBrains Mono | Command names and code. |
| Actions | Source Serif 4, semibold | The Letterpress label face, unchanged. |

The stage 1 draft set labels in Cormorant Garamond. At label sizes the component layer sets most labels at weight 400. There, Cormorant was too thin to read on the leather, and its old-style figures blurred the dates. Tracked Source Serif capitals read clearly and still look like a book's running heads.

The initial is raised, not dropped. It sits on the first line at 1.75em. Empty states centre their copy, and a dropped initial pushed the centred lines aside.

## Palette roles on the leather

The leather texture is very dark: its median pixel is rgb(40 25 18), the 99.9th percentile rgb(59 44 36), and the brightest pixel rgb(78 63 56). Text sits directly on it in headings, trails and empty states, so every text ink is checked against the brightest pixel, not only the darkest.

| Role | Value | Material |
| --- | --- | --- |
| `--background` | rgb(36 24 17) | The leather's own brown, behind the texture while it loads |
| `--surface` | rgb(46 33 23) | Dressed leather: cards, panels, dialogs |
| `--field` | rgb(27 19 13) | A pressed, darker well for fields and the composer |
| `--foreground` | rgb(246 228 192) | Ivory |
| `--muted` | rgb(212 184 142) | Aged ivory; also the label ink |
| `--line` | rgb(178 140 88) | Blind-tooled brass: rules, keylines, ornament |
| `--primary` | rgb(234 190 112) | Candle-lit brass: links, the progress arc, gilt |
| `--accent` | rgb(218 166 88) | Deeper brass for the break arc and second emphasis |
| `--rubric` | rgb(246 152 104) | Cinnabar, for the initial only |
| `--danger` | rgb(255 160 130) | Sealing-wax coral |
| `--focus` | rgb(250 213 139) | Candle flame |
| `--action-fill` / `--on-action` | rgb(234 190 112) / rgb(42 27 14) | Gilt-stamped brass action |
| `--header-ink` | rgb(30 20 13) | The darkest leather, for the site header |

Ornament tooling uses `--line` and gilt uses `--primary`. The rubric is more orange than the danger coral (hue 20° against 14°), and it appears only in an initial letter, never beside an error.

### Contrast against the texture

`tools/sample-texture.mjs` samples the texture in Playwright. `tools/contrast.py` reads `tokens.css` and checks 125 pairs; `tools/contrast-results.txt` holds the full run. All pass:

- Every text ink reaches 4.5:1 on the texture's darkest pixel, median, 99.9th percentile and brightest pixel, and on the background, surface and field. The lowest are accent (4.58:1), rubric (4.59:1) and muted (5.28:1), all on the brightest pixel.
- Text on the navigation, trail, sidebar and secondary surfaces is 6.91:1 or more.
- Line, rule ink, frame ink and ornament ink reach 3.24:1 on the brightest pixel. Focus reaches 7.15:1 there and 12.88:1 on the header.
- The code colours are 7.92:1 or more on the code surface.
- The header paper is 14.45:1 on the header ink.
- The ring arc is 8.99:1 and the ring ink 12.46:1 on the ring disc.

Focus on the brass fill itself is 1.24:1. That is expected: the focus outline sits outside the action, on the page or a surface, never on the fill.

## Rules and dividers

A rule is a single 1px fillet in `--line`. A free-standing rule ends in `orn-rule-end` at each side: a gilt diamond and a tool stamp. The theme draws the left end, and the build mirrors it for the right. A divider adds the seal glyph at its centre and is used only between major sections, such as under the sign-in title and between the site panel's groups. Lists separate rows with plain rules.

## Frames and corners

Frames are book-square: `--frame-radius` and `--box-radius` are 0.25rem, and controls are 0.1875rem. A frame is a 1px brass border with a 1px keyline 0.25rem inside it, the double fillet of blind tooling.

Gilt corners sit on panels and dialogs (1.25rem) and on the sign-in card (1.5rem). Plain cards have none. Each corner lays a heavy brass bracket over the border's corner and a short fillet over the keyline. Inside the keyline, a quarter of the seal ring turns, with a gilt diamond at the frame's corner and a gilt stamp inside the ring. The stage 1 corner drew its fillets exactly on the border and keyline, so only its diamond showed. The redrawn corner reads at 360 px.

## Action buttons

The actions keep Letterpress: Source Serif 4 semibold labels, 2px corners, a 1px keyline, flat resting surfaces, at least 44px targets and a dashed focus outline. The grimoire changes only the materials:

- **Brass (primary)** is gilt stamped on the leather: a solid brass fill with dark ink.
- **Paper (secondary)** becomes dressed leather: the surface with a brass keyline and ivory label.
- **Ink (quiet)** is an ivory underlined label.
- **Sealing wax (danger)** is the coral fill with dark ink.
- **Hover** gives a candle glow instead of a dark shadow, which can't be seen on leather: a 1px brass ring at 45% and a 12px brass blur at 26%.
- **Pressed** gives a shallow dark inset.

Buttons carry no ornament.

## Swatch ornament

The swatch shows the seal over the leather: a blind keyline with four gilt corner diamonds, the seal's circle, square and diamond, and a spark at its centre. Strokes are heavy enough to read at the 52px swatch. The swatch paints it in Espresso Leather's own line and primary inks on any page, so it always previews this appearance.

## Chrome and the seal

The chrome echoes the seal in miniature and never competes with it. The header is the darkest leather with a brass rule. The trail band carries the gilt roll along its lower edge. The page's largest brass figure is always the seal itself on the Timer, or the one emblem on a sign-in or empty page. The only blackletter is the phase label and the initial.

## Ornament set

`ornaments.svg` holds 11 symbols. Each is a mask drawn in black, so only its opacity counts. Children marked `data-ink="accent"` form the gilt layer, painted with `--ornament-accent-ink`; the rest is blind tooling, painted with `--ornament-ink`. The specimen's Espresso Leather section shows every symbol in place.

| Symbol | Shape | Source |
| --- | --- | --- |
| `orn-corner` | Heavy bracket, keyline fillet, quarter seal ring, gilt diamond and stamp | Hand-written |
| `orn-divider` | Seal ring holding a diamond, with pipped stubs | Hand-written |
| `orn-heading` | The sigil: a diamond crossed by a bar | Hand-written |
| `orn-band` | Gilt roll: two fillets, a diamond and dots | Hand-written |
| `orn-emblem` | The timer seal in miniature | Hand-written |
| `orn-swatch` | The seal inside a keyline with gilt corners | Hand-written |
| `orn-portrait` | Double fillet frame with corner seals and side sigils | Hand-written |
| `orn-bullet` | The spark | Hand-written |
| `orn-vignette` | An open grimoire with rubricated pages, and a lit candle | Book and flame adapted from Lucide `book-open` and `flame` (ISC licence) |
| `orn-notice` | A small wax seal | Hand-written |
| `orn-rule-end` | Gilt diamond and tool stamp at the left end of a rule | Hand-written |

Lucide is already a dependency under the ISC licence, which needs no attribution on the Credits page.

## Choices awaiting Autumn

Each proposal is built into the mockups. Each is a token change, so switching back means restoring the current values below in `tokens.css`.

| Choice | Built value | Current value in the app |
| --- | --- | --- |
| Body text in Source Serif 4 | `--body-font: var(--typeface-source-serif-4)` | `--body-font: var(--typeface-nunito)` |
| Cinnabar initials | `--initial-font: var(--typeface-unifrakturmaguntia)`, `--initial-size: 1.75em`, `--initial-float: none`, `--rubric: rgb(246 152 104)` | `--initial-font` is the display font, `--initial-size: 1em`, `--initial-float: none`, and `--rubric` is the accent brass, rgb(216 164 82) |
| Square book corners | `--box-radius: 0.25rem`, `--frame-radius: 0.25rem`, `--control-radius: 0.1875rem` | `--box-radius: 1rem` (frames follow it) and `--control-radius: 0.625rem` |

- **Body text.** Nunito's round sans reads as a friendly app and works against the book. The conversation already uses Source Serif 4, so the change makes the whole page one book. Source Serif 4 has optical sizes and a large x-height, so it stays readable at 14 to 16px on the dark ground.
- **Cinnabar initials.** A red-letter initial is the oldest book ornament, and the blackletter ties it to the timer's phase label. The danger coral stays the only red-family colour beside errors.
- **Square book corners.** A leather binding has square corners, and the gilt corners sit better on a square frame. Letterpress actions keep their 2px corners either way.
