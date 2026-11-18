# Soot & Brass direction

Soot & Brass is Gothic horology: a clock case of muted brass on a burgundy book cover. Its timer is the Gothic hour dial, a ring of twelve pointed chapter marks in brass. The site's chrome borrows the dial's vocabulary of pointed arches, chapter marks and tracery. The chrome uses that vocabulary at rest, small and in muted brass, so the dial stays the only moving, bright and circular thing on the page.

## Motifs

Every ornament comes from four shapes, all present in the hour dial (`apps/web/src/components/timer/timer-dial.tsx`):

- **The pointed arch.** The dial's chapter mark is a small gable with two legs. The chrome draws it as a lancet arch: the heading mark, the notice marker, the header's blind arcade and the hood mould over the empty state.
- **The chapter lozenge.** The dial fills a small diamond at each mark it has passed. The chrome uses the same lozenge as its bullet, its accent point and its rule ends.
- **Tracery.** A quatrefoil, cusped openings and a rose window. They appear in the divider and the rose-window emblem. They come from Gothic stonework rather than from the dial, so they never read as a second clock.
- **The ring.** Only two ornaments are round: the dial itself and the swatch, which previews the dial. No other chrome draws a circle, because a second ring would compete with the timer.

## Ornament density

Ornament goes where the page has a start, an end or a frame:

- under the trail band, as a blind arcade of pointed arches;
- before a section heading, as one chapter-mark arch;
- at the four corners of a panel, a dialog and the sign-in card, as arch spandrels;
- in the middle of a section divider, as a quatrefoil in a lozenge;
- at the centre of an empty state, as a Gothic hood mould over the rose window;
- above the sign-in title, as the rose window alone;
- on a notice's start bar, as a small solid lancet with a gilt lozenge;
- around a construct's portrait, as a brass bezel;
- on the appearance swatch, as a small hour dial.

Ornament must not go inside dense or working areas:

- **Lists.** The quest list, task rows, the Spellbook list, the spell editor's reply list and row action menus have plain hairline separators and no corners. A list of twenty rows with corner pieces would read as noise.
- **Conversation.** Messages in a conversation keep a plain frame. A construct's reply may use the lozenge bullet for its list items, which is the smallest ornament in the set.
- **Controls.** The composer, every field, every button and every tooltip carry no ornament beyond their keyline.
- **The Timer page.** The dial is the page's ornament. The trail band keeps its arcade, but the page adds no emblem, divider or corners near the dial.

A page has at most one emblem. Corners appear on the outermost frame only: a card inside a panel has a plain keyline. Panels and dialogs take 1.5 rem corners, the sign-in card takes 1.75 rem corners, and plain cards take none.

## Type roles

Every face is already self-hosted in `apps/web/src/themes/fonts/`. No new font is needed.

| Role | Face | Why |
| --- | --- | --- |
| Display (site title, page heading, sign-in title) | Cormorant Garamond, semibold, tracked 0.02 em | Its tall, sharp serifs suit engraved clock lettering. It is already the dial's numeral face, so headings and the countdown share one voice. |
| Headings (section, card, header title) | Source Serif 4, semibold | Cormorant is too light below about 24 px on a dark, grained ground. Source Serif 4 holds its strokes at 16 to 20 px. |
| Body, controls and labels | Source Serif 4 | See the next paragraph. |
| Numerals | Cormorant Garamond in the timer; Source Serif 4 tabular lining figures for counts and dates | The countdown keeps its approved face. Counts in tabs and badges need tabular figures at small sizes. |
| Code | JetBrains Mono | Unchanged. |

The body face changes from Nunito to Source Serif 4 in this appearance only. Nunito's rounded terminals belong to a friendly app, not a clock case, and they sit badly beside pointed arches. Source Serif 4 is already the site's conversation and action face, so the change makes one face carry nearly all reading text. It has optical sizes and a sturdy weight, so it stays legible at 13 px in dense lists. Small labels, such as a chat speaker's name or a site panel group label, use Source Serif 4 small capitals tracked 0.06 em.

## Palette roles on the texture

The texture is a very dark burgundy leather. Sampled in Chromium, its median is rgb(45 15 18). Its lightest 8 px block is rgb(67 28 30), and its single lightest pixel is rgb(95 62 64). Because the texture is so dark, ivory and brass inks have wide headroom. Every ratio below is the worst case, against the texture's lightest pixel.

| Role | Value | Use | Worst ratio |
| --- | --- | --- | --- |
| foreground | rgb(238 228 210) | Ivory text | 7.4 |
| muted | rgb(206 192 166) | Secondary text | 5.2 |
| primary, action-fill | rgb(208 180 122) | Brass: links, the main action, the timer arc | 4.7 |
| rubric | rgb(226 196 132) | Gilt: initials, accent ornament | 5.5 |
| danger | rgb(236 168 148) | Sealing wax text | 4.7 |
| line, rule-ink, frame-ink | rgb(172 150 108) | Muted brass keylines | 3.3 (needs 3) |
| header-line | rgb(150 128 90) | The rule under the site header | 4.7 on the header |
| ornament-ink | rgb(170 145 98) | Main ornament ink | 3.1 (decorative) |
| ornament-accent-ink | the rubric | Lozenges and quatrefoils | 5.5 |

The rubric is gilt, not red. A red letter on burgundy leather has almost no contrast, and it would be confused with danger. On a clock face the chapter numerals are gilt, so gilt plays the rubric's part here.

The opaque surfaces are soot with a burgundy cast, darker than today's grey charcoal: surface rgb(37 29 32), field rgb(24 19 21), and the trail band rgb(50 33 38). They make the brass keylines read as metal set into a dark case. Every text and action pair passes on each surface: on-action on Brass is 8.2:1, and ivory on the paper action is 13.1:1. The full results are in `evidence/texture-contrast.json`, and `evidence/texture-contrast.mjs` reproduces them.

## Rules and dividers

A rule is a 1 px hairline in the line ink. A section divider is a hairline on each side of the quatrefoil lozenge. List rows use the same hairline with no glyph. Where a rule ends in open space, such as under the sign-in title, it may end in a lozenge finial (`orn-rule-end`). There are no double rules between content, because the frame already carries the double line.

## Frames and corners

A frame is a clock case's bezel: a 1 px muted brass border, then a 3 px gap of surface, then a 1 px inner keyline. Corners are nearly square, with a 3 px radius, to match pointed rather than rounded forms. The arch spandrel sits in each corner across both lines, with a gilt lozenge in its pocket. Fields and controls keep a 2 px radius and a single keyline.

## Action buttons

The buttons extend Letterpress and keep all of its rules: Source Serif 4 semibold labels, 2 px corners, a 1 px keyline, flat resting surfaces, a warm hover shadow, a shallow inset when pressed, a dashed busy boundary and a separate dashed focus outline.

- **Brass** is a filled plate of brass with soot-dark text. Its keyline is a darker brass, so the plate looks engraved rather than printed.
- **Paper** is the soot surface with a brass keyline and ivory text.
- **Ink** is ivory text with a resting underline.
- **Sealing wax** fills with the danger colour and dark text. Its quiet form is danger-coloured text with an underline.

Buttons carry no ornament. The dial's marks belong to the chrome around a form, not to the controls inside it.

## Swatch ornament

The Soot & Brass swatch shows the hour dial in small over the burgundy texture. It has a brass ring, an inner hairline ring, eight chapter ticks, a pointed chapter mark at each quarter and a gilt lozenge at twelve. The centre stays open, so the texture shows through. It always uses this appearance's inks, whatever the page's appearance. The ornament is decorative and hidden from assistive technology. The swatch keeps its native radio, solid selection outline, dashed focus outline and tooltip.

## The chrome and the hour dial

The chrome echoes the dial in three ways and stays apart from it in three ways.

The chrome echoes the dial through:

- its shapes, the pointed chapter mark and the lozenge;
- its inks, muted brass for lines and gilt for points;
- its type, Cormorant Garamond for display, as in the countdown.

The chrome stays apart from the dial because:

- **It has no circles.** Only the dial and its swatch preview are round.
- **It is dim.** Ornament uses the muted line ink, while the dial's passed marks use bright ivory and its arc uses full brass.
- **It is still.** Ornament never animates. Only the dial's marks change, and they follow reduced motion.

## Ornament symbols and sources

Every symbol in `ornaments.svg` is hand-written geometry, drawn on 2026-11-17 by the Soot & Brass thread with `tools/draw_ornaments.py`. No symbol comes from an icon library, a font or image generation, so no third-party licence applies. The shapes follow the chapter mark and lozenge in `apps/web/src/components/timer/timer-dial.tsx`, which is the project's own code.

| Symbol | viewBox | Drawing | Accent ink |
| --- | --- | --- | --- |
| `orn-corner` | 24 × 24 | Two arms along the frame and an arch spandrel | A lozenge in the spandrel's pocket |
| `orn-divider` | 48 × 24 | A lozenge outline with ticks at each side | A quatrefoil in the lozenge |
| `orn-heading` | 16 × 16 | A lancet arch with legs, like the dial's chapter mark | A lozenge under the apex |
| `orn-band` | 12 × 8 | One bay of a blind arcade; the bays join into a row | A lozenge in each bay |
| `orn-emblem` | 48 × 48 | A rose window: two rings, eight cusped openings and eight ticks | A quatrefoil at the centre |
| `orn-swatch` | 64 × 64 | A small hour dial: two rings, eight ticks and four chapter marks, open at the centre | A large lozenge at twelve and small ones at the other quarters |
| `orn-portrait` | 100 × 100 | A two-line bezel with corner lozenges, within the outer 4% | A lozenge at the middle of each side |
| `orn-bullet` | 8 × 8 | The dial's tall marker lozenge | None (the bullet has one ink) |
| `orn-rule-end` | 24 × 8 | A lozenge finial on the rule's end; the build mirrors it | A dot in the finial |
| `orn-vignette` | 120 × 52 | A hood mould with crockets and a finial, flanked by rules. It is open at the foot, so the emblem below it reads as a rose window under a gable | The finial and the rule ends |
| `orn-notice` | 12 × 12 | A solid lancet plaque. It is filled because it sits over the notice's brass start bar | A lozenge in the plaque |

`tools/preview_ornaments.mjs` renders the set on the texture at its slot sizes; `evidence/ornaments.png` is its output.

## Choices awaiting Autumn

This direction proposes three changes from the approved Soot & Brass values. The built mockups use the proposals. To switch one back, change the lines listed below in `tokens.css`; each is also marked "Awaiting Autumn" there.

| Choice | Proposed value | Approved value today |
| --- | --- | --- |
| Body face | `--body-font: var(--typeface-source-serif-4)` | `--body-font: var(--typeface-nunito)` |
| Darker soot surfaces | surface and action-paper rgb(37 29 32), field rgb(24 19 21), code-surface rgb(33 26 29), navigation-surface rgb(40 29 33), trail-surface rgb(50 33 38), sidebar-surface rgb(42 33 36), secondary-surface rgb(58 42 46) | surface and action-paper rgb(41 36 38), field rgb(25 23 25), code-surface rgb(36 29 32), navigation-surface rgb(41 30 34), trail-surface rgb(52 36 40), sidebar-surface rgb(45 37 40), secondary-surface rgb(59 45 48) |
| Gilt rubric | `--rubric: rgb(226 196 132)`, also used as `--ornament-accent-ink` | No rubric: the default `--rubric: var(--accent)`, rgb(194 181 155) |

Each choice is independent. Every contrast pair passes AA with either value: the approved surfaces are close in lightness to the proposed ones, and the approved rubric is the accent colour, which reaches 7.5:1 or more on either surface.
