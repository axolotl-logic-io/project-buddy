# Construct artwork v2

This folder replaces the raster art for the built-in constructs Lumen and Vellum. The new art is hand-written SVG that takes its colors from the active appearance. Each construct has a full drawing for portraits and openings, and an avatar cut for the 32 and 40 px avatars.

The artwork thread drew everything here on 2026-11-17. Nothing in this folder ships yet. [Ship the artwork](#ship-the-artwork) lists the changes the app needs.

## Files

| File | What it is |
| --- | --- |
| `lumen.svg` | Lumen's full drawing, on a 256-unit board. |
| `lumen-avatar.svg` | Lumen's avatar cut, on a 64-unit board. |
| `vellum.svg` | Vellum's full drawing, on a 256-unit board. |
| `vellum-avatar.svg` | Vellum's avatar cut, on a 64-unit board, viewed through `6 6 52 52`. |
| `construct-art.css` | The paint roles: maps each shape's class to a `--construct-*` custom property. |
| `specimen.html` | Both constructs at 32, 40, 64, 224 and 264 px in each appearance, on the real textures, beside the current raster art. It opens from disk. |
| `evidence/` | Playwright screenshots of the specimen. |
| `src/draw.py` | Writes the four SVG files. |
| `src/specimen.py` | Writes `specimen.html`. |
| `src/shoot.mjs` | Takes the screenshots in `evidence/`. |

Each SVG embeds `construct-art.css` in a `<style>` element, so it also renders correctly when opened on its own. In the app, the shared stylesheet takes over and the embedded copy goes away.

## Design

### Lumen

Lumen is "a crackling mote of arcane light inside a ring of turning runes". The drawing reads as a manuscript sun. A round, smiling orb sits at the centre. Eight straight rays alternate with eight zigzag bolts, which carry the crackle without turning into noise.

A broad brass band holds the runes. Twelve hand-drawn glyphs repeat around it, and four red jewels mark the quarters; the top jewel is the largest. Two tilted rings cross behind and in front of the orb, so the runes turn like a gyroscope. Faint motes and dashed orbit trails fill the night behind it.

### Vellum

Vellum is "a calm clockwork cartographer". It is a small brass automaton with a domed head, two lens eyes and a gentle smile. A compass rose sits on its chest plate, with the north point in red.

Vellum holds a quill in one hand and a rolled map with a red ribbon in the other. Shoulder gears and riveted plates make it clockwork. Behind it, a faint map margin shows a graticule, two coastlines, three hatched hills, a dotted route to an X and a small compass rose.

### Avatar cuts

At 32 and 40 px, a crop of the full drawing loses the face. In Lumen's crop, the gyroscope rings cross the face. In Vellum's crop, the head is too small and the gears blur. Each construct therefore has a separate avatar cut, drawn for small sizes:

- **Lumen's cut** keeps the orb, face, brass band and four jewels, with heavier strokes. It drops the runes, gyroscope rings and bolts.
- **Vellum's cut** is head and shoulders. It keeps the dome, lenses, smile and the top of the compass rose.

The specimen shows the crop as "Not chosen", so the comparison stays visible.

### Fine detail

Shapes with the class `fine` are texture: hatching, motes, map margins, rune ticks and the quill's barbs. When the drawing's container is 96 px wide or less, a container query hides them. The 64 px portrait in the specimen shows the effect.

## Paint roles

Nothing in the SVG markup names a color. Each shape carries a fill class (`f-*`) and a stroke class (`s-*`), and gradient stops carry `st-*` classes. `construct-art.css` maps each class to a paint role.

An appearance sets the roles as `--construct-*` custom properties. Each role falls back to an existing token, so the art still renders in an appearance that sets none of them. The specimen's last row in each appearance shows that fallback.

| Role | What it paints | Fallback | Ivory Vellum (`light`) | Soot & Brass (`soot-brass`) | Espresso Leather (`dark`) |
| --- | --- | --- | --- | --- | --- |
| `--construct-ground` | The portrait's backdrop | `--field` | `rgb(251 239 213)` | `rgb(60 29 36)` | `rgb(40 27 18)` |
| `--construct-ground-ink` | Backdrop detail: coastlines, routes, motes | `--line` | `rgb(150 112 64)` | `rgb(160 116 108)` | `rgb(132 98 64)` |
| `--construct-ink` | Outlines, eyes, runes | `--header-ink` | `rgb(58 36 18)` | `rgb(28 19 21)` | `rgb(32 20 11)` |
| `--construct-metal` | The lit face of brass | `--header-gold` | `rgb(214 168 74)` | `rgb(200 174 120)` | `rgb(218 168 88)` |
| `--construct-metal-shade` | The shadowed face of brass | metal mixed 58% with ink | `rgb(150 104 42)` | `rgb(128 104 68)` | `rgb(140 96 44)` |
| `--construct-metal-light` | Polish highlights | metal mixed 45% with paper | `rgb(250 230 164)` | `rgb(238 224 186)` | `rgb(248 220 160)` |
| `--construct-paper` | Map paper, the quill, the compass plate | `--header-paper` | `rgb(255 249 230)` | `rgb(230 219 196)` | `rgb(240 225 196)` |
| `--construct-glow` | Lumen's light, Vellum's lenses | metal | `rgb(230 166 48)` | `rgb(234 200 132)` | `rgb(248 188 92)` |
| `--construct-glow-core` | The hottest centre of a light | paper | `rgb(255 251 232)` | `rgb(255 247 226)` | `rgb(255 245 218)` |
| `--construct-accent` | Jewels, the compass's north, the map ribbon | `--rubric`, then `--accent` | `rgb(160 44 28)` | `rgb(158 40 46)` | `rgb(164 48 32)` |

The values are a proposal. The appearance threads own the final values.

Three rules keep the art legible in every appearance:

- Ink is always dark, even on a dark appearance, because ink only draws over metal, paper and light. The `--header-ink` fallback stays dark in all three modes for the same reason.
- The ground follows the page, so the portrait sits on the texture rather than as a pale card on dark leather.
- Accent appears in small marks only, so one red reads as a rubric rather than a second palette.

### Role resolution

`construct-art.css` declares an intermediate `--ca-*` property for each role on the drawing's root, `.construct-art`. The fallbacks therefore resolve on the drawing itself. A panel with its own `data-mode` gets its own values.

Gradient stops resolve `var()` where the gradient is defined, not where it is used. When two copies of a drawing sit on one page, each copy needs its own gradient ids. In React, the ids come from `useId`, as in `timer-dial.tsx`. The specimen adds a suffix per copy.

## Frame model

The visual model (see [Construct visuals](../../../docs/construct-visuals.md)) stores an asset reference and optional frames per role. Each frame is `{x, y, size}`: the centre and the width, as fractions of a square image. The v2 art fits that model as follows.

### Reference

The new references are `{ kind: "built-in", artwork: "lumen-v2" }` and `{ kind: "built-in", artwork: "vellum-v2" }`. The v1 PNGs and their WebP derivatives stay unchanged, because existing conversation snapshots point at them.

### Frames per role

v2 needs no stored frames. Every role renders its drawing whole:

| Role | Lumen v2 | Vellum v2 |
| --- | --- | --- |
| `avatar` | The avatar cut, whole | The avatar cut, whole |
| `portrait` | The full drawing, whole | The full drawing, whole |
| `opening` | The full drawing, whole | The full drawing, whole |
| `working` | The full drawing, whole | The full drawing, whole |

The renderer picks the avatar cut for the `avatar` role and the full drawing for every other role. A frame, if one is stored, still applies: the renderer turns it into a `viewBox` on whichever drawing it shows. For example, the not-chosen crops are Lumen `{x: 0.5, y: 0.5, size: 0.56}` and Vellum `{x: 0.5, y: 0.27, size: 0.42}` on the full drawing.

Drop the v1 avatar frames (Lumen `{0.5, 0.53, 0.27}` and Vellum `{0.49, 0.22, 0.32}`) from the v2 definitions. They describe the raster composition, not the SVG.

### Initials fallback

The initials stay behind the drawing, as they do today. An inline SVG can't fail to load, so v2 needs no `onError`. The initials still show for missing metadata, historical own constructs and generated art that fails.

### Delivery size

An SVG has no delivery size. v2 needs no WebP derivatives and no `sizes` attribute, and `displayWidth` only sets layout width. The resize script stays v1 only. The four drawings total about 51 KB before compression, and each page draws at most a few of them.

## Portrait frames

The system thread frames portraits with an ornament symbol, `--orn-portrait`, stretched over the image plus a bleed of `--orn-portrait-bleed` (0.375 to 0.75 rem). The artwork makes three promises to that frame. The specimen's frame demo draws each one as a guide.

- **Frame band.** The frame draws in the bleed, outside the image. On the 100-unit symbol board, the image covers 4 to 96.
- **Overlap limit.** The frame may reach up to 6% of the image's width into it, to 9.5 on the board. Nothing essential sits in that strip; only ground, motes and map margin do.
- **Safe circle.** Each construct's essential figure fits inside a central circle of 88% of the image's diameter. A theme may therefore round the portrait into a medallion, for example with a `--portrait-radius: 50%` token, without cutting off Lumen's ring or Vellum's hands.

Avatars get no theme frame. At 32 and 40 px, a frame would take pixels from the face. The avatar's round clip is its frame.

### Requests for the system thread

- Style the portrait's drawing as well as its image: `.construct-portrait :is(img, svg)`, not only `img`.
- Optional: add a `--portrait-radius` token, defaulting to today's `--action-radius`, so an appearance can choose a round medallion.

## Ship the artwork

These steps are a plan for the coordinating thread. None of them is done.

1. Add `apps/web/src/components/constructs/artwork/lumen-v2.tsx` and `vellum-v2.tsx`. Each exports a portrait component and an avatar component, with `useId` for gradient and clip ids. Generate the JSX from the SVG files, so `draw.py` stays the source. Each component takes an optional `viewBox` for a stored frame.
2. Move `construct-art.css` into the components layer, next to `construct-visual.tsx`, and drop the embedded `<style>` from the components.
3. Add `"lumen-v2"` and `"vellum-v2"` to the `VISUAL_ASSET` enum in `apps/web/src/constructs/visual.ts`.
4. Point `canonical` in `apps/web/src/constructs/lumen.ts` and `vellum.ts` at v2, and remove `frames`.
5. In `ConstructIllustration`, branch on a v2 built-in before `constructVisualSource`. Render the role's drawing inline, inside the same `.construct-visual` span, with the initials behind it.
6. Make `constructVisualSource` return `undefined` for v2, or limit it to v1, so no caller requests a PNG that doesn't exist.
7. In `apps/web/src/ui/copy/construct-discovery.ts`, accept both v1 and v2 in `constructPersonality`.
8. In `apps/web/src/components/chat/chat.css`, add `lumen-v2` and `vellum-v2` to the presence animation selectors. `chat-message.tsx` already passes the artwork id through `data-artwork`.
9. Add the ten `--construct-*` tokens to the token notes in `apps/web/src/themes/themes.ts` and to each mode's values.
10. Update `docs/construct-visuals.md` as described in [Documentation changes](#documentation-changes).

### Documentation changes

- **Metadata and identity:** list `lumen-v2` and `vellum-v2` as built-in references, and say that v1 stays for snapshots.
- **Shared primitives:** say that v2 built-ins render as inline SVG, that the avatar role uses an avatar cut, and that frames become a `viewBox`. Replace the sentence about "supplied avatar frames".
- **Image delivery sizes:** say that derivatives and `sizes` apply to raster art only.
- **Artwork source:** add that v2 is hand-written SVG drawn on 2026-11-17, with no third-party parts, and keep the v1 paragraph.

### Affected tests

| Test | Change |
| --- | --- |
| `apps/web/test/component/constructs/visual.test.ts` | Add v2 to the reference cases; keep the v1 case at line 95 for snapshots. |
| `apps/web/test/component-integration/constructs/visual-delivery.test.ts` | Keep the v1 derivative checks; add a check that v2 has no source path. |
| `apps/web/test/component-integration/components/constructs/adventure-character-header.browser.test.tsx` | Expect an inline drawing, not a `vellum-v1` WebP. |
| `apps/web/test/component/ui/copy/construct-discovery.test.ts` | Cover v2 references for each built-in. |
| New | Scan the generated components for literal colors (hex, `rgb`, `hsl`, `oklch`, named colors) and fail on any. |
| New | Check that two copies on one page have distinct gradient ids. |
| New | Take screenshots of each construct at 32, 40 and 224 px in each appearance, and compare them with approved images. |

## Licenses

All four drawings and `construct-art.css` are original hand-written SVG and CSS, drawn for this project. They use no third-party shapes or icon parts. Lucide wasn't needed.

`specimen.html` embeds Source Serif 4, which the repository already ships under the SIL Open Font License (`apps/web/src/themes/fonts/source-serif-4/OFL.txt`). It also embeds the three appearance textures and the v1 PNGs, byte for byte, for comparison. The specimen is a review page and doesn't ship.

## Rebuild the artwork

To redraw the SVG files, rebuild the specimen and retake the screenshots, run these commands from the repository root:

```bash
python3 outputs/theme-redesign/artwork/src/draw.py
python3 outputs/theme-redesign/artwork/src/specimen.py
node outputs/theme-redesign/artwork/src/shoot.mjs
```

`shoot.mjs` uses the Playwright package from the repository's `node_modules`.

## Evidence

| File | What it shows |
| --- | --- |
| `specimen-1280.png` | The whole specimen at 1280 px wide. |
| `specimen-360.png` | The whole specimen at 360 px wide. The 264 px portrait fits. |
| `small-CONSTRUCT-MODE-x1.png` | The 32, 40 and 64 px sizes beside the current raster art, at device pixel ratio 1. |
| `small-CONSTRUCT-MODE-x2.png` | The same, at device pixel ratio 2. |
| `strip-CONSTRUCT-MODE.png` | The whole proposed strip, at device pixel ratio 2. |

In these names, `CONSTRUCT` is `lumen` or `vellum`, and `MODE` is `light`, `soot-brass` or `dark`.

## Alternatives

The brief allowed one alternative direction per construct. None was drawn; the time went to the small sizes. The crop of the full drawing is the only alternative in the specimen.

## Open questions

- Should existing conversation snapshots keep the v1 raster art, or move to v2? This plan keeps v1, as the model requires.
- Should Lumen's ring turn slowly when the user allows motion? The primitives have no animation today, so the drawings are still.
- Do the proposed `--construct-*` values suit each appearance?
- Is a separate avatar cut acceptable, rather than a crop of the portrait?
