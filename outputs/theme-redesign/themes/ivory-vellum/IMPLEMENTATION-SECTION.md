## Ivory Vellum

Ivory Vellum is the default appearance: theme cookie value `light`, `data-mode="light"`. It moves into the app in the PR's appearance group, after the tokens and components commits. [DIRECTION.md](DIRECTION.md) explains the design; this section lists the work.

### Sources

The prototype's files are the source for this appearance:

- `outputs/theme-redesign/themes/ivory-vellum/tokens.css` holds every token value.
- `outputs/theme-redesign/themes/ivory-vellum/ornaments.svg` holds the 11 ornament symbols.
- `outputs/theme-redesign/themes/ivory-vellum/tools/contrast.py` checks the colour pairs. Its results are in `tools/contrast-results.txt`.

### Checklist

1. Move the light values in `tokens.css` into the app's light theme block in `apps/web/src/themes/`, in the layer the system section names. Keep the Timer tokens and their two `@media` blocks as they are in the app today. The prototype copied them unchanged.
2. Move the token values that the component layer adds, such as `--rubric`, `--frame-inset`, the `--label-*` and `--initial-*` tokens, the ring tokens and the `--orn-*` sizes, into the same block.
3. Add `ornaments.svg` to the app wherever the system section puts appearance sprites. Generate the `--orn-*` image tokens the same way `build.py` does, so the masks match the mockups.
4. Keep `apps/web/public/textures/ivory-vellum.webp` unchanged. The page uses it through `--page-decoration`.
5. Use only the fonts the app already self-hosts: IM Fell English, Source Serif 4, Nunito, Cormorant Garamond and JetBrains Mono. The appearance adds no font file.
6. Record the swatch change in `docs/appearance.md`, as the next section describes.
7. Apply Autumn's decisions on the open choices in [DIRECTION.md](DIRECTION.md#choices-awaiting-autumn). Each is a token change.

### Swatch change

`docs/appearance.md` says each swatch shows only its texture, with no overlays. On 2026-11-17, Autumn asked for each swatch to carry its appearance's ornament. The Ivory Vellum swatch now draws a paired keyline frame, gilt lozenge corners and a small hourglass with gilt sand over its own texture, in its own inks, whatever the page's appearance.

The rest of the swatch rules stay: native radios named by the appearance, a solid selection outline, a separate dashed focus outline, tooltips, 44 px targets and the compact row at 320 px. The ornament is decorative and hidden from assistive technology.

### Checks before merging

The PR must pass these checks for Ivory Vellum:

- Every text pair in `tools/contrast-results.txt` meets 4.5:1 on the texture's darkest pixel and on every surface. Keylines and focus meet 3:1. The header's focus outline is the one gap; see [Risks](#risks).
- Each view in the prototype matches the app at 1280 px and 360 px, in the light appearance. The prototype's screenshots are in `outputs/theme-redesign/themes/ivory-vellum/evidence/`.
- No page scrolls sideways at 320 px or 360 px.
- With reduced motion on, nothing in the appearance moves. Ivory Vellum adds no animation.
- The Timer page shows only the hourglass below the trail band: no corners, emblem or vignette.

### Risks

- **Focus in the header.** The header has no focus colour of its own, so `--focus` (iron-gall brown) lands on the dark header ink at 1.9:1. The PR must give the header a focus colour, such as gold leaf (`--header-gold`, 6.5:1), before merging.
- **Two pictures in empty states.** With both `--orn-vignette-width` and `--orn-emblem-size` set, an empty state shows the vignette over the emblem. If Autumn keeps the vignette, the component layer needs a way to hide the emblem under it.
- **Old-style figures in tab counts.** Cormorant Garamond shows old-style figures unless asked otherwise, so a 12 px zero reads like a letter o. Adding `lining-nums` to the tab count's `font-variant-numeric` fixes it.
- **IM Fell English at small sizes.** The trail band's title sets IM Fell English at 20 px, the smallest size where it stays clear. Don't lower `--header-title-size` while the display face is IM Fell English.
- **Mask alignment.** Corner masks land on whole and half pixels differently at each corner. The prototype's corner draws no arm of its own and lets the frame's keyline draw it, so mirrored corners can't double the line. Keep that if the corner is redrawn.
