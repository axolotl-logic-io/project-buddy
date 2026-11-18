# Mockup view sources

This folder holds the sources of the redesign's mockup pages. `build.py` turns each source into a self-contained page in `views/` and builds the component specimen from `_specimen.html`. Edit the sources here; the build overwrites everything in `views/`.

## Folder layout

- `VIEW--STATE.html`: one mockup page, such as `quests--empty.html`. The build writes it to `views/VIEW--STATE.html`.
- `_partials/NAME.html`: a shared fragment, such as the site header or the quest sidebar. Views and other partials include it by name.
- `_partials/icons.html`: the icon sprite. The build puts it at the top of every page.
- `_specimen.html`: every component in every state. The build repeats it once per appearance in `system/specimen.html`.

## Build the mockups

To build every view, the specimen and the gallery, run this from anywhere:

```sh
python3 outputs/theme-redesign/build.py
```

The build uses only the Python 3 standard library. It reads:

- the sources in this folder;
- `system/tokens.css` and `system/components.css`;
- each appearance's `tokens.css` and `ornaments.svg` in `themes/APPEARANCE/`, or in `themes/_template/APPEARANCE/` when the appearance has no `tokens.css` yet;
- the fonts in `apps/web/src/themes/fonts/`, the textures in `apps/web/public/textures/` and the construct images in `apps/web/public/constructs/`, unchanged.

It writes `views/*.html`, `views/assets/bundle.css`, `views/assets/view.js`, `views/assets/constructs/`, `system/specimen.html` and `index.html`. Each file is written to a temporary file in the same folder and then moved into place, so several threads can run the build at once. A reader never sees a half-written file. After building, the script deletes any `views/*.html` page whose source no longer exists.

## View file format

A view starts with a metadata comment, then holds its markup:

```html
<!--meta
title: Quests list, empty
note: The empty state has an emblem ornament slot and a rubricated initial.
capture: quests--empty
-->
<!-- include:quests-body panel="" empty="yes" -->
```

- `title` names the view in the gallery and the page title.
- `note` tells a reviewer what to look at.
- `capture` names the screenshot in `capture/screenshots/` that the gallery shows beside the view. Leave it out when the current app has no matching screen.

## Template syntax

The build expands a small template language. It has no loops and no expressions.

| Syntax | Meaning |
| --- | --- |
| `<!-- include:NAME key="value" -->` | Insert `_partials/NAME.html`, rendered with the given values. |
| `{{key}}` | The value of `key`. A missing value becomes an empty string. |
| `{{?key}}…{{/?}}` | Keep the body when `key` is set and not empty. |
| `{{?key=VALUE}}…{{/?}}` | Keep the body when `key` equals `VALUE`. |
| `{{!key}}…{{/!}}` | Keep the body when `key` is missing or empty. |
| `{{!key=VALUE}}…{{/!}}` | Keep the body when `key` does not equal `VALUE`. |

In the table, `NAME` is a partial's file name without `.html`, `key` is a value's name and `VALUE` is the text to compare against.

These rules apply:

- A partial sees only the values on its own include line. To pass a value further down, repeat it on the nested include, such as `checked="{{checked}}"`.
- Conditionals may nest. The build resolves the innermost first.
- An include value that holds markup writes the markup's attributes in single quotes, because the include itself uses double quotes. Write an apostrophe in such a value as `’`.
- To show a literal brace, write `&#123;`. The spell editor uses it for `{{spell}}` placeholders.
- A `parents` value written as labels separated by `|`, such as `parents="Quests"`, becomes the trail band's breadcrumb links.

## Forced states

A mockup cannot hover or press. To show a state without a pointer, add `data-force` to the element:

```html
<button class="button-primary" type="button" data-force="hover">Save Quick Note</button>
```

The value is one or more of `hover`, `focus` and `active`, separated by spaces. The build copies every rule in `components.css` that uses `:hover`, `:focus-visible` or `:active` into a rule that matches the attribute instead. Production code never uses `data-force`.

## Page parameters

Each page in `views/` reads these query parameters:

| Parameter | Values | Default |
| --- | --- | --- |
| `appearance` | `light`, `soot-brass`, `dark` | `light` |
| `width` | `1280`, `360` | `1280` |
| `bare` | no value | not set |

The appearance values are the app's theme cookie values: `light` is Ivory Vellum, `soot-brass` is Soot & Brass and `dark` is Espresso Leather. For example, this address opens the empty quests list in Soot & Brass at phone width:

```text
views/quests--empty.html?appearance=soot-brass&width=360
```

The page shows a toolbar with an appearance switcher and a width toggle, and shows the mockup in a frame of the chosen width. The appearance switcher and the swatches inside the mockup stay in step.

## Bare mode

In bare mode the page shows the mockup alone, with no toolbar and no frame. The page is bare when any of these is true:

- the address has `bare`, such as `?appearance=dark&width=360&bare`;
- the page sits inside an iframe;
- the address gives `width`, and the window is no wider than that width plus 40 px.

A screenshot tool that sets its viewport to the chosen width therefore gets the mockup alone. Inside an iframe, choosing a swatch sends `{ pbAppearance: VALUE }` to the parent window with `postMessage`, where `VALUE` is the chosen appearance.

## Screenshots

`system/shoot.mjs` takes the redesign's own screenshots. To shoot every view and the specimen, run this from the repository root:

```sh
node outputs/theme-redesign/system/shoot.mjs --out /tmp/pb-shots
```

To shoot only some, give specs in the form `VIEW@MODE@WIDTH`, where `VIEW` is a view name or `specimen`, `MODE` is an appearance value and `WIDTH` is `1280` or `360`. Leave out `MODE` or `WIDTH` to shoot every value:

```sh
node outputs/theme-redesign/system/shoot.mjs --out /tmp/pb-shots sign-in--default@light@1280 quests--empty@@360
```

The script reports horizontal overflow and script errors. Without `--out`, it writes to `system/evidence/`.

The page texture uses `background-attachment: fixed`, as the app does. A full-page screenshot paints a fixed background only over the first screen, so the texture would stop at 900 px. The script instead grows the viewport to the page's height, up to 16,000 px, and takes an ordinary screenshot. The specimen is taller than that, so the script shoots each appearance's section of it on its own.

To shrink a folder of shots to a 128-colour palette before committing them, run this (it needs Pillow):

```sh
python3 -I outputs/theme-redesign/system/compress.py /tmp/pb-shots
```
