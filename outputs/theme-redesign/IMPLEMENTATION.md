# Theme redesign: implementation plan

This file is the plan for the one pull request (PR) that moves the theme redesign into the app. It lists the commits in order and the checks the PR must pass. It also covers the risks, the existing problems the PR should fix, and where each appearance's own plan lives.

The gallery and component specimen are ready for design review. Use this plan to move the reviewed designs into the app in one pull request.

## Sources

| What | Where |
| --- | --- |
| New tokens and their defaults | [`system/tokens.css`](system/tokens.css) |
| What a theme may set, and the rules for setting it | [`system/THEME-INTERFACE.md`](system/THEME-INTERFACE.md) |
| The component layer | [`system/components.css`](system/components.css) |
| Each component's markup, states and accessibility, and the old-role mapping | [`system/components.md`](system/components.md) |
| Each appearance's token values, ornament sprite and plan | `themes/<appearance>/tokens.css`, `ornaments.svg` and `IMPLEMENTATION-SECTION.md` |
| The construct artwork and its shipping plan | [`artwork/README.md`](artwork/README.md) |
| Mockup sources and built mockups | [`views-src/`](views-src/) and [`views/`](views/) |
| The current site's performance and accessibility numbers | [`baseline/summary.md`](baseline/summary.md) |

Each appearance has a mode id in the app. In this file, `light` is Ivory Vellum, `soot-brass` is Soot & Brass, and `dark` is Espresso Leather.

## Decisions before the PR starts

Autumn should settle these first, because each one changes a token value or a commit:

- **Each appearance's open choices.** Each appearance's `DIRECTION.md` lists them under "Choices awaiting Autumn". Each is a token change.
- **The body face.** Soot & Brass and Espresso Leather propose Source Serif 4 for body text in place of Nunito. Keeping Nunito is one token in each, and it changes the font numbers in [Fonts](#fonts).
- **The construct artwork.** Ship v2 in this PR, or leave v1 and ship v2 later. [Construct artwork](#construct-artwork) assumes v2 ships.
- **The "Theme" legend in Settings.** It sits under the "Appearance" heading and repeats it. The mockups keep it; dropping it is a copy change.

- **Profile progress.** Decide whether the ring carries both circle and progress. Preserve the exact experience and next-circle values and calculate the arc from the actual circle interval.
- **Sign-in confirmation.** The current confirmation retains the address and retry action. Treat the prototype’s alternate confirmation as a separate copy and behavior decision.
- **Ornament density.** Review the competing illustrations in empty states and the Espresso Leather trail rule in long conversations before finalizing their emphasis.

## Commit checklist

Each commit leaves the site working, so a reviewer can check out any commit and see a whole page. To make that possible, the new component layer lands beside the old page roles first. Each area then moves to the new classes in its own commit. The old roles go only when nothing uses them.

1. **Add the new tokens to the contract.**
   - Add every token in `system/tokens.css` to `apps/web/src/themes/contract.css`, with the same defaults, on `:root` and `[data-mode]`.
   - Document each new token's role in `apps/web/src/themes/themes.ts`, beside the existing token notes.
   - Keep every existing token. No existing token's value changes in this commit, so the site looks the same.
2. **Add the ornament generator.** It turns each appearance's `ornaments.svg` into `--orn-*` tokens. [Ornament assets](#ornament-assets) describes it. In this commit, the three sprites go in, and the generated CSS is imported but every slot's size is still 0, so nothing shows yet.
3. **Add the component layer.**
   - Add `system/components.css` as `apps/web/src/app/components.css`, imported in `globals.css` into the `components` layer after `page-roles.css`.
   - Drop the mockup-only parts: the `preview` layer and the forced-state rules that `build.py` writes for `data-force`. Neither is in `components.css` itself, so this needs no edit, only care not to copy `views/assets/bundle.css`.
   - Nothing in the app uses the new class names yet, so the site still looks the same.
4. **Set the three appearances' values.** One commit for each appearance, in the order `light`, `soot-brass`, `dark`. Each moves its `tokens.css` values into `apps/web/src/themes/parchment.css` and turns on its ornament sizes. Each appearance's section lists its steps. The old page roles read only the existing tokens, so this commit changes colours and fonts on today's markup. That is expected; the next commits change the markup.
5. **Move the views to the new components.** One commit for each area, each changing the React markup and nothing else:
   1. the site header, trail band, site panel and appearance swatches;
   2. sign-in;
   3. Quests list and the quest workspace (tabs, collections, editable lists, menus, dialogs);
   4. the conversation and composer (`apps/web/src/components/chat/`);
   5. Spellbook and the spell editor;
   6. the Timer;
   7. Settings and Profile, including the progress ring;
   8. construct portraits and avatars.

   Preserve the production conversation’s latest-message positioning and the ability to scroll back while a reply is underway. Keep the Settings tooltip’s Escape behavior and restore focus to the invalid field on save. The static fixtures exercise the layout for these states.

   [Component-to-React mapping](#component-to-react-mapping) says where to find each change. These commits also fix the [existing problems](#existing-problems-to-fix) that sit in the markup.
6. **Remove the old roles.**
   - Delete the rules in `apps/web/src/app/page-roles.css` and `apps/web/src/components/chat/chat.css` that `components.md` marks as mapped or retired. Keep the 14 roles marked as kept, and Streamdown's names in `chat.css`.
   - Fold what remains of `page-roles.css` into `components.css`, or keep it under its old name if it is still large.
   - Check `apps/web/src/components/constructs/construct-discovery.css` the same way.
7. **Ship the construct artwork.** Follow the 10 steps in `artwork/README.md`, as [Construct artwork](#construct-artwork) describes.
8. **Update the visual tools.** Change the two class selectors in `apps/web/scripts/visual/views.ts`, as [Screenshot comparison](#screenshot-comparison) describes.
9. **Update the docs and tests.** Make the changes in [Contract and contrast tests](#contract-and-contrast-tests), [Swatch change](#swatch-change) and the artwork's documentation changes.

## Component-to-React mapping

[`system/components.md`](system/components.md) is the mapping. For each component it gives:

- the line in `components.css` where its rules start;
- its markup and classes;
- its states, and how each one shows;
- the old page roles it replaces, and the React files that use them;
- its accessibility rules and the faults it fixes.

Its [Role mapping](system/components.md#role-mapping) section lists all 268 old roles. 233 map to a new class, 21 retire, and 14 stay. Each row names the React files that use the old role, so commit 5 can work file by file.

Components choose semantic roles and never palette colours. Each appearance sets token values and ornament assets only. A reviewer can check the rule with one search: `components.css` names no colour except `transparent` and `currentColor`.

## Ornament assets

Each appearance draws its ornament as SVG symbols in `themes/<appearance>/ornaments.svg`. The components paint each symbol as a mask: the symbol's main shapes take `--ornament-ink`, and shapes marked `data-ink="accent"` take `--ornament-accent-ink`. A mask carries no colour, so a theme can't put a palette colour into a component this way.

To ship them, the PR adds a generator:

1. Copy the three sprites to `apps/web/src/themes/ornaments/` as `ivory-vellum.svg`, `soot-brass.svg` and `espresso-leather.svg`, the same names as the textures.
2. Add `apps/web/scripts/build-ornament-tokens.ts`. It reads each sprite and writes `apps/web/src/themes/ornaments.generated.css`, with one `[data-mode="MODE"]` block for each appearance. `MODE` is the appearance's mode id.
3. Port the rules from `ornament_tokens()` in [`build.py`](build.py), so the app's masks match the mockups:
   - each symbol becomes `--orn-SLOT` and `--orn-SLOT-accent`, where `SLOT` is the symbol's id without `orn-`;
   - `orn-corner` draws the top-left corner, and the generator mirrors it into four corners;
   - `orn-rule-end` draws the left end, and the generator mirrors it for the right end and writes `--orn-rule-end-ratio`;
   - `orn-vignette` also writes `--orn-vignette-ratio` from its `viewBox`;
   - `orn-bullet` has one ink, so the generator merges its accent shapes into the main image;
   - a missing slot stays `var(--orn-blank)`.
4. Make the generator fail on a sprite it can't read, and warn on a symbol no component reads. The app has no XML parser among its dependencies. The sprites are hand-written and simple, so a small strict parser that rejects anything outside `<symbol>`, `<path>`, `<circle>`, `<rect>`, `<ellipse>`, `<line>`, `<polyline>`, `<polygon>` and `<g>` is enough. It avoids a new dependency.
5. Commit the generated CSS, and add a test that runs the generator and fails if the output differs from the committed file. This is the same pattern as `check:build-fonts`.
6. Add an npm script, `build:ornaments`, and say in the generated file's header that it is generated.

The masks are data URIs (URLs that carry the file's contents) inside CSS, so they cost no extra requests. The three sprites' tokens add about 36 KiB of CSS, about 4 KiB compressed. Every visitor downloads all three, because one stylesheet serves every appearance. [Risks](#risks) covers that.

Each appearance's `DIRECTION.md` records the source and licence of its symbols:

- Ivory Vellum and Soot & Brass drew every symbol by hand for this project.
- Espresso Leather drew its symbols by hand, except its vignette. The vignette's book and flame are adapted from Lucide's `book-open` and `flame`, under the ISC licence. Lucide is already a dependency, and the ISC licence needs no entry on the Credits page.

So the Credits page needs no new entry.

## Existing problems to fix

[`baseline/summary.md`](baseline/summary.md) holds the current site's numbers. It was taken on 2026-11-18 at commit 192c683e. The PR should fix these problems, or at least not make them worse.

| Problem | Where | Fix in this PR |
| --- | --- | --- |
| Cumulative layout shift (CLS) of 0.115 | Quest conversation at 1280 px, in all three appearances. Every other load is 0.005 or less. | The composer dock reserves its height before the composer mounts. See Composer in `components.md`. Check the shift's source with the baseline tool before and after, because the largest content element on that page is `div.chat-composer-dock`. |
| axe `label-content-name-mismatch` | The `quest-start-tile` buttons, in 12 views. | The button's `aria-labelledby` names only the title, while its visible text also includes the hint. Drop `aria-labelledby` so the name comes from the content, or point it at both the title and the hint. See Choice tile in `components.md`. |
| axe `scrollable-region-focusable` | Scrolling code blocks in replies (`div.language-ts`, Streamdown's code block). | Give a scrolling code block `tabindex="0"` and an accessible name, such as its language. See Conversation in `components.md`. |
| axe `landmark-unique` | The repeated `aside aria-label="Tasks change"` in quest views. | Make each tasks change a named group, `div role="group" aria-label="Tasks change"`, not a landmark. The mockups already do this. |
| Fonts: 307 KiB in 7 files on every load | Every view. | See [Fonts](#fonts). The design adds and drops no font file. |

### Fonts

The redesign uses the same 7 font files as the current site:

- Cormorant Garamond;
- IM Fell English, normal and italic;
- JetBrains Mono;
- Nunito;
- Source Serif 4;
- UnifrakturMaguntia.

It adds no font file and drops none, so the PR doesn't change font weight on its own.

The appearances use different faces, though. Only Ivory Vellum uses Nunito (body text) and IM Fell English italic (the Timer's phase name). Soot & Brass and Espresso Leather use neither.

Today the proxy preloads fonts for each theme, not each mode. `THEME_TYPEFACES` in `apps/web/src/themes/theme-font-urls.ts` lists all 7 for `parchment`, and `src/proxy.ts` sends them all in a `Link` header. The theme cookie already carries the mode.

As a follow-up, the proxy could preload only the saved mode's faces. That saves Nunito (38.2 KiB) and IM Fell English italic (56.5 KiB), about 95 KiB of 307, on each Soot & Brass and Espresso Leather load. It needs `THEME_TYPEFACES` keyed by mode, and `theme-fonts.test.ts` checked against each mode's tokens. Keep it out of this PR unless the visual-baseline check shows a regression, because it changes the proxy and its tests.

## Checks before merging

The PR must pass all of these.

### Tests and build

Run these in `apps/web`:

```sh
npm run lint
npm run typecheck
npm run test
npm run test:browser
npm run test:playwright
npm run build
npm run check:build-fonts
```

`check:build-fonts` fails if the font preload map drifts from the build. The redesign changes no font file, so it should pass unchanged.

### Screenshot comparison

To compare the real site with the mockups, run `visual-compare` from the repository root:

```sh
mise run visual-compare -- --mockups outputs/theme-redesign/views --out OUT_DIR
```

`OUT_DIR` is an optional folder for the results; without `--out`, the tool chooses one. `--help` lists the other options, such as `--only`, `--widths` and `--appearances`.

The tool screenshots each of the 33 views in `apps/web/scripts/visual/views.ts`, in each appearance at each width, beside its mockup. A view's name is `VIEW--STATE`, and the mockup with the same file name in `views/` is its pair.

The mockups cover 29 of the 33 views. The four views with no mockup are `quests--crowded`, `quest--crowded`, `spell--crowded` and `profile--crowded`. They use the crowded review account. The brief doesn't require them. To check them, compare their layout with the typical views' mockups and look for overflow.

Before the run, change two setup selectors in `views.ts`. Both name an old class that commit 5 removes:

| View | Old selector | New selector |
| --- | --- | --- |
| `settings--swatch-focus` | `main .theme-choice-input` | `main .appearance-swatch-input` |
| `settings--swatch-tooltip` | `main .panel-mode` (the last one) | `main .appearance-swatch` (the last one) |

Better still, select by role and name: the radio named "Espresso Leather", and its label. Then the next class rename can't break the tool.

The PR passes when each pair matches in layout, ornament and state. Look for these:

- The swatch views show the forced states: `settings--swatch-focus` shows a dashed focus outline on the first swatch, and `settings--swatch-tooltip` shows the tooltip "Espresso Leather" under the last swatch.
- On a phone, the drawer views show the drawer open. `quest--tasks`, `quest--ideas`, `quest--progress`, `quest--quick-notes`, `quest--row-menu` and `quest--confirm-dialog` open it through "Open quest sidebar". The mockups show the drawer open at 360 px too.
- Dialogs are framed as the window, so the dialog sits in the middle of the viewport, not the page.
- No page scrolls sideways at 320 px or 360 px.

Text content differs between the two sides, because the mockups use made-up quests. Judge the frame, not the words.

### Performance and accessibility

To measure the PR against the baseline, run `visual-baseline` from the repository root:

```sh
mise run visual-baseline
```

It builds the site for production and measures each view's page weight, fonts, Largest Contentful Paint (LCP), CLS and axe violations. Compare its summary with `baseline/summary.md`. The PR passes when:

- the four axe problems in [Existing problems to fix](#existing-problems-to-fix) are gone, and no new rule fails;
- CLS on the quest conversation at 1280 px is below 0.1, and no other load reaches 0.01;
- font transfer stays at 307 KiB or less;
- no view's transfer grows by more than about 10 KiB. The ornament tokens add about 4 KiB compressed. `components.css` is about 12 KiB compressed, against about 22 KiB for `page-roles.css` and `chat.css` today, so commit 6 should more than pay for both.

### Each appearance's checks

Each appearance's section lists its own checks: contrast pairs, its Timer, and its reduced-motion behaviour. The PR passes all three.

## Contract and contrast tests

The test hardening merged at 7768d6e1. The tests check rendered behaviour, not class names, CSS text or fixed palette values. So renaming page roles is not expected to break tests.

The token and contrast checks run in the browser through the real cascade, in `apps/web/test/component-integration/themes/theme-tokens.browser.test.tsx`. They list the tokens from `contract.css`. As a result:

- **"Sets every token the contract reads"** picks up the new tokens by itself. Each new token has a default in the contract, so it passes as long as commit 1 lands first.
- **"Sets every colour token to a colour in sRGB"** applies to the new colour roles: `--rubric`, `--ornament-ink`, `--ornament-accent-ink`, `--rule-ink`, `--frame-ink`, `--scrim`, `--header-focus` and the four ring tokens. Each must resolve to an sRGB colour in every mode.
- **"Passes WCAG AA"** needs these new pairs added:
  - `--label-ink` on `--background` and `--surface`, at 4.5:1;
  - `--rule-ink` and `--frame-ink` on the surfaces they divide, at 3:1;
  - `--header-focus` on `--header-ink`, at 3:1;
  - `--ring-arc` on `--ring-track`, and `--ring-ink` on `--ring-disc`, at 3:1 and 4.5:1.

  Ornament inks need no pair, because ornament is decorative.
- **"Gives each appearance a palette of its own"** still holds.

`apps/web/test/component/themes/contract.test.ts` checks that the contract reads the tokens that the themes set and that every colour utility reads a token. It needs no change, unless the PR adds Tailwind utilities for the new tokens.

The ornament generator's drift test is new. See [Ornament assets](#ornament-assets).

Two documents change with tests that still pass:

- **The Timer.** `docs/timer.md` line 46 says "The illustration is transparent over the page's existing texture". The test still requires the Timer area to stay transparent. No appearance gives the Timer its own background, so neither the document nor the test changes. If Autumn later gives an appearance a Timer background, change `docs/timer.md` and the test together.
- **The swatches.** See [Swatch change](#swatch-change).

## Swatch change

On 2026-11-17, Autumn asked that each appearance's swatch, in the site panel and in Settings, carry that appearance's ornament. Each swatch keeps its texture and adds an ornament from its own sprite (the `orn-swatch` symbol). It always shows its own appearance's colours, whatever the page's appearance is.

This changes the approved design. Change these two documents in the same PR:

- `docs/appearance.md` line 11 says "Each swatch shows only its background texture, with no content overlays or captions". Replace it with: each swatch shows its background texture and its appearance's ornament, with no words. The ornament is decorative and hidden from assistive technology.
- `apps/web/use-cases/appearance.md` line 14 says "Swatches contain only the background texture, with no overlays". Change it the same way.

The swatch test only requires that a swatch adds no words to its accessible name, so it needs no change. The ornament is in `::before` and `::after` on an element with `aria-hidden="true"`, and adds no text.

The rest of the swatch rules stay:

- native radios named by the appearance;
- a solid outline for selection and a separate dashed outline for focus;
- tooltips;
- targets at least 44 px;
- the compact row at 320 px.

## Appearances

Each appearance thread wrote its own section. Each covers the appearance's sources, its checklist for commit 4, its swatch, its checks before merging and its risks.

### Ivory Vellum

Ivory Vellum extends the scribe’s hourglass into illuminated corners and gilt rules. Follow the [implementation checklist](themes/ivory-vellum/IMPLEMENTATION-SECTION.md) for `light`.

### Soot & Brass

Soot & Brass uses the Gothic hour dial’s tracery and brass chapter marks. Follow the [implementation checklist](themes/soot-brass/IMPLEMENTATION-SECTION.md) for `soot-brass`.

### Espresso Leather

Espresso Leather carries the necromantic seal’s sigils and blackletter into the grimoire design. Follow the [implementation checklist](themes/espresso-leather/IMPLEMENTATION-SECTION.md) for `dark`.

Where these sections say "where the system section puts appearance sprites", the place is `apps/web/src/themes/ornaments/`. See [Ornament assets](#ornament-assets).

## Construct artwork

The artwork thread drew v2 of Lumen and Vellum as hand-written SVG that takes its colours from tokens. [Ship the artwork](artwork/README.md#ship-the-artwork) in `artwork/README.md` lists 10 steps. Commit 7 follows them. In brief:

1. It adds `lumen-v2.tsx` and `vellum-v2.tsx`, generated from the SVG files.
2. It moves `construct-art.css` into the components layer.
3. It adds `lumen-v2` and `vellum-v2` to the visual asset enum, and points each construct's `canonical` at v2.
4. It renders v2 inline in `ConstructIllustration`, and keeps v1 for snapshots.
5. It adds v2 to the presence animation selectors in `chat.css`.
6. Step 9 adds the ten `--construct-*` colour roles to the token notes in `apps/web/src/themes/themes.ts` and to each mode's values. The appearance threads haven't set them yet, so each role uses its fallback to an existing token. The artwork README gives proposed values for each appearance.
7. It updates `docs/construct-visuals.md`.

The contract already has `--construct-glow-core` and `--construct-accent`. The ten new roles don't reuse those names; keep both.

The component layer already does what the artwork thread asked of the system thread:

- `.construct-portrait :is(img, svg)` styles an inline drawing as well as an image;
- `--portrait-radius` lets an appearance choose a round medallion, and defaults to `--action-radius`.

### Artwork tests

v2 changes fewer tests than the table in `artwork/README.md` lists. Since the hardening, `apps/web/test/support/constructs/built-in-artwork.ts` reads each construct's artwork from its definition, so tests that use it follow `canonical` to v2 by themselves.

These still change:

- `apps/web/test/component/constructs/visual.test.ts` hard-codes `/constructs/${id}-v1.png` and checks the frame size. Add v2 to the reference cases, and keep the v1 case for snapshots.
- `apps/web/test/component-integration/components/constructs/adventure-character-header.browser.test.tsx` queries an `img` and expects WebP paths. An inline drawing has neither, so the test should find the drawing by its role and name.

These probably need no change:

- `visual-delivery.test.ts` hard-codes v1 loader paths. They test v1 rasters, which stay for snapshots. Adding the check that v2 has no source path is still worth doing.
- `construct-discovery.test.ts` names no artwork.
- `construct-presence.browser.test.tsx` reads the artwork from the definition. Check that it doesn't query an `img`.

The three new tests in the README still apply: a literal-colour scan of the generated components, distinct gradient ids for two copies on one page, and screenshots of each construct at 32, 40 and 224 px in each appearance.

## Risks

Landing the redesign in one PR puts every page's look at stake at once. The PR limits that risk in these ways.

- **A broken page mid-PR.** The new component layer lands beside the old roles, and each area moves in its own commit. Any commit can be checked out and run.
- **A missed old role.** `components.md` maps all 268 roles, with their React users. Before commit 6, search the app for each mapped or retired class name. Delete a rule only when the search finds no user.
- **Specificity changes.** The new layer sits in the same `components` layer as the old roles, after them. While both exist, a page that mixes old and new classes can show either rule. Each area's commit moves the whole area, so no page mixes them for long.
- **Contrast on textures.** A token value that passes on a flat surface can fail on the texture's darkest pixel. Each appearance's checks test both. The browser contrast test checks the flat surfaces.
- **Ornament weight.** All three sprites ship in one stylesheet, about 4 KiB compressed. The visual-baseline check catches growth beyond that. If it grows, a later change can split the generated CSS by mode.
- **Header focus.** The site header has its own band, where the page's focus colour may not show. `--header-focus` fixes this. Each appearance must set it to reach 3:1 on `--header-ink`; the Ivory Vellum section names this as its one contrast gap.
- **Blackletter initials.** Espresso Leather's blackletter initial is hard to read at small sizes. `--initial-gap` gives it room. If it is still hard to read, the appearance can set `--initial-font` to its display face.
- **Old-style figures.** Cormorant Garamond shows old-style figures by default, so a small zero in a tab count looks like a letter o. Two appearance sections propose `lining-nums` on tab counts.
- **The phone sidebar button.** The real site names its phone sidebar button "Open quest sidebar". The mockups show a "Quest" button in the trail band's tools. Keep the real site's name, which visual-compare and the tests use.
- **The construct mockup's figure.** `views/construct--vellum.html` still has one inline style on its figure. The PR uses the `page-row` component for it instead.

## Mockup tools

To rebuild the mockups, run the build from the repository root. It uses only the Python 3 standard library:

```sh
python3 outputs/theme-redesign/build.py
```

It writes 29 views, the component specimen and the gallery in `index.html`. It inlines the fonts from `apps/web/src/themes/fonts/` and the textures from `apps/web/public/textures/`, unchanged.

A mockup takes these query parameters:

- `appearance=MODE` shows the appearance whose mode id is `MODE`: `light`, `soot-brass` or `dark`. `mode=MODE` works too.
- `width=WIDTH` frames the page at `WIDTH` pixels: `1280` or `360`.
- `bare` shows the page alone, with no toolbar or frame.

A mockup also shows itself bare inside an iframe, or when `width` is given and the window is no wider than that width plus 40 px. visual-compare loads each mockup with `?bare&appearance=MODE&width=WIDTH`.
