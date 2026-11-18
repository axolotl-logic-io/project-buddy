# Ivory Vellum direction

Ivory Vellum is the default appearance (theme cookie value `light`). It treats the site as a scribe's illuminated manuscript: sepia ink on vellum, gold leaf, rubrication (red-letter accents), fine keylines and scholarly calm. Every motif comes from the scribe's hourglass, the Timer's illustration in this appearance, so the whole site and the Timer read as one book.

The token values are in [`tokens.css`](tokens.css) and the ornaments in [`ornaments.svg`](ornaments.svg). The section for the implementation plan is in [`IMPLEMENTATION-SECTION.md`](IMPLEMENTATION-SECTION.md).

## Choices awaiting Autumn

Autumn hasn't decided these yet. Each one is built and switched on, so the mockups show it. To switch one off, change the tokens named below in `tokens.css` and run `python3 outputs/theme-redesign/build.py` from the repository root.

| Choice | Built and on | To switch it off |
| --- | --- | --- |
| Display face | IM Fell English sets the site title, page headings and the sign-in title | Set `--display-font: var(--heading-font)` and `--display-weight: 600`. Display text then uses Source Serif 4 semibold, as now |
| Empty-state picture | The book-and-quill vignette sits above the hourglass emblem | Set `--orn-vignette-width: 0px` to show the emblem alone. Showing the vignette alone needs a change in the component layer; see the note below |
| Rubricated labels | The site panel's group labels, chat speakers and dates are rubric small capitals | Set `--label-ink: var(--muted)` for faded-ink labels |
| Raised initial | The first letter of the sign-in lede and of an empty state's copy is a rubric IM Fell English capital, 1.75 times the text size | Set `--initial-font: var(--body-font)` and `--initial-size: 1em`. The letter stays rubric, because the component colours it |
| Numerals | Cormorant Garamond sets the progress ring's circle number, ability points and tab counts | Set `--numeral-font: var(--heading-font)` for Source Serif 4 |

The empty state shows the vignette and then the emblem whenever both sizes are set. Together they make two pictures where one would do. The emblem can't be turned off for empty states alone, because the sign-in card reads the same size. If Autumn chooses the vignette, the component layer needs a way to hide the emblem under a vignette.

At 12 px, Cormorant Garamond's tab counts show old-style figures, so a zero reads like a small letter o. The ring and ability numbers ask for lining figures, but the tab count doesn't yet. Adding `lining-nums` to the tab count fixes this whatever Autumn chooses.

## Motifs

The hourglass in `apps/web/src/components/timer/timer-hourglass.tsx` gives four motifs:

- **The finial lozenge.** A tall rhombus, 2 wide by 3 tall, in gold leaf. It is the site's one recurring mark: on a heading, at a frame's corner, at a divider's centre and as a list marker.
- **Paired keylines.** The hourglass's frame is two fine parallel lines. Frames, the trail band's foot and the swatch use the same pair.
- **The dark end bar.** The site header is a dark ink bar with a gold rim, like the hourglass's top bar.
- **The dotted stream.** The sand's dotted stream becomes the dotted line in the band under the trail band.

The emblem and the swatch repeat the hourglass itself, small and inside a roundel or frame.

## Ornament density

Ornament marks structure and ceremony, never content. It sits on the site's frame and on quiet pages, and stays out of anything a user reads closely or types into.

Ornament goes on these places:

- the header's gold rim and the band under the trail band;
- the corners of panels, dialogs and feature cards, such as the sign-in card;
- the finial mark before a section heading;
- dividers between the site panel's groups and between page sections;
- the ends of a free-standing rule;
- the emblem and vignette of an empty state, and the emblem of the sign-in card;
- the mark at a notice's top corner;
- the construct portrait's frame;
- the appearance swatch.

Ornament never goes on these places:

- plain cards, which keep the paired keyline but have no corners;
- rows of dense lists: quests, spells, tasks, ideas, Quick Notes and spell replies;
- chat messages, except the finial bullet in a construct reply's lists;
- the composer, fields, menus and tooltips;
- inside an action button;
- the Timer stage. The hourglass is the only illustration there, and no frame, emblem or corner sits near it.

Each region has at most one focal ornament. Ornament stays at least 8 px from text, and it is always decorative and hidden from assistive technology.

## Ornament symbols

Every symbol in `ornaments.svg` was hand-written as SVG path data for this project on 2026-11-17. None comes from an icon library, a font or generated art, so no licence or attribution applies. The Project Buddy repository's own licence covers them.

| Symbol | Drawing |
| --- | --- |
| `orn-corner` | A short inner bracket, a pen dot and a slim gilt lozenge where the inner keyline turns. The keyline itself draws the corner's arms |
| `orn-divider` | A gilt lozenge between two sepia rings, with hairline tails |
| `orn-heading` | A gilt finial over a short guide line |
| `orn-band` | A hairline over a dotted line of sand, broken by a small gilt lozenge every 48 units |
| `orn-emblem` | The hourglass with gilt sand in a double roundel, with gilt lozenges at the four quarters |
| `orn-swatch` | A paired keyline frame with gilt lozenge corners and a small hourglass with gilt sand |
| `orn-portrait` | A sepia hairline outside a gilt rule, with gilt lozenges at the corners and the middle of each side. It stays within the outer 3.6% of the frame |
| `orn-bullet` | The finial lozenge |
| `orn-rule-end` | Optional. A penwork curl ending in a gilt lozenge |
| `orn-vignette` | Optional. An open codex on a lectern line with a quill across it, and penwork scrolls ending in gilt lozenges |
| `orn-notice` | Optional. A sepia lozenge outline holding a solid gilt finial |

## Type roles

The appearance uses only the self-hosted fonts in `apps/web/src/themes/fonts/`. It adds no font.

| Role | Face | Use |
| --- | --- | --- |
| Display | IM Fell English, regular, 0.01em tracking | The site title, a page's heading, the trail band's title and the sign-in title |
| Headings | Source Serif 4, semibold | Section, card and dialog titles |
| Labels | Source Serif 4, semibold, small capitals, 0.08em tracking, in rubric | The site panel's group labels, chat speakers and dates |
| Initials | IM Fell English, raised, 1.75 times the text size, in rubric | The first letter of the sign-in lede and an empty state's copy |
| Body | Nunito | Controls, field labels, list rows and metadata |
| Conversation | Source Serif 4 | Messages and the composer, as now |
| Actions | Source Serif 4, semibold | Letterpress labels, as now |
| Numerals | Cormorant Garamond | The progress ring's circle number, ability points and tab counts. The Timer's countdown keeps its own token |

IM Fell English replaces Source Serif 4 for display only. It is the Timer's own face, so the page heading and the Timer's phase label match. It has one weight, so the display weight is 400. It is too irregular below about 20 px, so it never sets body text or labels.

The initial is raised rather than dropped. A dropped initial floats to the start of the line, which breaks the centred copy of an empty state.

Nunito stays as the body face. Dense lists and field labels run at 13 to 14 px, where a rounded sans stays the most legible of the available faces. The manuscript voice comes from display type, headings, rubric and ornament.

## Palette roles

The texture is pale and even. Measured in Chromium, its darkest pixel has a relative luminance of 0.614, its mean 0.795 and its lightest 0.926. Every text role below meets 4.5:1 even on the darkest pixel. [`tools/contrast-results.txt`](tools/contrast-results.txt) has every pair.

| Role | Token | Value | Use |
| --- | --- | --- | --- |
| Sepia ink | `--foreground` | `rgb(52 32 18)` | Text; 9.8:1 on the darkest texture pixel |
| Faded ink | `--muted` | `rgb(98 68 40)` | Secondary text; 5.6:1 |
| Keyline | `--line`, `--rule-ink`, `--frame-ink`, `--ornament-ink` | `rgb(134 96 50)` | Rules, frames and the sepia part of ornament; 3.6:1 |
| Iron-gall brown | `--primary` | `rgb(92 55 22)` | Links, selection, the progress arc |
| Ochre | `--accent` | `rgb(122 71 16)` | Accent text; 4.9:1 |
| Rubric | `--rubric` | `rgb(150 50 32)` | Initials and labels; 4.8:1 |
| Gold leaf | `--ornament-accent-ink` | `rgb(171 126 47)` | The gilt part of ornament; 2.9:1 on the mean texture, decorative only |
| Sealing wax | `--danger` | `rgb(128 26 36)` | Errors and destructive actions; 6.4:1 |
| Vellum | `--background` | `rgb(246 229 194)` | The texture's mean colour, under the texture |
| Vellum leaf | `--surface` | `rgb(251 237 205)` | Cards and panels, a little paler than the texture |
| Fresh vellum | `--field`, `--action-paper` | `rgb(255 248 230)` | Fields and paper actions |
| Brass | `--action-fill` with `--on-action` | `rgb(128 80 20)` with `rgb(255 246 226)` | Primary actions; 6.4:1 |
| Header | `--header-ink` with `--header-paper` and `--header-line` | `rgb(49 30 16)` with `rgb(250 232 192)` and gold leaf | The site header; 13.1:1 |

Gold leaf never carries text, because it reaches only 2.9:1. Rubric and sealing wax are both red, so they keep apart in three ways: rubric is an orange vermilion and sealing wax a blue crimson; rubric never marks a message or a state; and an error always has its icon and words.

Surfaces sit on the texture as laid-on leaves: opaque, paler than the page, and bounded by a keyline, never by a heavy shadow.

## Rules and dividers

A rule is a single 1 px keyline in sepia. A free-standing rule ends in a penwork curl and a gilt lozenge at each end. A divider adds the finial lozenge between two rings at its centre. Rules never use dashes, because a dashed outline means keyboard focus and a dashed action border means busy.

## Frames and corners

A frame is a 1 px keyline with a second 1 px keyline 3 px inside it, the hourglass's paired lines. Corners are 2 px, close to Letterpress's square cut.

Panels, dialogs and feature cards carry corner ornaments: a short inner bracket, a pen dot and a slim gilt lozenge where the inner keyline turns. Panels' corners are 1.125 rem, dialogs' 1.25 rem and feature cards' 1.375 rem. Plain cards have none, so a dense page of cards still reads as text first.

## Action buttons

The actions keep Letterpress unchanged in shape: Source Serif 4 labels, 2 px corners, a 1 px keyline, flat surfaces at rest, a warm shadow on hover and a shallow inset when pressed. Brass is burnished ochre, paper is fresh vellum, ink is sepia, and sealing wax moves to a deeper crimson so it never reads as rubric. Actions carry no ornament, so they stay plainly recognizable as the things a user can press.

## Appearance swatch

The swatch ornament is a paired keyline frame with gilt lozenges at its four corners and a small hourglass at its centre, with gilt sand. It shows in Ivory Vellum's own inks on its own texture, whatever the page's appearance. It previews both the material and the Timer the appearance brings.

## Chrome and the hourglass

The chrome echoes the hourglass without competing with it. The header is the hourglass's dark bar with a gold rim and a fine gilt line inside its foot. The band under the trail band is its paired keylines and dotted stream. Neither carries a picture of an hourglass. The hourglass appears in miniature only on quiet surfaces: the empty-state emblem, the sign-in emblem and the swatch. On the Timer page, the illustration is the only drawn thing below the trail band.
