## Espresso Leather

Espresso Leather is the dark appearance: theme cookie value `dark`, `data-mode="dark"`. It moves into the app in the PR's appearance group, after the tokens and components commits. [DIRECTION.md](DIRECTION.md) explains the design; this section lists the work.

### Sources

The prototype's files are the source for this appearance:

- `outputs/theme-redesign/themes/espresso-leather/tokens.css` holds every token value.
- `outputs/theme-redesign/themes/espresso-leather/ornaments.svg` holds the 11 ornament symbols.
- `outputs/theme-redesign/themes/espresso-leather/tools/contrast.py` reads `tokens.css` and checks 125 colour pairs. Its results are in `tools/contrast-results.txt`.
- `outputs/theme-redesign/themes/espresso-leather/tools/sample-texture.mjs` gave the texture samples that `contrast.py` uses.

### Checklist

1. Move the dark values in `tokens.css` into the app's dark theme block in `apps/web/src/themes/`, in the layer the system section names. Keep the Timer tokens as they are in the app's Espresso Leather block in `parchment.css` today. The prototype copied them unchanged: the necromantic seal, the sigils, the inscriptions and the blackletter phase label.
2. Move the token values that the component layer adds, such as `--rubric`, `--frame-inset`, the `--label-*` and `--initial-*` tokens, the ring tokens and the `--orn-*` sizes, into the same block.
3. Add `ornaments.svg` to the app wherever the system section puts appearance sprites. Generate the `--orn-*` image tokens the same way `build.py` does, so the masks match the mockups. The sprite draws the left rule end only; the build mirrors it for the right end and mirrors the corner for the other three corners.
4. Keep `apps/web/public/textures/espresso-leather.webp` unchanged. The page uses it through `--page-decoration`.
5. Use only the fonts the app already self-hosts: IM Fell English, UnifrakturMaguntia, Source Serif 4, Cormorant Garamond and JetBrains Mono. The appearance adds no font file.
6. Record the swatch change in `docs/appearance.md`, as the next section describes.
7. Apply Autumn's decisions on the open choices in [DIRECTION.md](DIRECTION.md#choices-awaiting-autumn). Each is a token change.

### Swatch change

`docs/appearance.md` says each swatch shows only its texture, with no overlays. On 2026-11-17, Autumn asked for each swatch to carry its appearance's ornament. The Espresso Leather swatch now draws the timer's seal over its own texture: a blind keyline with gilt corner diamonds, the seal's circle, square and diamond, and a gilt spark at the centre. It uses its own inks, whatever the page's appearance.

The rest of the swatch rules stay: native radios named by the appearance, a solid selection outline, a separate dashed focus outline, tooltips, 44 px targets and the compact row at 320 px. The ornament is decorative and hidden from assistive technology.

### Checks before merging

The PR must pass these checks for Espresso Leather:

- Every text pair in `tools/contrast-results.txt` meets 4.5:1 on the texture's brightest pixel and on every surface. Lines, frames, ornament and focus meet 3:1, and focus on the header ink is 12.88:1. Rerun `contrast.py` after any colour change; it reads `tokens.css` directly.
- Each view in the prototype matches the app at 1280 px and 360 px, in the dark appearance. The prototype's screenshots are in `outputs/theme-redesign/themes/espresso-leather/evidence/`.
- No page scrolls sideways at 320 px or 360 px.
- With reduced motion on, nothing in the appearance moves. Espresso Leather adds no animation; the hover glow is a static shadow.
- The Timer page shows only the seal below the trail band: no corners, emblem or vignette.
- The blackletter appears only in the timer's phase label and in initials.

### Risks

- **Initial spacing.** The initial's only gap is the component rule's `0.08em` padding. UnifrakturMaguntia capitals overhang their box, so some letters nearly touch the next one. A `--initial-gap` token would let this appearance widen the gap to about 0.15em.
- **Thin labels.** Most small labels (**Current quest**, menu labels and list dates) are set at weight 400, and no token changes that. This appearance moved labels to Source Serif 4 to stay readable. A `--label-weight` token would let a future appearance use a lighter face at 500 or 600.
- **Old-style figures in tab counts.** Cormorant Garamond shows old-style figures unless asked otherwise, so a 12 px zero reads like a letter o. Adding `lining-nums` to the tab count's `font-variant-numeric` fixes it.
- **Two pictures in empty states.** With both `--orn-vignette-width` and `--orn-emblem-size` set, an empty state shows the grimoire and candle over the seal. This is intended on a full page, but the quest sidebar's narrow empty state shows both too, and they crowd it. The component layer needs a way to show the emblem alone there.
- **Wrong Timer values in the template.** `themes/_template/espresso-leather/tokens.css` holds Ivory Vellum's Timer values, not the seal's. This appearance's `tokens.css` has the right ones. Copy the Timer tokens from the app or from this file, never from the template.
- **Corner alignment.** The corner's bracket deliberately lies over the frame's border and the short fillet over its keyline. The bracket is 2.5 units wide so that half-pixel shifts at mirrored corners still cover the border. If `--frame-inset` or `--frame-width` changes, redraw the fillet to match.
