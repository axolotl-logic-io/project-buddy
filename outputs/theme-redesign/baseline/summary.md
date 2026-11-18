# Baseline before the theme redesign

Taken 2026-11-18T01:32:01.731Z from http://localhost:62670 (production), at commit 192c683e, as review+typical@project-buddy.test or signed out. The results are in `baseline.json`; `mise run visual-baseline` takes them again.

Each page was loaded in a fresh browser with an empty cache, on this computer, without network or CPU throttling. Transfer sizes are compressed bytes on the wire, headers included. LCP and CLS are this computer's: compare them between runs, not with field data.

## Notable

Heaviest loads:

- quest--conversation, soot-brass, 360 px: 1068.1 KiB, of which images 106.2, JS 604.4 and fonts 307.0.
- quest--conversation, soot-brass, 1280 px: 1066.6 KiB, of which images 106.2, JS 604.4 and fonts 307.0.
- quest--conversation, dark, 1280 px: 1041.0 KiB, of which images 79.2, JS 604.4 and fonts 307.0.
- quest--conversation, dark, 360 px: 1039.6 KiB, of which images 79.2, JS 604.4 and fonts 307.0.
- quest--conversation, light, 360 px: 1016.3 KiB, of which images 54.5, JS 604.4 and fonts 307.0.

Average transfer by appearance:

- light: 697.7 KiB a load, 78.7 KiB of it images.
- soot-brass: 740.1 KiB a load, 121.8 KiB of it images.
- dark: 717.1 KiB a load, 99.3 KiB of it images.

Loads with layout shift of 0.01 or more (0.1 is poor):

- quest--conversation, light, 1280 px: CLS 0.115.
- quest--conversation, soot-brass, 1280 px: CLS 0.115.
- quest--conversation, dark, 1280 px: CLS 0.115.

No load's Largest Contentful Paint took 2500 ms or more.

## Accessibility

axe made 195 scans of 33 views, one in each appearance at each width, for WCAG 2.2 A and AA and best practice.

| Rule | Impact | What it checks | Views | Scans | Elements |
| --- | --- | --- | --- | --- | --- |
| [label-content-name-mismatch](https://dequeuniversity.com/rules/axe/4.14/label-content-name-mismatch?application=playwright) | serious | Elements must have their visible text as part of their accessible name | 12 | 69 | 345 |
| [scrollable-region-focusable](https://dequeuniversity.com/rules/axe/4.14/scrollable-region-focusable?application=playwright) | serious | Scrollable region must have keyboard access | 1 | 6 | 9 |
| [landmark-unique](https://dequeuniversity.com/rules/axe/4.14/landmark-unique?application=playwright) | moderate | Landmarks should have a unique role or role/label/title (i.e. accessible name) combination | 10 | 48 | 48 |

### label-content-name-mismatch

Elements must have their visible text as part of their accessible name (serious).

- quests--list: light 1280, soot-brass 1280, dark 1280, light 360, soot-brass 360, dark 360
- spellbook--list: light 1280, soot-brass 1280, dark 1280, light 360, soot-brass 360, dark 360
- spell--editor: light 1280, soot-brass 1280, dark 1280, light 360, soot-brass 360, dark 360
- quests--empty: light 1280, soot-brass 1280, dark 1280, light 360, soot-brass 360, dark 360
- quests--crowded: light 1280, soot-brass 1280, dark 1280, light 360, soot-brass 360, dark 360
- site-panel--open: light 1280, soot-brass 1280, dark 1280
- quest--ideas: light 1280, soot-brass 1280, dark 1280, light 360, soot-brass 360, dark 360
- quest--quick-notes: light 1280, soot-brass 1280, dark 1280, light 360, soot-brass 360, dark 360
- quest--row-menu: light 1280, soot-brass 1280, dark 1280, light 360, soot-brass 360, dark 360
- spellbook--yours-empty: light 1280, soot-brass 1280, dark 1280, light 360, soot-brass 360, dark 360
- spell--invalid-field: light 1280, soot-brass 1280, dark 1280, light 360, soot-brass 360, dark 360
- spell--crowded: light 1280, soot-brass 1280, dark 1280, light 360, soot-brass 360, dark 360

For example:

- `button[aria-describedby="_R_3clubsnpflbH1_"]`: `<button aria-describedby="_R_3clubsnpflbH1_" aria-labelledby="_R_3clubsnpflb_" class="quest-start-tile" type="button" aria-haspopup="dialog" aria-expanded="fals`
- `button[aria-describedby="_R_5clubsnpflbH1_"]`: `<button aria-describedby="_R_5clubsnpflbH1_" aria-labelledby="_R_5clubsnpflb_" class="quest-start-tile" type="button" aria-haspopup="dialog" aria-expanded="fals`

### scrollable-region-focusable

Scrollable region must have keyboard access (serious).

- quest--crowded: light 1280, soot-brass 1280, dark 1280, light 360, soot-brass 360, dark 360

For example:

- `.p-4`: `<div class="language-ts overflow-y-auto overflow-x-auto rounded-md border border-border bg-background p-4 text-sm" data-language="ts" data-streamdown="code-bloc`

### landmark-unique

Landmarks should have a unique role or role/label/title (i.e. accessible name) combination (moderate).

- quest--conversation: light 1280, soot-brass 1280, dark 1280, light 360, soot-brass 360, dark 360
- quest--tasks: light 1280, soot-brass 1280, dark 1280
- quest--ideas: light 1280, soot-brass 1280, dark 1280
- quest--quick-notes: light 1280, soot-brass 1280, dark 1280
- quest--progress: light 1280, soot-brass 1280, dark 1280
- quest--completed: light 1280, soot-brass 1280, dark 1280, light 360, soot-brass 360, dark 360
- quest--crowded: light 1280, soot-brass 1280, dark 1280, light 360, soot-brass 360, dark 360
- quest--composer-commands: light 1280, soot-brass 1280, dark 1280, light 360, soot-brass 360, dark 360
- quest--command-error: light 1280, soot-brass 1280, dark 1280, light 360, soot-brass 360, dark 360
- quest--loading-reply: light 1280, soot-brass 1280, dark 1280, light 360, soot-brass 360, dark 360

For example:

- `li[data-message-id="DOjOxlDLUzPkiiMt"] > .chat-message-body > .tasks-message > .tasks-change[aria-label="Tasks change"]`: `<aside aria-label="Tasks change" class="tasks-change">`

## Page loads

Sizes are in KiB.

| View | Width | Appearance | Total KiB | Document | CSS | JS | Fonts (files) | Images | Other | Requests | LCP ms | LCP element | CLS |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| sign-in--default | 1280 | light | 609.4 | 8.3 | 23.9 | 216.7 | 307.0 (7) | 49.0 | 4.5 | 30 | 28 | `h1.site-title` | 0.000 |
| sign-in--default | 1280 | soot-brass | 663.4 | 10.5 | 23.9 | 216.7 | 307.0 (7) | 100.8 | 4.5 | 30 | 24 | `h1.site-title` | 0.000 |
| sign-in--default | 1280 | dark | 636.4 | 10.5 | 23.9 | 216.7 | 307.0 (7) | 73.7 | 4.5 | 30 | 24 | `h1.site-title` | 0.000 |
| sign-in--default | 360 | light | 611.7 | 10.5 | 23.9 | 216.7 | 307.0 (7) | 49.0 | 4.5 | 30 | 24 | `p.text-balance` | 0.000 |
| sign-in--default | 360 | soot-brass | 661.2 | 8.3 | 23.9 | 216.7 | 307.0 (7) | 100.8 | 4.5 | 30 | 20 | `p.text-balance` | 0.000 |
| sign-in--default | 360 | dark | 636.4 | 10.5 | 23.9 | 216.7 | 307.0 (7) | 73.7 | 4.5 | 30 | 20 | `p.text-balance` | 0.000 |
| quests--list | 1280 | light | 820.7 | 11.9 | 23.9 | 243.2 | 307.0 (7) | 223.5 | 11.2 | 41 | 44 | `p.wrap-anywhere` | 0.005 |
| quests--list | 1280 | soot-brass | 821.8 | 11.6 | 23.9 | 243.2 | 307.0 (7) | 223.5 | 12.6 | 42 | 332 | `p.wrap-anywhere` | 0.005 |
| quests--list | 1280 | dark | 820.4 | 11.6 | 23.9 | 243.2 | 307.0 (7) | 223.5 | 11.2 | 41 | 24 | `p.wrap-anywhere` | 0.005 |
| quests--list | 360 | light | 635.2 | 11.6 | 23.9 | 234.4 | 307.0 (7) | 49.0 | 9.3 | 34 | 24 | `p.wrap-anywhere` | 0.000 |
| quests--list | 360 | soot-brass | 685.9 | 11.9 | 23.9 | 234.4 | 307.0 (7) | 100.8 | 7.9 | 33 | 24 | `p.wrap-anywhere` | 0.000 |
| quests--list | 360 | dark | 655.8 | 11.9 | 23.9 | 234.4 | 307.0 (7) | 73.7 | 4.9 | 32 | 24 | `p.wrap-anywhere` | 0.000 |
| quest--conversation | 1280 | light | 1016.3 | 21.9 | 23.9 | 604.4 | 307.0 (7) | 54.5 | 4.6 | 37 | 468 | `div.chat-composer-dock` | 0.115 |
| quest--conversation | 1280 | soot-brass | 1066.6 | 21.9 | 23.9 | 604.4 | 307.0 (7) | 106.2 | 3.1 | 36 | 348 | `div.chat-composer-dock` | 0.115 |
| quest--conversation | 1280 | dark | 1041.0 | 21.9 | 23.9 | 604.4 | 307.0 (7) | 79.2 | 4.6 | 37 | 344 | `div.chat-composer-dock` | 0.115 |
| quest--conversation | 360 | light | 1016.3 | 21.9 | 23.9 | 604.4 | 307.0 (7) | 54.5 | 4.6 | 37 | 344 | `div.chat-composer-dock` | 0.001 |
| quest--conversation | 360 | soot-brass | 1068.1 | 21.9 | 23.9 | 604.4 | 307.0 (7) | 106.2 | 4.6 | 37 | 340 | `div.chat-composer-dock` | 0.001 |
| quest--conversation | 360 | dark | 1039.6 | 21.9 | 23.9 | 604.4 | 307.0 (7) | 79.2 | 3.1 | 36 | 340 | `div.chat-composer-dock` | 0.001 |
| spellbook--list | 1280 | light | 626.9 | 10.7 | 23.9 | 224.9 | 307.0 (7) | 49.0 | 11.3 | 35 | 24 | `p.text-muted` | 0.000 |
| spellbook--list | 1280 | soot-brass | 679.1 | 9.8 | 23.9 | 224.9 | 307.0 (7) | 100.8 | 12.7 | 36 | 24 | `p.text-muted` | 0.000 |
| spellbook--list | 1280 | dark | 652.1 | 9.8 | 23.9 | 224.9 | 307.0 (7) | 73.7 | 12.7 | 36 | 24 | `p.text-muted` | 0.000 |
| spellbook--list | 360 | light | 627.4 | 9.8 | 23.9 | 224.9 | 307.0 (7) | 49.0 | 12.7 | 36 | 24 | `p.text-muted` | 0.000 |
| spellbook--list | 360 | soot-brass | 677.7 | 9.8 | 23.9 | 224.9 | 307.0 (7) | 100.8 | 11.3 | 35 | 24 | `p.text-muted` | 0.000 |
| spellbook--list | 360 | dark | 653.0 | 10.8 | 23.9 | 224.9 | 307.0 (7) | 73.7 | 12.7 | 36 | 24 | `p.text-muted` | 0.000 |
| spell--editor | 1280 | light | 658.2 | 12.3 | 23.9 | 251.1 | 307.0 (7) | 49.0 | 15.0 | 37 | 28 | `p.field-hint` | 0.000 |
| spell--editor | 1280 | soot-brass | 710.0 | 12.2 | 23.9 | 251.1 | 307.0 (7) | 100.8 | 15.0 | 37 | 24 | `p.field-hint` | 0.000 |
| spell--editor | 1280 | dark | 674.1 | 12.2 | 23.9 | 251.1 | 307.0 (7) | 73.7 | 6.1 | 34 | 24 | `p.field-hint` | 0.000 |
| spell--editor | 360 | light | 658.2 | 12.2 | 23.9 | 251.1 | 307.0 (7) | 49.0 | 15.0 | 37 | 24 | `p.field-hint` | 0.000 |
| spell--editor | 360 | soot-brass | 701.1 | 12.3 | 23.9 | 251.1 | 307.0 (7) | 100.8 | 6.1 | 34 | 24 | `p.field-hint` | 0.000 |
| spell--editor | 360 | dark | 674.1 | 12.3 | 23.9 | 251.1 | 307.0 (7) | 73.7 | 6.1 | 34 | 24 | `p.field-hint` | 0.000 |
| timer--setup | 1280 | light | 612.2 | 9.0 | 23.9 | 220.2 | 307.0 (7) | 49.0 | 3.1 | 29 | 20 | `p.field-hint` | 0.000 |
| timer--setup | 1280 | soot-brass | 665.4 | 9.0 | 23.9 | 220.2 | 307.0 (7) | 100.8 | 4.6 | 30 | 20 | `p.field-hint` | 0.000 |
| timer--setup | 1280 | dark | 638.3 | 9.0 | 23.9 | 220.2 | 307.0 (7) | 73.7 | 4.6 | 30 | 20 | `p.field-hint` | 0.000 |
| timer--setup | 360 | light | 613.6 | 9.0 | 23.9 | 220.2 | 307.0 (7) | 49.0 | 4.6 | 30 | 20 | `p.field-hint` | 0.000 |
| timer--setup | 360 | soot-brass | 664.0 | 9.0 | 23.9 | 220.2 | 307.0 (7) | 100.8 | 3.1 | 29 | 24 | `p.field-hint` | 0.000 |
| timer--setup | 360 | dark | 638.3 | 9.0 | 23.9 | 220.2 | 307.0 (7) | 73.7 | 4.6 | 30 | 20 | `p.field-hint` | 0.000 |
| timer--running-work | 1280 | light | 621.9 | 8.9 | 23.9 | 224.0 | 307.0 (7) | 49.0 | 9.0 | 33 | 76 | `p.timer-countdown` | 0.000 |
| timer--running-work | 1280 | soot-brass | 670.7 | 8.9 | 23.9 | 224.0 | 307.0 (7) | 100.8 | 6.1 | 32 | 76 | `p.timer-countdown` | 0.000 |
| timer--running-work | 1280 | dark | 646.7 | 8.9 | 23.9 | 224.0 | 307.0 (7) | 73.7 | 9.2 | 33 | 76 | `text.timer-inscription` | 0.000 |
| timer--running-work | 360 | light | 621.9 | 8.9 | 23.9 | 224.0 | 307.0 (7) | 49.0 | 9.0 | 33 | 76 | `p.timer-countdown` | 0.000 |
| timer--running-work | 360 | soot-brass | 672.1 | 8.9 | 23.9 | 224.0 | 307.0 (7) | 100.8 | 7.6 | 33 | 92 | `p.timer-countdown` | 0.000 |
| timer--running-work | 360 | dark | 643.7 | 8.9 | 23.9 | 224.0 | 307.0 (7) | 73.7 | 6.1 | 32 | 76 | `p.timer-countdown` | 0.000 |
| settings--default | 1280 | light | 792.0 | 9.1 | 23.9 | 223.9 | 307.0 (7) | 223.5 | 4.6 | 33 | 52 | `span.theme-swatch` | 0.000 |
| settings--default | 1280 | soot-brass | 792.0 | 9.1 | 23.9 | 223.9 | 307.0 (7) | 223.5 | 4.6 | 33 | 60 | `span.theme-swatch` | 0.000 |
| settings--default | 1280 | dark | 790.6 | 9.1 | 23.9 | 223.9 | 307.0 (7) | 223.5 | 3.1 | 32 | 36 | `span.theme-swatch` | 0.000 |
| settings--default | 360 | light | 792.0 | 9.1 | 23.9 | 223.9 | 307.0 (7) | 223.5 | 4.6 | 33 | 32 | `span.theme-swatch` | 0.000 |
| settings--default | 360 | soot-brass | 792.0 | 9.1 | 23.9 | 223.9 | 307.0 (7) | 223.5 | 4.6 | 33 | 52 | `span.theme-swatch` | 0.000 |
| settings--default | 360 | dark | 792.0 | 9.1 | 23.9 | 223.9 | 307.0 (7) | 223.5 | 4.6 | 33 | 36 | `span.theme-swatch` | 0.000 |
| profile--experience | 1280 | light | 612.4 | 11.5 | 23.9 | 219.4 | 307.0 (7) | 49.0 | 1.6 | 28 | 24 | `p.text-muted` | 0.000 |
| profile--experience | 1280 | soot-brass | 665.5 | 11.5 | 23.9 | 219.4 | 307.0 (7) | 100.8 | 3.0 | 29 | 24 | `p.text-muted` | 0.000 |
| profile--experience | 1280 | dark | 637.5 | 10.5 | 23.9 | 219.4 | 307.0 (7) | 73.7 | 3.0 | 29 | 24 | `p.text-muted` | 0.000 |
| profile--experience | 360 | light | 612.8 | 10.5 | 23.9 | 219.4 | 307.0 (7) | 49.0 | 3.0 | 29 | 24 | `p` | 0.000 |
| profile--experience | 360 | soot-brass | 664.6 | 10.5 | 23.9 | 219.4 | 307.0 (7) | 100.8 | 3.0 | 29 | 24 | `p` | 0.000 |
| profile--experience | 360 | dark | 637.1 | 11.5 | 23.9 | 219.4 | 307.0 (7) | 73.7 | 1.6 | 28 | 28 | `p` | 0.000 |

## Fonts

Each load fetches 7 font files, 7 different files in all:

- `cormorant_garamond_latin_wght_normal-s.0jvcp-grhfvvq.woff2`: 54 of 54 loads
- `im_fell_english_latin_400_italic-s.1y9qe_7x2ofb7.woff2`: 54 of 54 loads
- `im_fell_english_latin_400_normal-s.19q4vxlgtk0rb.woff2`: 54 of 54 loads
- `jetbrains_mono_latin_wght_normal-s.2rmhnsrc80fag.woff2`: 54 of 54 loads
- `nunito_latin_wght_normal-s.1wzrasd95pxo_.woff2`: 54 of 54 loads
- `source_serif_4_latin_wght_normal-s.2bbm7w9b-e07f.woff2`: 54 of 54 loads
- `unifrakturmaguntia_latin_400_normal-s.149sar0gtc4by.woff2`: 54 of 54 loads

## Problems

Every view reached its state.
