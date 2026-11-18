# Theme redesign brief

This brief is shared by every thread that works on the theme redesign. Read it before you start. Autumn (the site owner) asked for this work on 2026-11-17. It lives on the branch `t3/theme-redesign-mockups` in `/Users/axolotl-logic/workspace/project-buddy`. Do not push or switch branches. In the main checkout, the coordinating thread commits each thread's work when it arrives, so don't commit there. A thread in its own worktree commits on its worktree branch as each piece of work is ready, and the coordinating thread merges that branch.

## Goal

Autumn is assessing options for a redesign of the site's three appearances. The work produces realistic HTML mockups of the site's critical views in each appearance. The mockups are built from the real rendered HTML of the site and from real and proposed CSS classes, so that a developer can move from prototype to production with little translation.

The redesign adds one consistent design language: a small set of core components with standard styles. Later feature work drops these components in place instead of inventing new styles.

## Appearances and their timers

Each appearance should match the ornateness and style of its timer illustration. Read `docs/appearance.md`, `docs/timer.md` and `apps/web/src/components/timer/` to see each timer.

| Appearance | Texture (do not change) | Timer | Direction |
| --- | --- | --- | --- |
| Ivory Vellum (default, `light`) | `public/textures/ivory-vellum.webp` | The scribe's hourglass, sepia ink, golden sand | A scribe's illuminated manuscript: sepia ink, gold leaf, rubrication, fine keylines, scholarly calm |
| Soot & Brass (`soot-brass`) | `public/textures/soot-brass.webp` | Gothic hour dial, pointed chapter marks, muted brass on burgundy | Gothic horology: tracery, pointed arches, chapter marks, clockwork brass on a burgundy book cover |
| Espresso Leather (`dark`) | `public/textures/espresso-leather.webp` | Necromantic seal, blackletter phase label, warm brass and ivory | A necromancer's grimoire: seals, sigils, blackletter rubrics, tooled leather, candle-warm brass |

## Delivery as one pull request

Autumn plans to move the chosen design into the app in a single pull request (PR). Write `IMPLEMENTATION.md` as one PR's plan, not a series of small PRs. Give an ordered checklist of the changes inside that PR. Group the changes so a reviewer can follow them commit by commit: tokens, then components, then each appearance, then views, then docs and tests. Say which checks and screenshot comparisons the PR must pass before merging. Name the risks of landing everything at once, and how the PR limits them.

## Appearance swatches

Autumn asked on 2026-11-17 that each appearance's swatch, in the site panel and in Settings, carry ornament like its theme. Each swatch keeps its texture, but now adds that appearance's ornament: a frame, corner pieces or an emblem from its own ornament set. Examples are an hourglass or gilt corners for Ivory Vellum, tracery or a chapter-mark dial for Soot & Brass, and a seal or sigil for Espresso Leather. Show each swatch in its own appearance's colors, whatever the page's current appearance is, so it previews that appearance.

This changes the approved design in `docs/appearance.md`, which says swatches show only their texture, with no overlays. Record the change in `IMPLEMENTATION.md`. Keep the rest of the swatch rules:

- native radios named by the appearance;
- a solid outline for selection and a separate dashed outline for focus;
- tooltips;
- targets at least 44 px;
- the compact row at 320 px.

The ornament is decorative and hidden from assistive technology. Each appearance thread draws its own swatch ornament. The system thread defines the swatch component and its ornament slot.

## Constraints

- Do not change, recolor, crop, regenerate or replace the three background textures. They were generated, and they stay as they are. Style everything around them.
- Do not use image generation. Ornament comes from icon libraries and hand-written SVG. Lucide is already a dependency (`lucide-react`). You may propose other permissively licensed icon sets, such as Phosphor (MIT) or game-icons.net (CC BY 3.0, needs attribution on the Credits page). Record the license of anything you propose.
- Use the self-hosted fonts in `apps/web/src/themes/fonts/` where possible: Source Serif 4, IM Fell English, Cormorant Garamond, UnifrakturMaguntia, Nunito and JetBrains Mono. If you propose another font, it must be under the SIL Open Font License, and you must say why the existing fonts don't suffice.
- Keep every component's accessible behavior: 44 px touch targets, a dashed keyboard focus outline separate from selection, WCAG AA contrast, reduced motion, the 320 px phone fit. See `docs/button-system.md` for the current action language (Letterpress), which the redesign should extend rather than discard unless there is a stated reason.
- Components choose semantic roles, never palette colors. Themes set token values and ornament assets only. This rule is in `apps/web/src/themes/contract.css` and `docs/project-practices.md`.
- Use the domain words in `GLOSSARY.md` in all copy.
- Follow the writing style in `/Users/axolotl-logic/workspace/CLAUDE.md` and `docs/docs-style-guide.md` for any Markdown you write.

## Generated images

The only generated raster images besides the textures are the construct artwork for Lumen and Vellum (`apps/web/public/constructs/lumen-v1*.{png,webp}` and `vellum-v1*`). Propose replacements made from SVG and icon-library parts, one treatment per appearance or one that themes itself through tokens. The app icons in `public/icons/` are already rendered from `app-icon.svg`; they are not generated, but they may be restyled if that helps the design language.

## Output layout

All work goes under `outputs/theme-redesign/`:

| Path | Contents | Owner |
| --- | --- | --- |
| `BRIEF.md` | This file | Coordinator |
| `capture/` | Real rendered HTML, screenshots and the class inventory of each critical view, in each current appearance | Capture thread |
| `system/` | The proposed token additions, the core component CSS, and the component catalogue that maps current classes to proposed ones | System thread |
| `themes/<appearance>/` | That appearance's token values, ornament SVG sprite, notes and evidence screenshots | One thread per appearance |
| `artwork/` | Proposed replacements for the construct artwork | Artwork thread |
| `views/` | Built mockup pages, one per critical view, with an appearance switcher | Built by `build.py` |
| `build.py` | Builds `views/` and `index.html` from capture, system and themes, inlining fonts, textures and SVG, like `outputs/light-timer-alternatives/build.py` | System thread |
| `index.html` | A gallery that compares current and proposed views across the three appearances | Built by `build.py` |
| `IMPLEMENTATION.md` | How to move each component and theme from prototype to the app | System thread, then each theme thread adds its section |
| `reviews/` | Review reports | Review threads |

Each thread writes only in the paths it owns. If you need a change in a path you don't own, say so in your final report.

## Critical views

Mock up each of these at 1280 px and 360 px wide, and in all three appearances:

1. Sign in (signed out).
2. Quests list, the signed-in home, with the left site panel open on desktop.
3. A quest workspace: the conversation with a construct (messages, construct avatar, composer, a command reply), its tasks and its Quick Notes.
4. The Spellbook list, and the spell editor with its fields and reply list.
5. The Timer: setup, and a running timer with its illustration.
6. Settings with the ornamented appearance swatches (see Appearance swatches), the same swatches in the site panel, and Profile with experience and circles. Show the swatch states: resting, selected, keyboard focus and tooltip.
7. Overlays: a destructive confirmation dialog, a row action menu, and the phone drawer.
8. States: an empty list, a notice or form error, and a loading construct reply.

## Evidence

Look at every screenshot you cite before you rely on it. Save screenshots inside your owned path. State any view, width or appearance you could not cover.
