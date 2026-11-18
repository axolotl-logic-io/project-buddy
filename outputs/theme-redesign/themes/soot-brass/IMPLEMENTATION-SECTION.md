## Soot & Brass

Soot & Brass is the dark burgundy appearance: theme cookie value `soot-brass`, `data-mode="soot-brass"`. It moves into the app in the PR's appearance group, after the tokens and components commits. [DIRECTION.md](DIRECTION.md) explains the design; this section lists the work.

### Sources

The prototype's files are the source for this appearance:

- `outputs/theme-redesign/themes/soot-brass/tokens.css` holds every token value.
- `outputs/theme-redesign/themes/soot-brass/ornaments.svg` holds the 11 ornament symbols, including all three optional ones.
- `outputs/theme-redesign/themes/soot-brass/tools/draw_ornaments.py` writes `ornaments.svg`. To change a symbol, edit the script and run it, rather than editing the SVG by hand.
- `outputs/theme-redesign/themes/soot-brass/evidence/texture-contrast.mjs` checks the colour pairs against the real texture in Chromium. Its input is `evidence/palette.json`, and its results are in `evidence/texture-contrast.json`.

### Checklist

1. Move the colour, type, shape and site panel values in `tokens.css` into the app's `soot-brass` block in `apps/web/src/themes/parchment.css`, in the layer the system section names.
2. Keep the Timer tokens as they are. The prototype copied them unchanged from `parchment.css`, so the Gothic hour dial looks the same.
3. Move the token values that the component layer adds into the same block. These are the display, label, numeral and initial tokens, the ornament inks, the rule and frame tokens, the three decoration layers, the ring tokens and the `--orn-*` sizes.
4. Add `ornaments.svg` to the app wherever the system section puts appearance sprites. Generate the `--orn-*` image tokens the same way `build.py` does, so the masks match the mockups.
5. Keep `apps/web/public/textures/soot-brass.webp` unchanged. The page uses it through `--page-decoration`.
6. Use only the fonts the app already self-hosts. Soot & Brass uses Source Serif 4, Cormorant Garamond and JetBrains Mono, and the Timer keeps IM Fell English and UnifrakturMaguntia. The appearance adds no font file.
7. Record the swatch change in `docs/appearance.md`, as the next section describes.
8. Apply Autumn's decisions on the open choices in [DIRECTION.md](DIRECTION.md#choices-awaiting-autumn). Each is a token change, listed with its approved value.

### Swatch change

`docs/appearance.md` says each swatch shows only its texture, with no overlays. On 2026-11-17, Autumn asked for each swatch to carry its appearance's ornament. The Soot & Brass swatch now draws a small hour dial over its own texture: a brass ring, an inner hairline ring, eight ticks, a chapter mark at each quarter and a gilt lozenge at twelve. The centre stays open, so the leather shows. It uses its own inks, whatever the page's appearance.

The rest of the swatch rules stay: native radios named by the appearance, a solid selection outline, a separate dashed focus outline, tooltips, 44 px targets and the compact row at 320 px. The ornament is decorative and hidden from assistive technology.

### Checks before merging

The PR must pass these checks for Soot & Brass:

- Every text pair meets 4.5:1, and keylines and focus meet 3:1, on the texture and on every surface. The texture is dark, so light text is measured against its lightest pixel, rgb(95 62 64), not its darkest. The interface's rule names the darkest pixel, which suits the light appearances only. The worst text pair is primary on the lightest pixel, at 4.66:1. The worst keyline is line on the lightest pixel, at 3.26:1.
- Each view in the prototype matches the app at 1280 px and 360 px. The prototype's screenshots are in `outputs/theme-redesign/themes/soot-brass/evidence/`: one file per view, with 1280 px on the left and 360 px on the right, and the specimen's Soot & Brass section at each width.
- No page scrolls sideways at 320 px or 360 px. Each collection's tab strip scrolls within itself at these widths, as it does in every appearance.
- With reduced motion on, nothing in the appearance moves. Soot & Brass adds no animation; only the dial's marks change, and the Timer already handles reduced motion.
- The running Timer shows only the dial below the trail band: no corners, emblem or vignette near it.

### Risks

- **Body face.** If Autumn keeps Nunito for body text, set `--body-font` back to `var(--typeface-nunito)`. Labels, headings and actions stay in Source Serif 4, so a page mixes two text faces, as it does today.
- **Texture contrast margin.** Primary and danger text reach 4.66:1 and 4.71:1 on the texture's lightest pixel. Both still pass. In the mockups, only muted and ivory text sits straight on the leather, so brass and danger text never meet the texture's lightest grain.
- **Corner size at 360 px.** Panel corners are 1.5 rem. They sit on the frame's outer edge and fit the page margin at 360 px. A narrower margin would crowd them. To shrink them, change `--orn-corner-panel-size`.
