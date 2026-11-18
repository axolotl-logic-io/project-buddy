# Theme redesign components

This page describes the component layer in `components.css`: what each component is for, its markup, its states and what it replaces in the current site. `THEME-INTERFACE.md` describes the tokens a theme sets. `tokens.css` lists the token defaults.

Every rule in `components.css` reads semantic tokens only. A component chooses a role, such as `--frame-ink` or `--ornament-ink`, and never a palette colour. A theme changes how a component looks by setting token values and ornament assets, not by adding rules.

To see every component in every state and appearance, open `system/specimen.html`. To see them in context, open a view in `views/`.

## Rules for every component

### Touch targets

Every control's hit area is at least `--target-size` (2.75rem, 44 px) tall, while its drawing keeps its own size. WCAG 2.2 success criterion 2.5.8 asks for 24 px. The site asks for 44 px, as the current site does for its checkboxes. The component layer reaches it in four ways:

| Control | How it reaches 44 px |
| --- | --- |
| A link in running text (`text-link`) or a breadcrumb link (`trail-parents a`) | A transparent `::before`, centred on the text, `max(100%, var(--target-size))` tall. The text keeps its place in the line, and the focus outline stays on the text. |
| A button (`button-*`, `icon-button`, `tab`, `menu-item`, `collection-tab`, `choice-tile`, `panel-link`) | `min-block-size: var(--target-size)`. A compact button, such as the Undo in a tasks change, keeps small padding but not a small target. |
| A checkbox in an editable list (`editable-check input`) | The input itself is 44 × 44 with `appearance: none`. Its `::before` draws the 20 px ring and its `::after` the tick. |
| A label that wraps a radio or checkbox (`icon-line`) | The label is the control's target, so it sets `min-block-size: var(--target-size)`. |

A probe run over every view, in every appearance, at 1280 px and 360 px found no target under 44 px. It counts `::before` and `::after` boxes and an enclosing `<label>`.

### Focus

Every focusable control shows `--focus-outline` at `--focus-offset` on `:focus-visible`. Inside the site header, the outline uses `--header-focus` instead, because the header has its own dark or light band. Focus never relies on colour alone: it is always an outline.

### Ornament

Ornament is decoration. Each ornament element is `aria-hidden="true"` or a pseudo-element, holds no text and takes no room when the theme leaves it blank. No ornament changes an element's accessible name.

### Forced states

A mockup cannot hover or press. The mockups add `data-force="hover"`, `"focus"` or `"active"` to show a state; `views-src/README.md` explains it. Production markup never uses `data-force`.

## Component catalogue

Each entry gives the line in `components.css` where the component starts.

### Elements (line 11)

The elements layer resets lists, fieldsets, legends, buttons and media, and sets body type, link colour and `code`. It defines `sr-only` (line 109); `muted` sits with the icon rules (line 185).

**Replaces:** Tailwind preflight's resets, kept, and the `text-muted` utility.

### Icon (line 120)

An inline SVG icon from the sprite, sized to the text.

```html
<svg class="icon" aria-hidden="true"><use href="#i-pencil"/></svg>
<span class="icon-line"><svg class="icon" aria-hidden="true"><use href="#i-check"/></svg>Saved</span>
<a class="text-link" href="URL">Open your experience</a>
```

- **Classes:** `icon`, `icon-line` (an icon beside text), `text-link`.
- **States:** `text-link` has hover and focus; visited links keep the link colour.
- **Replaces:** `icon`, `icon-line`, `text-link`; the `lucide` classes the icon library adds get no rule. React: `components/ui/icon.tsx`.
- **Accessibility:** an icon is always `aria-hidden="true"`. An icon-only control takes its name from `aria-label` or `sr-only` text. A link reaches 44 px through its `::before`.

### Ornament slot (line 189)

A slot that paints one ornament asset from the theme: the divider glyph, the heading mark, the empty-state emblem or the vignette.

```html
<span class="ornament" data-ornament="heading" aria-hidden="true"></span>
```

- **Classes:** `ornament` with `data-ornament="divider"`, `"heading"`, `"emblem"` or `"vignette"`.
- **How it paints:** the slot sets `--orn-main` and `--orn-accent` from the theme's `--orn-*` tokens. `::before` paints the main asset as a mask in `--ornament-ink`; `::after` paints the accent asset in `--ornament-accent-ink`.
- **Sizes:** each kind reads its own size token, which defaults to 0px, so a blank slot takes no room. A vignette is never wider than its container, and its height follows `--orn-vignette-ratio`.
- **Other ornament:** frame corners, the trail band, notice marks, rule ends, bullets, swatch faces and portrait frames are pseudo-elements of their own components, not slots.
- **Replaces:** nothing. The current site has no ornament slots; `page-decoration` and `panel-decoration` were the only decoration roles.
- **Accessibility:** always `aria-hidden="true"`, with no text.

### Frame (line 251)

A framed box: a border, an optional inner keyline and four corner ornaments. Cards, panels, dialog panels and the sign-in card are frames.

```html
<section class="panel" aria-labelledby="ID">…</section>
<section class="card" data-frame="feature" aria-labelledby="ID">…</section>
<div class="card-header"><h2 class="card-title" id="ID">Title</h2><button class="button-quiet" type="button">Rename</button></div>
<div class="card-actions">…</div>
```

- **Classes:** `panel`, `card`, `card-header`, `card-actions`. `dialog-panel`, `collection-panel`, `chat-transcript`, `quest-sidebar` and `site-panel` share the frame rules.
- **Variants:** `data-frame="feature"` gives a card the feature corner size; the sign-in card uses it.
- **Corners:** each kind reads its own size token: `--orn-corner-panel-size`, `--orn-corner-dialog-size`, `--orn-corner-feature-size` and `--orn-corner-card-size` (0px by default). A frame inside another frame, a list or a side menu has no corners.
- **Replaces:** `panel`, `card`, `card-actions`, `current-quest-body`, `prompt-editor-name`, `prompt-sheet`, `signed-in-days-card`, `profile-name`, `profile-name-row`. React: `components/ui/page-frame.tsx` and every page that draws a `panel` or `card`.

### Headings (line 350)

Display and section type.

```html
<h1 class="site-title">Project Buddy</h1>
<h1 class="page-heading">Quests</h1>
<h2 class="section-heading" id="ID"><span class="ornament" data-ornament="heading" aria-hidden="true"></span>Abilities</h2>
<h2 class="card-title" id="ID">Days signed in</h2>
<p class="lede"><span class="lede-initial">N</span>o quests yet.</p>
```

- **Classes:** `site-title`, `page-heading`, `section-heading`, `card-title`, `lede`, `lede-initial`.
- **Type roles:** `site-title` and `page-heading` use `--display-font`, `--display-weight` and `--display-tracking`. `lede-initial` uses `--initial-font`, `--initial-size`, `--initial-float`, `--initial-gap` and `--rubric`.
- **Replaces:** `site-title`, `page-heading`, `section-heading`, `card-title`, `prompt-editor-heading`, `profile-name-heading`, `bucket-heading`, `workspace-intro`. React: `app/(auth)/…/sign-in-panel.tsx`, `visits/signed-in-days-card.tsx` (its utility-built heading becomes `card-title`).
- **Accessibility:** the initial is part of the word's text, so screen readers read the word whole. Heading levels follow the page outline, not the class.

### Rule and divider (line 402)

A free-standing rule, and a divider with a glyph at its centre.

```html
<hr class="rule">
<div class="divider"><span class="ornament" data-ornament="divider" aria-hidden="true"></span></div>
```

- **Classes:** `rule`, `divider`.
- **Tokens:** `--rule-ink`, `--rule-style`, `--rule-width`; the optional rule-end terminals (`--orn-rule-end-*`) shorten the line by one terminal at each end. The terminals mirror in right-to-left text.
- **Replaces:** `panel-rule` in the page body (the site panel keeps its own `panel-rule`).
- **Accessibility:** an `hr` is a separator; a `divider` is decoration, and the ornament inside it is hidden.

### Letterpress actions (line 456)

Buttons, and links that look like buttons.

```html
<button class="button-primary" type="submit">Save spell</button>
<button class="button-secondary" type="button"><svg class="icon" aria-hidden="true"><use href="#i-plus"/></svg>Add a reply</button>
<button class="icon-button" type="button" aria-label="Rename" title="Rename"><svg class="icon" aria-hidden="true"><use href="#i-pencil"/></svg></button>
```

- **Classes:** `button-primary`, `button-secondary`, `button-danger`, `button-quiet`, `button-quiet-danger`, `icon-button`, `button-label` (a label hidden on a phone).
- **States:** hover, focus, active (pressed), `:disabled`, `aria-busy="true"` (a dashed border and the progress cursor, the label kept), `aria-expanded="true"` and `aria-pressed="true"` on `icon-button`.
- **Tokens:** `--action-font`, `--action-radius`, `--action-line-width`, `--action-fill`, `--on-action`, `--action-paper`, `--action-ink`, `--action-hover-shadow`, `--action-pressed-shadow`.
- **Replaces:** `button-primary`, `button-secondary`, `button-danger`, `button-quiet`, `button-quiet-danger`, `panel-toggle`, `site-panel-close`, `quest-title-edit`, `editable-more`. React: `components/ui/button.tsx`.
- **Accessibility:** an icon-only button has `aria-label` and a matching `title`. A button's accessible name contains its visible text.

### Fields (line 582)

Text inputs, selects, textareas and the composer's box.

```html
<div class="field">
  <label class="field-label" for="ID">Name</label>
  <input class="input-field" id="ID" aria-describedby="ID-hint ID-error" aria-invalid="true">
  <p class="field-error" id="ID-error"><svg class="icon" aria-hidden="true"><use href="#i-alert"/></svg><span>Give the spell a name.</span></p>
  <p class="field-hint" id="ID-hint">At most 120 characters.</p>
</div>
<span class="select-field"><select class="input-field">…</select><svg class="icon select-chevron" aria-hidden="true"><use href="#i-chevron-down"/></svg></span>
```

- **Classes:** `form-stack`, `field`, `field-label`, `field-hint`, `field-error`, `input-field`, `select-field`, `select-chevron`, `field-box`, `field-box-control`, `duration-fields` (in the Timer section).
- **States:** focus, `aria-invalid="true"`, disabled. `field-box` shows its control's focus with `:focus-within`.
- **Replaces:** `field`, `field-label`, `field-hint`, `input-field`, `field-box`, `field-box-control`, `error-text`, `quest-note-hint`, `chat-composer-field`, the select utility cluster in `components/ui/field.tsx:137–142`, and the spell error's missing gap. React: `components/ui/field.tsx`, `components/ui/text-list-field.tsx`.
- **Accessibility:** every input has a `<label>` or `aria-label`; hints and errors are tied with `aria-describedby`; an error has an icon and text, not colour alone.

### Notice and form status (line 693)

A notice in the page, and a short live status after a form action.

```html
<div class="notice" role="status"><svg class="icon" aria-hidden="true"><use href="#i-check"/></svg><div class="notice-body"><p>…</p></div></div>
<div class="notice notice-error" role="alert">…</div>
<p class="form-status" role="status">Fix the highlighted field to save.</p>
```

- **Classes:** `notice`, `notice-error`, `notice-body`, `form-status`.
- **Ornament:** the optional `--orn-notice` mark sits over the top start corner and takes no room.
- **Replaces:** `notice`, `quest-status-feedback`, `prompt-editor-save-hint`. React: `components/ui/form-message.tsx`.
- **Accessibility:** a status uses `role="status"`, an error `role="alert"`.

### Page frame (line 757)

The page's columns and the room the docked site panel takes.

```html
<div class="app">… <main class="page"><div class="page-column">…</div></main></div>
```

- **Classes:** `app`, `page`, `page-column`, `page-frame-wide`, `page-row`, `page-centre`.
- **States:** with the site panel docked open (`site-panel[data-open]`, 64rem and wider), the page and the trail band make room for it instead of running under it.
- **Replaces:** `workspace-frame`, `page-column`, `page-frame-editor`, `page-workspace`, `page-workspace-heading`, `workspace-content`, and the layout utilities on the sign-in, profile, construct and settings pages. React: `components/ui/page-frame.tsx`, `components/page-workspace.tsx`, `app/(workspace)/layout.tsx`.
- **Fixes:** the docked site panel no longer covers the quests list at 1280 px.

### Site header (line 813)

The band at the top: the site's name and the experience ring.

```html
<header class="site-header">
  <a class="hud-title" href="/quests"><span class="hud-medallion" aria-hidden="true">…</span><span class="hud-name">Project Buddy</span></a>
  <div class="site-header-tools"><a class="progress-ring" href="/profile" aria-label="Circle 4 · Initiate: …">…</a></div>
</header>
```

- **Classes:** `site-header`, `hud-title`, `hud-medallion`, `hud-name`, `site-header-tools`.
- **Tokens:** `--header-ink`, `--header-paper`, `--header-line`, `--header-gold`, `--header-decoration`, `--header-focus`.
- **Replaces:** `site-header`, `hud-title`, `hud-medallion`, `hud-name`, `header-title` (in the header). React: `components/site-header.tsx`, `components/signed-in-header.tsx`.

### Trail band (line 879)

The sticky band under the header: the site panel toggle, the breadcrumbs, the page's heading and the page's tools.

```html
<section class="trail-band" aria-label="Page trail">
  <button class="icon-button" type="button" aria-controls="site-panel" aria-expanded="false" title="Site panel">…<span class="sr-only">Site panel</span></button>
  <span class="trail-divider" aria-hidden="true"></span>
  <div class="trail-content">
    <div class="trail-path"><nav class="trail-parents" aria-label="Breadcrumbs"><ol><li><a href="/quests">Quests</a><span aria-hidden="true">/</span></li></ol></nav><h1 class="trail-heading">Read Latin on old maps</h1></div>
    <div class="trail-tools">…</div>
  </div>
</section>
```

- **Classes:** `trail-band`, `trail-divider`, `trail-content`, `trail-path`, `trail-parents`, `trail-heading`, `trail-tools`, `trail-note`.
- **Look:** opaque (`--trail-surface` with `--trail-decoration`), so content scrolls under it, never through it. The `--orn-band` border runs along its foot.
- **Replaces:** `trail-band`, `trail-content`, `trail-parents`, `breadcrumb-separator`, `trail-heading`, `quest-title`, `timer-trail-tools`, `construct-trail-tools`, `site-panel-toggle`, `timer-panel-toggle`, `quest-sidebar-expand`, `panel-edge-tab`, `header-panel-control`. React: `components/site-header.tsx`, `components/header-links.tsx`, `components/timer/timer-trail-tools.tsx`, `components/quest-title.tsx`, `components/conversation-panel.tsx` (its edge tabs move here).
- **Fixes:** text no longer shows through the band; the phone timer heading clamps to two lines instead of being cut short.
- **Accessibility:** the trail heading is the page's `h1`. Breadcrumb links reach 44 px through `::before`.

### Site panel (line 999)

The site's navigation: links, the appearance swatches and the account. Docked beside the page from 64rem; a modal drawer below it.

```html
<dialog class="site-panel" id="site-panel" aria-labelledby="site-panel-title" open data-open="always">
  <div class="site-panel-heading"><button class="icon-button" type="button" aria-controls="site-panel" aria-expanded="true" aria-label="Close site panel">…</button><h2 id="site-panel-title">Site panel</h2></div>
  <nav class="panel-nav" aria-label="Site panel">
    <div class="panel-group"><p class="panel-label" id="site-panel-places">Places</p><ul class="panel-links" aria-labelledby="site-panel-places"><li><a class="panel-link" href="/quests" aria-current="page">Quests</a></li></ul></div>
  </nav>
</dialog>
```

- **Classes:** `site-panel`, `site-panel-heading`, `panel-label`, `panel-nav`, `panel-links`, `panel-link`, `panel-group`, `panel-rule`.
- **States:** `data-open` (open), `data-open="always"` (docked on a desktop), `panel-link[aria-current="page"]`.
- **Tokens:** `--navigation-surface`, `--panel-decoration`, `--panel-label-case`, `--panel-label-tracking`, `--panel-separator`, `--panel-separator-size`, `--orn-bullet`.
- **Replaces:** `site-panel`, `site-panel-heading`, `panel-label`, `panel-link`, `panel-rule`, `timer-panel` (the timer preferences drawer is a site panel on the right). React: `components/site-panel.tsx`, `components/timer/timer-preferences.tsx`.
- **Accessibility:** below 64rem the panel is a modal drawer over an undimmed page, as `docs/chats.md` says: its `::backdrop` stays transparent, and its shadow sets it apart. `site-header.browser.test.tsx` checks the backdrop.

### Appearance swatch (line 1129)

A native radio per appearance. The face sets `data-mode`, so it shows that appearance's own texture, palette and swatch ornament.

```html
<fieldset class="appearance-fieldset">
  <legend class="panel-label">Theme</legend>
  <div class="appearance-swatches">
    <label class="appearance-swatch" data-size="large">
      <input class="appearance-swatch-input" type="radio" name="theme" value="dark" aria-label="Espresso Leather" checked>
      <span class="appearance-swatch-face" data-mode="dark" aria-hidden="true"></span>
      <span class="appearance-swatch-tooltip" role="tooltip"><span class="appearance-swatch-name">Espresso Leather</span></span>
    </label>
  </div>
</fieldset>
```

- **Classes:** `appearance-fieldset`, `appearance-swatches`, `appearance-swatch`, `appearance-swatch-input`, `appearance-swatch-face`, `appearance-swatch-name`, `appearance-swatch-tooltip`.
- **States:**
  - resting;
  - selected: a solid ring on the label;
  - keyboard focus: a dashed outline outside the ring, and the tooltip;
  - hover: the tooltip;
  - `data-show-tooltip`: the tooltip without a pointer;
  - `data-size="large"`: the Settings size.
- **Views:** `settings--default` (resting and selected), `settings--swatch-focus` (keyboard focus), `settings--swatch-tooltip` (hover on the last swatch, as `visual-compare` does) and `site-panel--open` (the panel's swatches).
- **Replaces:** `appearance-settings`, `panel-modes`, `panel-mode`, `theme-choice-input`, `theme-swatch`, `theme-choice-tooltip`, `theme-choice-name`. React: `components/appearance-choices.tsx`.
- **Accessibility:** the radio's name is the appearance's name, and the label's text is that name alone. The face carries the texture and ornament and is hidden from assistive technology, so ornament adds no words. The tooltip is a `role="tooltip"` that shows on hover and while the choice has focus, stays while the pointer moves onto it, and hides on Escape: the app's script sets `data-tooltip-dismissed`. `appearance-choices.browser.test.tsx` checks each of these.

### Tabs (line 1246)

A row of tabs over panels: the quest sidebar's collections and the spell editor's messages.

```html
<div class="tabs" role="tablist" aria-label="Collections">
  <button class="tab" type="button" role="tab" aria-selected="true" aria-controls="panel-tasks">Tasks</button>
</div>
<div class="tab-panel" role="tabpanel" id="panel-tasks">…</div>
```

- **Classes:** `tabs`, `tab`, `tab-panel`.
- **States:** `aria-selected="true"`, `aria-current="page"` (tabs that are links), hover, focus, and `aria-orientation="vertical"` for the spell editor.
- **Layout:** the row wraps rather than scrolls, so no label is cut off on a phone.
- **Replaces:** `workspace-rail`, `workspace-tablist`, `workspace-tab`, `prompt-editor-nav`, `prompt-editor-field`, `panel-utility-content`, and the overflow menu `workspace-menu-tab`, `workspace-menu`, `workspace-menu-item`, `workspace-menu-check`, which the wrapping row makes unneeded. React: `components/workspace-tabs.tsx`, `components/panel-collections.tsx`, `components/prompt-editor.tsx`.
- **Accessibility:** the arrow keys move between tabs as Radix Tabs does today.

### Collection (line 1303)

Folder tabs over a list of rows. The quests list and the Spellbook share it.

```html
<nav class="collection-tabs" aria-label="Quests"><a class="collection-tab" href="?status=active" aria-current="page">Active <span class="collection-count">3</span></a></nav>
<div class="collection-panel">
  <ul class="collection-list">
    <li class="collection-row"><span class="collection-mark">…</span><span class="collection-text"><a class="collection-link" href="URL">Read Latin on old maps</a><span class="collection-meta">…</span></span><span class="collection-end">…</span></li>
  </ul>
</div>
```

- **Classes:** `collection-tabs`, `collection-tab`, `collection-count`, `collection-panel`, `collection-list`, `collection-row`, `collection-mark`, `collection-text`, `collection-link`, `collection-meta`, `collection-end`.
- **States:** `collection-tab[aria-current="page"]` joins the panel; hover and focus on the tab and the row's link.
- **Layout:** the tabs wrap in source order. Below 30rem they use two columns and the selected tab has a visible border. The count uses lining figures.
- **Replaces:** all `quests-index-*` roles, `quest-sharing-mark`, `divided-rows`, `divided-row-action`. React: `components/quest-status-tabs.tsx`, `components/quest-list.tsx`, `components/pending-quests.tsx`, `app/(workspace)/spellbook/spell-index.tsx`, `forgotten-list.tsx`, `progress-timeline.tsx`, `quest-members.tsx`.
- **Fixes:** the Spellbook no longer borrows the quests list's roles; `forgotten-list.tsx`'s utility cluster on Restore goes.

### Choice tile (line 1456)

A large button that starts something: the ways to start a quest.

```html
<div class="choice-tiles"><button class="choice-tile" type="button"><svg class="icon" aria-hidden="true">…</svg><span class="choice-tile-name">Learn a thing</span><span class="choice-tile-hint">Practise a skill</span></button></div>
```

- **Classes:** `choice-tiles`, `choice-tile`, `choice-tile-name`, `choice-tile-hint`.
- **States:** hover, focus, active, `aria-expanded="true"` while its dialog is open.
- **Replaces:** `quest-start`, `quest-start-tiles`, `quest-start-tile`. React: `components/quest-start.tsx`.
- **Accessibility:** the button's name comes from its content, the name and the hint. The current tile names itself with `aria-labelledby` (the name alone) and shows the hint too, which fails axe's `label-content-name-mismatch` on 12 views. Drop `aria-labelledby`, or keep it and point it at both the name and the hint.

### Current quest card (line 1518)

The quest you were last in, at the top of the quests list.

```html
<section class="card current-quest" aria-labelledby="ID"><p class="current-quest-label">Current quest</p><h2 class="card-title" id="ID">…</h2>…</section>
```

- **Classes:** `current-quest`, `current-quest-label`.
- **Replaces:** `current-quest`, `current-quest-body`, `current-quest-label`. React: `components/current-quest.tsx`.

### Empty state (line 1532)

What a list shows when it has nothing in it.

```html
<div class="empty-state">
  <span class="ornament" data-ornament="vignette" aria-hidden="true"></span><span class="ornament" data-ornament="emblem" aria-hidden="true"></span>
  <p class="empty-state-heading">No open tasks</p>
  <p class="empty-state-copy">Add the next piece of agreed work.</p>
</div>
```

- **Classes:** `empty-state`, `empty-state-heading`, `empty-state-copy`; a `lede` with a `lede-initial` on a page-level empty state.
- **Ornament:** the emblem uses `--orn-empty-emblem-size`, so a theme can show a vignette alone here and keep the sign-in card's emblem. In the quest sidebar, the vignette is hidden and the emblem shows alone at `--orn-emblem-size`, because the sidebar is too narrow for both.
- **Replaces:** `quests-index-empty`, `bucket-empty`, `bucket-empty-heading`, `bucket-empty-copy`. React: `quest-list.tsx`, `spell-index.tsx`, `pending-quests.tsx`, `quest-ideas.tsx`, `quest-notes.tsx`, `tasks/task-rows.tsx`.

### Editable list (line 1569)

Tasks, Ideas, Quick Notes and spell replies: rows you check off, edit, reorder and remove.

```html
<ul class="editable-list" aria-label="Tasks">
  <li class="editable-row">
    <span class="editable-check"><input type="checkbox" aria-label="Check off “TASK”"></span>
    <span class="editable-text">TASK</span>
    <span class="editable-actions"><button class="icon-button" type="button" aria-haspopup="menu" aria-expanded="false" aria-label="Actions for “TASK”">…</button></span>
  </li>
</ul>
<div class="editable-add"><input class="input-field" aria-label="New task"><button class="button-secondary" type="button">Add</button></div>
<details class="done-list"><summary class="list-summary">…Done (2)</summary>…</details>
```

`TASK` stands for the row's text.

- **Classes:** `editable-list`, `editable-row`, `editable-check`, `editable-text`, `editable-actions`, `editable-done`, `editable-add`, `done-list`, `list-summary`.
- **States:**
  - the checkbox is resting, hover, focus-visible or checked;
  - a done row has `editable-done`;
  - a row being edited holds an `input-field` in place of its text;
  - in the spell replies, `editable-check` holds the drag handle.
- **Replaces:**
  - `editable-list`, `editable-row`, `editable-check`, `editable-text`, `editable-actions`;
  - `editable-leading`, `editable-grip`, `editable-more`, `editable-detail`, `editable-add`, `editable-add-form`, `editable-form`;
  - `editable-badge`, `idea-decision`, `tasks-done`.
- **React:** `components/ui/editable-list.tsx`, `components/tasks/task-rows.tsx`, `components/quest-ideas.tsx`, `components/quest-notes.tsx`, `components/ui/text-list-field.tsx`.
- **Accessibility:** each checkbox and action button names its row. The checkbox is 44 × 44.

### Menu (line 1680)

A pop-up list of actions or options: a row's actions and the composer's commands.

```html
<div class="menu" role="menu" aria-label="Actions for “TASK”">
  <p class="menu-label" aria-hidden="true">#3</p>
  <div class="menu-item" role="menuitem" aria-disabled="true">…Move up</div>
  <div class="menu-item menu-item-danger" role="menuitem">…Remove task</div>
</div>
```

- **Classes:** `menu`, `menu-label`, `menu-item`, `menu-item-danger`, `menu-hint`.
- **States:** `data-highlighted` (Radix's keyboard highlight), `aria-selected="true"` in a listbox, `aria-disabled="true"`, hover.
- **Replaces:** `editable-menu`, `editable-menu-label`, `editable-menu-item`, `command-menu`, `command-list`, `command-option`, `command-hint`. React: `components/ui/editable-list.tsx`, `components/chat/command-menu.tsx`.

### Dialog (line 1740)

A modal dialog over a scrim.

```html
<div class="dialog-overlay">
  <div class="dialog-panel" role="alertdialog" aria-modal="true" aria-labelledby="ID" aria-describedby="ID-copy">
    <h2 class="dialog-title" id="ID">Delete this milestone?</h2><p id="ID-copy">…</p>
    <div class="dialog-actions"><button class="button-danger" type="button">Delete milestone</button><button class="button-secondary" type="button">Keep it</button></div>
  </div>
</div>
```

- **Classes:** `dialog-overlay`, `dialog-panel`, `dialog-title`, `dialog-actions`.
- **Tokens:** `--scrim`, `--frame-decoration`, `--orn-corner-dialog-size`.
- **Replaces:** `dialog-overlay`, `dialog-panel`, `quest-title-input` (in its dialog), `quest-note-composer` (in the Quick Note dialog). React: `components/form-dialog.tsx`, `components/ui/confirm-dialog.tsx`, `components/quick-note.tsx`, `components/quest-title.tsx`, `adventure-character-header.tsx`.
- **Accessibility:** Radix Dialog keeps focus inside and returns it on close, as it does today.

### Progress ring (line 1775)

One ring for the header's medallion and the Profile's experience card.

```html
<a class="progress-ring" href="/profile" aria-label="Circle 4 · Initiate: 4 more experience to reach circle 5. Open your experience.">
  <svg class="progress-ring-svg" viewBox="0 0 40 40" aria-hidden="true">
    <circle class="progress-ring-disc" cx="20" cy="20" r="18"/>
    <circle class="progress-ring-track" cx="20" cy="20" r="16" pathLength="100"/>
    <circle class="progress-ring-arc" cx="20" cy="20" r="16" pathLength="100" stroke-dasharray="60 100"/>
  </svg>
  <span class="progress-ring-label" aria-hidden="true">4</span>
</a>
```

- **Classes:** `progress-ring`, `progress-ring-svg`, `progress-ring-disc`, `progress-ring-track`, `progress-ring-arc`, `progress-ring-label`, `progress-ring-caption`.
- **Variants:** `data-size="card"` for the Profile card, with the caption "Circle"; on the card the ring is `role="img"` with an `aria-label`.
- **Tokens:** `--ring-track`, `--ring-arc`, `--ring-disc`, `--ring-ink`, `--ring-stroke`, `--numeral-font`.
- **Replaces:** all `circle-progress-*` and `profile-ring-*` roles. React: `components/experience/circle-progress.tsx` and the ring in `experience-card.tsx` become one component.

### Profile (line 1854)

The experience card and the ability tiles.

- **Classes:** `profile-card`, `profile-standing`, `profile-title`, `ability-tiles`, `ability-tile`, `ability-name`, `ability-number`, `ability-hint`.
- **States:** `ability-tile[data-most]` marks the ability with the most experience; the hint also says so in words.
- **Replaces:** `profile-card`, `profile-card-body`, `profile-title`, `profile-progress`, `profile-standing`, `profile-next`, every `ability-*` role. `ability-badge`, `ability-icon`, `ability-count`, `ability-worth` and `ability-tile-untried` retire. React: `components/experience/experience-card.tsx`, `components/experience/ability-tiles.tsx`, `app/(workspace)/profile/name-form.tsx`.

### Construct portrait and avatar (line 1919)

A construct's portrait, and its round avatar beside a reply.

```html
<span class="construct-portrait" role="img" aria-label="Vellum"><svg aria-hidden="true" focusable="false">…</svg></span>
<span class="construct-avatar" aria-hidden="true"><svg aria-hidden="true" focusable="false">…</svg></span>
```

- **Classes:** `construct-portrait`, `construct-avatar`; `collection-mark` also holds construct art.
- **Art:** an image or the inline v2 drawing from `artwork/`. Each box is a size container, so the drawing drops fine detail when it is small. The drawing takes its colours from the `--construct-*` roles (`artwork/construct-art.css`).
- **Tokens:** `--portrait-radius` (50% for a round medallion), `--orn-portrait`, `--orn-portrait-bleed`.
- **Replaces:** `construct-visual`, `construct-avatar`, `chat-opening`, `chat-presence`, `character-header-control` (a `button-quiet` holding an avatar). React: `components/constructs/construct-visual.tsx`, `components/chat/chat-message.tsx`, `adventure-character-header.tsx`.
- **Accessibility:** the portrait is one image with the construct's name; inline drawings are hidden from the accessibility tree.

### Conversation (line 1983)

The transcript of a quest's conversation.

```html
<div class="chat-thread"><ol class="chat-transcript">
  <li class="chat-message chat-message-construct"><span class="construct-avatar" aria-hidden="true">…</span><p class="chat-speaker">Lumen</p><div class="chat-message-body">…</div></li>
  <li class="chat-message chat-message-user"><p class="chat-speaker">You</p><div class="chat-message-body">…</div></li>
</ol></div>
<div class="tasks-change" role="group" aria-label="Tasks change"><p class="tasks-change-heading">…Tasks change<button class="button-quiet" type="button">Undo</button></p><p>Added “TASK”</p></div>
```

- **Classes:** `chat-thread`, `chat-transcript`, `chat-message`, `chat-message-user`, `chat-message-construct`, `chat-speaker`, `chat-message-body`, `tasks-change`, `tasks-change-heading`, `working-dots`.
- **States:** `chat-message[data-tone="error"]` for a failed reply; `working-dots` while a reply loads; list items in a reply use `--orn-bullet`.
- **Type:** `--conversation-font`, `--conversation-text-size`, `--conversation-leading`.
- **Replaces:**
  - every captured `chat-*` role in `chat.css`;
  - `tasks-change`, `tasks-change-heading`, `tasks-change-lines`, `tasks-message`, `tasks-command`;
  - `quest-conversation`, `chat-viewport`, `chat-reply-stopped`, `task-list-item`.
- **React:** `components/chat/chat-thread.tsx`, `chat-message.tsx`, `chat-parts.tsx`, `tasks-change-part.tsx`, `markdown.tsx`.
- **Keep as is:** `markdown` (prose styles) and the generated-image roles move into this section unchanged.
- **Accessibility:**
  - A tasks change is a named `group`, not an `aside`. The current site's repeated `<aside aria-label="Tasks change">` fails axe's `landmark-unique` on 10 views.
  - A scrolling code block in a reply needs `tabindex="0"` and a name, such as the code's language. Today it fails `scrollable-region-focusable`.

### Composer (line 2130)

The message box docked at the foot of the conversation.

```html
<div class="chat-composer-dock"><form class="chat-composer">
  <div class="field-box"><textarea class="field-box-control" aria-label="Message" aria-describedby="composer-hint"></textarea><button class="button-primary" type="submit">…</button></div>
  <p class="chat-composer-hint" id="composer-hint">Enter sends · Shift+Enter adds a line · / commands</p>
</form></div>
```

- **Classes:** `chat-composer-dock`, `chat-composer`, `chat-composer-hint`; the command menu is a `menu` with `role="listbox"`.
- **States:** busy (a Stop reply button), error (a `field-error` with `role="alert"`), commands open.
- **Replaces:** `chat-composer`, `chat-composer-dock`, `chat-composer-field`, `chat-composer-spell`. React: `components/chat/chat-composer.tsx`.
- **Layout:** the dock reserves its height before the conversation renders. Today the dock is the largest paint on the quest page, and the page shifts by 0.115 CLS at 1280 px.

### Skeleton (line 2159)

A placeholder shape while a page loads.

- **Classes:** `skeleton`.
- **Replaces:** `skeleton`. React: `components/ui/loading-skeleton.tsx`.
- **Accessibility:** the loading region has a status label, and the shapes are hidden. The shimmer runs only under `prefers-reduced-motion: no-preference`.

### Quest workspace (line 2179)

The quest page: the conversation beside the quest sidebar, a drawer below 64rem.

```html
<div class="page-frame-quest">
  <main class="quest-main">…</main>
  <aside class="quest-sidebar" id="quest-sidebar" aria-label="Quest side menu" data-open>
    <div class="quest-sidebar-heading"><h2>Quest</h2><button class="icon-button" type="button" aria-controls="quest-sidebar" aria-expanded="true" aria-label="Collapse quest sidebar">…</button></div>
    <section class="quest-next-task" aria-label="Next task">…</section>
    <div class="tabs" role="tablist" aria-label="Collections">…</div>
    <div class="tab-panel" role="tabpanel"><section class="bucket">…<div class="bucket-toolbar"><p class="bucket-summary">2 open · Agreed work</p>…</div></section></div>
    <div class="sidebar-sections">…</div>
  </aside>
</div>
```

- **Classes:** `page-frame-quest`, `quest-main`, `quest-sidebar`, `quest-sidebar-heading`, `quest-next-task`, `bucket`, `bucket-toolbar`, `bucket-summary`, `dated-list`, `sidebar-sections`.
- **States:** `quest-sidebar[data-open]` (open beside the page from 64rem), `quest-sidebar[data-drawer-open]` (the drawer below 64rem).
- **Replaces:**
  - `quest-workspace`, `adventure-layout`, `adventure-main`, `page-frame-quest`, `quest-sidebar-frame`;
  - `quest-sidebar`, `quest-panel-heading`, `quest-sidebar-collapse`, `quest-next-task`, `panel-utilities`;
  - `page-slot`, `tasks`, `bucket-desk`, `bucket-panel`, `bucket-tasks`, `bucket-ideas`, `bucket-notes`;
  - `bucket-toolbar`, `bucket-summary`, `bucket-description`.
- **React:** `components/quest-workspace.tsx`, `components/conversation-panel.tsx`, `components/panel-collections.tsx`, `components/quest-panel.tsx`, `components/quest-ideas.tsx`, `components/quest-notes.tsx`, `components/tasks/task-rows.tsx`.
- **Fixes:** the completed-quest notice no longer runs under the sidebar at 1280 px.

### Spell editor (line 2328)

The spell's definition and its messages.

- **Classes:** `editor-layout` (vertical tabs beside the panel), `save-bar` (save, cancel or discard, and the status).
- **Replaces:** `definition-editor`, `prompt-editor`, `prompt-editor-actions`, `prompt-editor-more`, `prompt-editor-name`. React: `components/prompt-editor.tsx`, `app/(workspace)/spellbook/[spellId]/page.tsx`.

### Timer (line 2354)

The timer's dial or hourglass and its setup, unchanged from `page-roles.css`. The appearance's `--timer-*` display tokens choose between them.

- **Classes:** every `timer-*` role, unchanged, and `duration-fields`, which stack when a column is too narrow to show "120 minutes (2 hours)".
- **Replaces:** every `timer-*` role (kept), `timer-others` (kept, in `trail-tools`). React: `components/timer/timer-display.tsx`, `timer-dial.tsx`, `timer-hourglass.tsx`, `timer-setup.tsx`.
- **Rule:** the timer area stays transparent. If an appearance ever gives the timer its own background, `docs/timer.md` must change in the same PR.

### Settings (line 2602)

- **Classes:** `settings-section`, a `panel` for each group of settings.
- **Replaces:** the page's layout utilities. React: `app/(workspace)/settings/page.tsx`.

### Label roles (line 2609)

Small labels share the theme's label face, case, small capitals and tracking: `chat-speaker`, `current-quest-label`, `menu-label`, a date in a `dated-list` and `progress-ring-caption`. The current quest label, a menu's label and a date also take `--label-weight`; the chat speaker (700), the ring's caption (600) and the site panel's labels (600) keep their own weights.

## Drift the components remove

`capture/inventory.md` lists where today's views style themselves outside the shared roles. The components remove each case:

- **Borrowed roles:** the Spellbook and the quests list share `collection-*` on purpose, and the construct page uses `page-row` instead of the spell editor's roles.
- **Duplicated roles:**
  - the header's ring and the Profile's ring are one `progress-ring`;
  - the days-signed-in card's heading is a `card-title`, not a utility cluster;
  - `chat-thread` is styled in one place.
- **Classes with no rule:** `panel-collections` becomes `sidebar-sections`, and `timer-engraving` keeps no rule, as before.
- **Utility clusters:** the select chevron is `select-field` and `select-chevron`. The page layouts use `page-column`, `page-row` and `page-centre`.
- **Inline styles:** none are added. The construct mockup's figure still uses an inline layout style, which the PR replaces with `page-row`.
- **Layout faults:**
  - the docked site panel and the completed-quest notice no longer run under other content;
  - the spell error has a gap below it;
  - the phone timer heading clamps to two lines;
  - the tabs wrap instead of being cut off.

## Role mapping

This table maps every role declared in today's `page-roles.css` and `chat.css` to its new class and component. `capture/classes.json` lists the roles. "Captured" says whether a captured view used the role; a role nobody captured may still be in the app, as the "React users" column shows.

The table has these outcomes:

- **A new class:** the PR renames the role, or merges it into a component.
- **Retire:** the role goes, for the reason given.
- **Kept:** the rule moves into `components.css` unchanged, reading only semantic tokens. These are views the mockups do not cover: the dailies day grid, task streaks and generated images.

Of the 268 role entries, 233 map to a new class, 21 retire and 14 are kept. Renaming roles is not expected to break tests, because the tests check rendered behaviour, not class names. The one exception is the comparison tool's own view setup, which IMPLEMENTATION.md covers.

| Old role | Declared at | Captured | React users | New class | Component | Note |
| --- | --- | --- | --- | --- | --- | --- |
| `current-quest` | page-roles:17 | yes | `page`, `current-quest` | `current-quest` | Current quest card |  |
| `current-quest-body` | page-roles:21 | yes | `current-quest` | **retire** | Frame | The card's own padding and gap do this. |
| `quest-sharing-mark` | page-roles:27 | no | `current-quest`, `quest-list`, `quest-sharing-mark` | `icon in collection-meta` | Collection | A shared quest shows an icon with sr-only text in the row's meta. |
| `current-quest-label` | page-roles:31 | yes | `current-quest` | `current-quest-label` | Current quest card; Label roles |  |
| `quest-start` | page-roles:37 | yes | `page`, `quest-start` | `section + section-heading` | Headings |  |
| `quest-start-tiles` | page-roles:41 | yes | `quest-start` | `choice-tiles` | Choice tile |  |
| `quest-start-tile` | page-roles:46 | yes | `quest-start` | `choice-tile` | Choice tile |  |
| `quests-index-tabs` | page-roles:68 | yes | `spell-index`, `quest-status-tabs` | `collection-tabs` | Collection | The Spellbook shares it on purpose now. |
| `quests-index-tab` | page-roles:72 | yes | `spell-index`, `quest-status-tabs` | `collection-tab` | Collection |  |
| `quests-index-count` | page-roles:109 | yes | `spell-index`, `quest-status-tabs` | `collection-count` | Collection |  |
| `quests-index-content` | page-roles:113 | yes | `spell-index`, `quest-status-tabs` | `collection-panel` | Collection |  |
| `quests-index-empty` | page-roles:152 | yes | `spell-index`, `pending-quests`, `quest-list` | `empty-state` | Empty state |  |
| `quests-index-list` | page-roles:156 | yes | `forgotten-list`, `spell-index`, `pending-quests` | `collection-list` | Collection |  |
| `quests-index-row` | page-roles:160 | yes | `forgotten-list`, `spell-index`, `pending-quests` | `collection-row` | Collection |  |
| `quests-index-restore` | page-roles:172 | yes | `forgotten-list`, `quest-list` | `collection-end` | Collection | Replaces the flex utility cluster in forgotten-list.tsx. |
| `quests-index-answer` | page-roles:179 | no | `pending-quests` | `collection-meta` | Collection | A pending quest's answer buttons sit in collection-end. |
| `quests-index-mark` | page-roles:183 | yes | `forgotten-list`, `spell-index`, `pending-quests` | `collection-mark` | Collection |  |
| `quests-index-link` | page-roles:193 | yes | `forgotten-list`, `spell-index`, `quest-list` | `collection-link` | Collection |  |
| `quest-workspace` | page-roles:198 | yes | `page`, `quest-workspace` | `page-frame-quest` | Quest workspace |  |
| `quest-status-feedback` | page-roles:204 | yes | `quest-status-controls` | `form-status` | Notice and form status |  |
| `quest-title-edit` | page-roles:215 | yes | `quest-title` | `icon-button` | Letterpress actions | The Rename button in trail-tools. |
| `quest-title` | page-roles:220 | yes | `header-links`, `quest-title` | `trail-heading` | Trail band |  |
| `quest-title-input` | page-roles:230 | no | `quest-title` | `input-field in dialog-panel` | Fields; Dialog |  |
| `page-column` | page-roles:251 | yes | `page`, `page-frame` | `page-column` | Page frame |  |
| `chat-thread` | page-roles:255 | yes | `chat-view`, `chat-thread` | `chat-thread` | Conversation |  |
| `workspace-frame` | page-roles:259 | yes | `layout` | `app` | Page frame |  |
| `page-frame-editor` | page-roles:263 | yes | `page-frame` | `page-frame-wide` | Page frame |  |
| `page-slot` | page-roles:267 | yes | `quest-ideas`, `quest-members`, `quest-notes` | `bucket` | Quest workspace | On a page of its own (quest-members), page-column. |
| `definition-editor` | page-roles:272 | yes | `page`, `page`, `editor-loading` | `panel + form-stack` | Frame; Fields | The construct page borrowed it; it gets page-row instead. |
| `prompt-editor-actions` | page-roles:280 | yes | `prompt-editor` | `save-bar` | Spell editor |  |
| `prompt-editor-save-hint` | page-roles:284 | no | `prompt-editor` | `form-status` | Notice and form status |  |
| `prompt-editor-more` | page-roles:288 | yes | `prompt-editor` | `save-bar` | Spell editor | Discard is a button-quiet in the save bar. |
| `prompt-editor` | page-roles:292 | yes | `page`, `prompt-editor` | `editor-layout` | Spell editor |  |
| `prompt-editor-nav` | page-roles:297 | yes | `prompt-editor` | `tabs[aria-orientation=vertical]` | Tabs |  |
| `prompt-editor-name` | page-roles:327 | yes | `prompt-editor` | `panel` | Frame |  |
| `prompt-editor-heading` | page-roles:327 | yes | `prompt-editor` | `section-heading` | Headings |  |
| `prompt-editor-field` | page-roles:340 | yes | `prompt-editor` | `tab-panel` | Tabs |  |
| `site-title` | page-roles:349 | yes | `sign-in-panel` | `site-title` | Headings |  |
| `page-heading` | page-roles:355 | no | `page`, `page-error`, `page-not-found` | `page-heading` | Headings |  |
| `section-heading` | page-roles:362 | yes | `page`, `page`, `page` | `section-heading` | Headings | Now carries the heading ornament slot. |
| `header-title` | page-roles:368 | yes | `site-header`, `site-panel` | `hud-name; site-panel-heading` | Site header; Site panel |  |
| `card-title` | page-roles:374 | yes | `forgotten-list`, `spell-index`, `current-quest` | `card-title` | Headings |  |
| `text-link` | page-roles:380 | yes | `page`, `page`, `page` | `text-link` | Icon (links) | Gains the 44 px hit area. |
| `button-primary` | page-roles:387 | yes | `button` | `button-primary` | Letterpress actions |  |
| `button-secondary` | page-roles:387 | yes | `button` | `button-secondary` | Letterpress actions |  |
| `button-danger` | page-roles:387 | yes | `button` | `button-danger` | Letterpress actions |  |
| `button-quiet` | page-roles:387 | yes | `button` | `button-quiet` | Letterpress actions |  |
| `button-quiet-danger` | page-roles:387 | no | `button` | `button-quiet-danger` | Letterpress actions |  |
| `field` | page-roles:493 | yes | `name-form`, `page`, `forgotten-detail` | `field` | Fields |  |
| `field-label` | page-roles:498 | yes | `construct-visual-preview`, `prompt-text`, `quest-note-composer` | `field-label` | Fields |  |
| `prompt-sheet` | page-roles:505 | yes | `prompt-text` | `card` | Frame | A preview sheet of Markdown is a plain card. |
| `field-hint` | page-roles:510 | yes | `prompt-text`, `timer-setup`, `field` | `field-hint` | Fields |  |
| `input-field` | page-roles:518 | yes | `milestone-controls`, `quest-note-composer`, `quest-title` | `input-field` | Fields | A select also gets select-field and select-chevron. |
| `field-box` | page-roles:518 | yes | `chat-composer` | `field-box` | Fields |  |
| `field-box-control` | page-roles:531 | yes | `chat-composer` | `field-box-control` | Fields |  |
| `icon` | page-roles:552 | yes | `name-form`, `milestone-controls`, `quest-conversation` | `icon` | Icon |  |
| `icon-line` | page-roles:574 | yes | `cast-spell-part`, `chat-parts`, `milestone-part` | `icon-line` | Icon |  |
| `error-text` | page-roles:581 | yes | `chat-parts`, `form-message` | `field-error` | Fields | In a chat reply, chat-message[data-tone=error]. |
| `notice` | page-roles:587 | yes | `milestone-part`, `tasks-change-part`, `prompt-editor` | `notice` | Notice and form status | notice-error for an alert. |
| `panel` | page-roles:607 | yes | `loading`, `loading`, `quest-conversation` | `panel` | Frame |  |
| `card` | page-roles:615 | yes | `page`, `chat-view`, `chat-message` | `card` | Frame |  |
| `divided-rows` | page-roles:624 | yes | `progress-timeline`, `quest-members` | `collection-list` | Collection | Progress and members lists are rows; the timeline also uses dated-list. |
| `divided-row-action` | page-roles:635 | yes | `quest-members` | `collection-row + collection-end` | Collection |  |
| `card-actions` | page-roles:641 | no | — | `card-actions` | Frame |  |
| `skeleton` | page-roles:647 | no | `loading-skeleton` | `skeleton` | Skeleton |  |
| `quest-conversation` | page-roles:708 | yes | `loading`, `page`, `quest-workspace` | `quest-main` | Quest workspace |  |
| `site-header` | page-roles:723 | yes | `default`, `error`, `header-size` | `site-header` | Site header |  |
| `hud-title` | page-roles:736 | yes | `site-header` | `hud-title` | Site header |  |
| `hud-medallion` | page-roles:740 | yes | `site-header` | `hud-medallion` | Site header |  |
| `hud-name` | page-roles:756 | yes | `site-header` | `hud-name` | Site header |  |
| `circle-progress` | page-roles:764 | yes | `circle-progress`, `signed-in-header` | `progress-ring` | Progress ring | One ring for both places. |
| `circle-progress-ring` | page-roles:770 | yes | `circle-progress` | `progress-ring-svg` | Progress ring |  |
| `circle-progress-track` | page-roles:774 | yes | `circle-progress` | `progress-ring-track` | Progress ring |  |
| `circle-progress-arc` | page-roles:779 | yes | `circle-progress` | `progress-ring-arc` | Progress ring |  |
| `circle-progress-number` | page-roles:784 | yes | `circle-progress` | `progress-ring-label` | Progress ring |  |
| `profile-card` | page-roles:791 | yes | `experience-card` | `card profile-card` | Profile |  |
| `signed-in-days-card` | page-roles:801 | yes | `page`, `signed-in-days-card` | `card` | Frame | Its heading becomes card-title, ending the utility cluster. |
| `profile-card-body` | page-roles:805 | yes | `experience-card` | **retire** | Profile | profile-standing holds the text. |
| `profile-ring` | page-roles:811 | yes | `experience-card` | `progress-ring[data-size=card]` | Progress ring |  |
| `profile-ring-arc` | page-roles:816 | yes | `experience-card` | `progress-ring-arc` | Progress ring |  |
| `profile-ring-disc` | page-roles:820 | yes | `experience-card` | `progress-ring-disc` | Progress ring |  |
| `profile-ring-track` | page-roles:824 | yes | `experience-card` | `progress-ring-track` | Progress ring |  |
| `profile-ring-fill` | page-roles:829 | yes | `experience-card` | **retire** | Progress ring | The disc does it. |
| `profile-ring-label` | page-roles:834 | yes | `experience-card` | `progress-ring-label` | Progress ring |  |
| `profile-ring-number` | page-roles:839 | yes | `experience-card` | `progress-ring-label` | Progress ring | progress-ring-caption holds the word Circle. |
| `profile-name` | page-roles:843 | yes | `name-form` | `card-header` | Frame |  |
| `profile-name-row` | page-roles:847 | yes | `name-form` | `card-header` | Frame |  |
| `profile-name-heading` | page-roles:851 | yes | `name-form` | `card-title` | Headings |  |
| `profile-name-form` | page-roles:855 | no | `name-form` | `form-stack in card` | Fields |  |
| `profile-title` | page-roles:860 | yes | `experience-card` | `profile-title` | Profile |  |
| `profile-progress` | page-roles:867 | yes | `experience-card` | **retire** | Profile | A plain paragraph with muted. |
| `profile-standing` | page-roles:886 | yes | `experience-card` | `profile-standing` | Profile |  |
| `profile-next` | page-roles:890 | yes | `experience-card` | `muted` | Elements | A plain paragraph. |
| `ability-tiles` | page-roles:896 | yes | `page`, `ability-tiles` | `ability-tiles` | Profile |  |
| `ability-tile` | page-roles:900 | yes | `ability-tiles` | `ability-tile` | Profile |  |
| `ability-tile-untried` | page-roles:909 | yes | `ability-tiles` | **retire** | Profile | An untried ability shows 0 points; no separate look. |
| `ability-tile-most` | page-roles:917 | yes | `ability-tiles` | `ability-tile[data-most]` | Profile |  |
| `ability-badge` | page-roles:940 | yes | `ability-tiles` | **retire** | Profile | The hint says "Most experience". |
| `ability-icon` | page-roles:946 | yes | `ability-tiles` | **retire** | Profile | Tiles have no icons. |
| `ability-name` | page-roles:961 | yes | `ability-tiles` | `ability-name` | Profile |  |
| `ability-count` | page-roles:966 | yes | `ability-tiles` | **retire** | Profile | ability-number holds the count. |
| `ability-number` | page-roles:971 | yes | `ability-tiles` | `ability-number` | Profile |  |
| `ability-worth` | page-roles:975 | yes | `ability-tiles` | **retire** | Profile | ability-hint holds the worth. |
| `ability-hint` | page-roles:981 | yes | `ability-tiles` | `ability-hint` | Profile |  |
| `trail-band` | page-roles:1024 | yes | `header-size`, `site-header` | `trail-band` | Trail band | Opaque now. |
| `trail-content` | page-roles:1036 | yes | `site-header` | `trail-content` | Trail band |  |
| `trail-parents` | page-roles:1063 | yes | `site-header` | `trail-parents` | Trail band |  |
| `breadcrumb-separator` | page-roles:1089 | yes | `site-header` | **retire** | Trail band | The separator is a plain aria-hidden span inside each li, styled by trail-parents li. |
| `trail-heading` | page-roles:1108 | yes | `site-header` | `trail-heading` | Trail band |  |
| `site-panel` | page-roles:1127 | yes | `signed-in-header`, `site-header`, `site-panel` | `site-panel` | Site panel |  |
| `site-panel-toggle` | page-roles:1138 | yes | `site-panel` | `icon-button in trail-band` | Trail band | The toggle sits at the trail band's start. |
| `site-panel-heading` | page-roles:1148 | yes | `site-panel` | `site-panel-heading` | Site panel |  |
| `site-panel-close` | page-roles:1155 | yes | `site-panel` | `icon-button` | Letterpress actions |  |
| `panel-label` | page-roles:1171 | yes | `appearance-choices`, `site-header`, `site-panel` | `panel-label` | Site panel |  |
| `panel-link` | page-roles:1179 | yes | `site-panel` | `panel-link` | Site panel |  |
| `panel-modes` | page-roles:1189 | yes | `appearance-choices` | `appearance-swatches` | Appearance swatch |  |
| `panel-mode` | page-roles:1193 | yes | `appearance-choices` | `appearance-swatch` | Appearance swatch |  |
| `theme-choice-input` | page-roles:1203 | yes | `appearance-choices` | `appearance-swatch-input` | Appearance swatch |  |
| `theme-swatch` | page-roles:1213 | yes | `appearance-choices` | `appearance-swatch-face` | Appearance swatch |  |
| `theme-choice-tooltip` | page-roles:1218 | yes | `appearance-choices` | `appearance-swatch-tooltip` | Appearance swatch |  |
| `theme-choice-name` | page-roles:1222 | yes | `appearance-choices` | `appearance-swatch-name` | Appearance swatch |  |
| `panel-rule` | page-roles:1240 | yes | `site-header`, `site-panel` | `panel-rule` | Site panel |  |
| `dialog-overlay` | page-roles:1248 | yes | `adventure-character-header`, `form-dialog`, `quest-title` | `dialog-overlay` | Dialog |  |
| `dialog-panel` | page-roles:1252 | yes | `adventure-character-header`, `form-dialog`, `quest-title` | `dialog-panel` | Dialog |  |
| `construct-visual` | page-roles:1262 | yes | `chat-message`, `adventure-character-header`, `construct-visual-preview` | `construct-portrait` | Construct portrait and avatar |  |
| `construct-avatar` | page-roles:1293 | yes | `construct-visual` | `construct-avatar` | Construct portrait and avatar |  |
| `page-workspace` | page-roles:1306 | yes | `layout`, `layout`, `page` | `page-column` | Page frame |  |
| `page-workspace-heading` | page-roles:1310 | yes | `page-workspace` | `page-row` | Page frame |  |
| `workspace-intro` | page-roles:1318 | yes | `page-workspace` | `lede` | Headings |  |
| `workspace-rail` | page-roles:1322 | yes | `workspace-tabs` | `tabs` | Tabs |  |
| `workspace-tablist` | page-roles:1332 | yes | `workspace-tabs` | `tabs` | Tabs |  |
| `workspace-tab` | page-roles:1392 | yes | `workspace-tabs` | `tab` | Tabs |  |
| `workspace-content` | page-roles:1418 | yes | `error`, `loading`, `page` | `page-column` | Page frame |  |
| `timer-stage` | page-roles:1423 | yes | `timer-display` | `timer-stage` | Timer | Unchanged. |
| `timer-face` | page-roles:1433 | yes | `timer-display` | `timer-face` | Timer | Unchanged. |
| `timer-ring` | page-roles:1446 | yes | `timer-display` | `timer-ring` | Timer | Unchanged. |
| `timer-guide-lines` | page-roles:1454 | yes | `timer-dial` | `timer-guide-lines` | Timer | Unchanged. |
| `timer-outer-guide` | page-roles:1460 | yes | `timer-dial` | `timer-outer-guide` | Timer | Unchanged. |
| `timer-middle-guide` | page-roles:1463 | yes | `timer-dial` | `timer-middle-guide` | Timer | Unchanged. |
| `timer-inner-guide` | page-roles:1466 | yes | `timer-dial` | `timer-inner-guide` | Timer | Unchanged. |
| `timer-seal` | page-roles:1470 | yes | `timer-dial` | `timer-seal` | Timer | Unchanged. |
| `timer-dial-labels` | page-roles:1474 | yes | `timer-dial` | `timer-dial-labels` | Timer | Unchanged. |
| `timer-inscription` | page-roles:1480 | yes | `timer-dial` | `timer-inscription` | Timer | Unchanged. |
| `timer-marker` | page-roles:1485 | yes | `timer-dial` | `timer-marker` | Timer | Unchanged. |
| `timer-marker-fill` | page-roles:1498 | yes | `timer-dial` | `timer-marker-fill` | Timer | Unchanged. |
| `timer-sigil` | page-roles:1502 | yes | `timer-dial` | `timer-sigil` | Timer | Unchanged. |
| `timer-chapter` | page-roles:1505 | yes | `timer-dial` | `timer-chapter` | Timer | Unchanged. |
| `timer-track` | page-roles:1517 | yes | `timer-display` | `timer-track` | Timer | Unchanged. |
| `timer-progress` | page-roles:1517 | yes | `timer-display` | `timer-progress` | Timer | Unchanged. |
| `timer-gilt` | page-roles:1529 | yes | `timer-display` | `timer-gilt` | Timer | Unchanged. |
| `timer-gilt-grain` | page-roles:1533 | yes | `timer-display` | `timer-gilt-grain` | Timer | Unchanged. |
| `timer-progress-rest` | page-roles:1540 | yes | `timer-display` | `timer-progress-rest` | Timer | Unchanged. |
| `timer-readout` | page-roles:1544 | yes | `timer-display` | `timer-readout` | Timer | Unchanged. |
| `timer-value` | page-roles:1552 | yes | `timer-display` | `timer-value` | Timer | Unchanged. |
| `timer-phase` | page-roles:1556 | yes | `timer-display` | `timer-phase` | Timer | Unchanged. |
| `timer-countdown` | page-roles:1567 | yes | `timer-display` | `timer-countdown` | Timer | Unchanged. |
| `timer-next` | page-roles:1580 | yes | `timer-display` | `timer-next` | Timer | Unchanged. |
| `timer-hourglass` | page-roles:1599 | yes | `timer-display`, `timer-hourglass` | `timer-hourglass` | Timer | Unchanged. |
| `timer-hourglass-wood` | page-roles:1605 | yes | `timer-hourglass` | `timer-hourglass-wood` | Timer | Unchanged. |
| `timer-hourglass-frame` | page-roles:1609 | yes | `timer-hourglass` | `timer-hourglass-frame` | Timer | Unchanged. |
| `timer-hourglass-glass` | page-roles:1609 | yes | `timer-hourglass` | `timer-hourglass-glass` | Timer | Unchanged. |
| `timer-sand` | page-roles:1620 | yes | `timer-hourglass` | `timer-sand` | Timer | Unchanged. |
| `timer-sand-grain` | page-roles:1624 | yes | `timer-hourglass` | `timer-sand-grain` | Timer | Unchanged. |
| `timer-sand-stream` | page-roles:1630 | yes | `timer-hourglass` | `timer-sand-stream` | Timer | Unchanged. |
| `timer-panel` | page-roles:1647 | yes | `site-panel`, `timer-preferences` | `site-panel` | Site panel | The preferences drawer is a site panel on the right. |
| `timer-panel-toggle` | page-roles:1654 | yes | `site-panel` | `icon-button in trail-tools` | Trail band |  |
| `timer-trail-tools` | page-roles:1692 | yes | `header-links`, `timer-display`, `timer-trail-tools` | `trail-tools` | Trail band |  |
| `construct-trail-tools` | page-roles:1700 | no | `header-links` | `trail-tools` | Trail band |  |
| `character-header-control` | page-roles:1704 | no | `adventure-character-header` | `construct-avatar in a button-quiet` | Construct portrait and avatar |  |
| `timer-others` | page-roles:1712 | yes | `timer-trail-tools` | `timer-others` | Timer | Unchanged. |
| `workspace-rows` | page-roles:1735 | no | — | **retire** | — | No rule user in the app. |
| `construct-card` | page-roles:1742 | no | — | **retire** | — | No rule user in the app. |
| `appearance-settings` | page-roles:1754 | yes | `appearance-choices` | `appearance-fieldset` | Appearance swatch |  |
| `tasks` | page-roles:1759 | yes | `page`, `quest-conversation`, `chat-screen` | **retire** | Quest workspace | A wrapper with no look of its own. |
| `editable-list` | page-roles:1759 | yes | `quest-ideas`, `quest-notes`, `task-rows` | `editable-list` | Editable list |  |
| `editable-row` | page-roles:1764 | yes | `editable-list` | `editable-row` | Editable list |  |
| `editable-check` | page-roles:1790 | yes | `editable-list` | `editable-check` | Editable list |  |
| `editable-text` | page-roles:1821 | yes | `editable-list` | `editable-text` | Editable list |  |
| `bucket-notes` | page-roles:1829 | yes | `quest-notes` | `bucket` | Quest workspace |  |
| `editable-actions` | page-roles:1837 | yes | `editable-list` | `editable-actions` | Editable list |  |
| `day-grid` | page-roles:1847 | no | `dailies-panel`, `day-grid` | `day-grid (kept)` | Port as is | Not mocked; port its rule to tokens unchanged. |
| `day-grid-days` | page-roles:1851 | no | `day-grid` | `day-grid-days (kept)` | Port as is |  |
| `day-grid-day` | page-roles:1855 | no | `day-grid` | `day-grid-day (kept)` | Port as is |  |
| `day-grid-square` | page-roles:1859 | no | `day-grid` | `day-grid-square (kept)` | Port as is |  |
| `editable-badge` | page-roles:1879 | no | `task-rows` | `icon in editable-text` | Icon | The repeat mark; its label stays sr-only. |
| `editable-detail` | page-roles:1884 | yes | `editable-list` | `muted in editable-text` | Editable list |  |
| `bucket-tasks` | page-roles:1888 | yes | `task-rows` | `bucket` | Quest workspace |  |
| `bucket-ideas` | page-roles:1892 | yes | `quest-ideas` | `bucket` | Quest workspace |  |
| `streak-chain` | page-roles:1902 | no | `task-rows` | `streak-chain (kept)` | Port as is | Not mocked. |
| `streak-links` | page-roles:1906 | no | `task-rows` | `streak-links (kept)` | Port as is |  |
| `streak-link` | page-roles:1910 | no | `task-rows` | `streak-link (kept)` | Port as is |  |
| `streak-note` | page-roles:1926 | no | `task-rows` | `streak-note (kept)` | Port as is |  |
| `editable-grip` | page-roles:1930 | yes | `editable-list` | `editable-check holding an icon-button` | Editable list | The drag handle in the spell replies. |
| `editable-menu` | page-roles:1935 | yes | `editable-list` | `menu` | Menu |  |
| `editable-menu-label` | page-roles:1939 | yes | `editable-list` | `menu-label` | Menu; Label roles |  |
| `editable-menu-item` | page-roles:1943 | yes | `editable-list`, `workspace-tabs` | `menu-item` | Menu | menu-item-danger for Remove. |
| `editable-add` | page-roles:1948 | yes | `editable-list` | `editable-add` | Editable list |  |
| `editable-add-form` | page-roles:1952 | no | `editable-list` | `editable-add` | Editable list |  |
| `editable-form` | page-roles:1962 | no | `editable-list` | `editable-row containing input-field` | Editable list |  |
| `tasks-done` | page-roles:1982 | yes | `task-rows` | `done-list + list-summary` | Editable list |  |
| `bucket-desk` | page-roles:2004 | yes | `quest-ideas`, `quest-notes`, `task-rows` | `bucket` | Quest workspace |  |
| `bucket-toolbar` | page-roles:2008 | yes | `quest-ideas`, `quest-notes`, `task-rows` | `bucket-toolbar` | Quest workspace |  |
| `bucket-summary` | page-roles:2012 | yes | `quest-ideas`, `quest-notes`, `task-rows` | `bucket-summary` | Quest workspace |  |
| `editable-leading` | page-roles:2044 | yes | `editable-list` | `editable-check` | Editable list | The leading cell. |
| `editable-more` | page-roles:2053 | yes | `editable-list` | `icon-button in editable-actions` | Editable list |  |
| `idea-decision` | page-roles:2074 | yes | `quest-ideas` | `editable-actions` | Editable list | The Move-to-Tasks choice is a button-quiet. |
| `bucket-empty` | page-roles:2078 | yes | `quest-notes` | `empty-state` | Empty state |  |
| `bucket-empty-copy` | page-roles:2106 | yes | `quest-ideas`, `quest-notes`, `task-rows` | `empty-state-copy` | Empty state |  |
| `bucket-empty-heading` | page-roles:2114 | yes | `quest-ideas`, `quest-notes`, `task-rows` | `empty-state-heading` | Empty state |  |
| `tasks-change` | page-roles:2121 | yes | `tasks-change-part` | `tasks-change` | Conversation |  |
| `tasks-change-heading` | page-roles:2125 | yes | `tasks-change-part` | `tasks-change-heading` | Conversation |  |
| `tasks-change-lines` | page-roles:2135 | yes | `tasks-change-part` | **retire** | Conversation | A plain list inside tasks-change. |
| `tasks-message` | page-roles:2146 | yes | `chat-view`, `chat-parts`, `tasks-change-part` | `chat-message-body` | Conversation |  |
| `tasks-command` | page-roles:2156 | yes | `tasks-change-part` | `code in chat-message-body` | Elements |  |
| `page-frame-quest` | page-roles:2162 | yes | `page-frame` | `page-frame-quest` | Quest workspace |  |
| `adventure-layout` | page-roles:2166 | yes | `conversation-panel` | `page-frame-quest` | Quest workspace |  |
| `adventure-main` | page-roles:2170 | yes | `conversation-panel` | `quest-main` | Quest workspace |  |
| `quest-sidebar-frame` | page-roles:2174 | yes | `conversation-panel` | **retire** | Quest workspace | The page frame's grid places the sidebar. |
| `quest-sidebar` | page-roles:2186 | yes | `quest-conversation`, `chat-view`, `conversation-panel` | `quest-sidebar` | Quest workspace |  |
| `quest-panel-heading` | page-roles:2193 | yes | `conversation-panel` | `quest-sidebar-heading` | Quest workspace |  |
| `dailies-day-controls` | page-roles:2217 | no | `dailies-panel` | `card-actions` | Frame | Not mocked. |
| `quest-next-task` | page-roles:2221 | yes | `quest-panel` | `quest-next-task` | Quest workspace |  |
| `panel-utilities` | page-roles:2225 | yes | `panel-collections` | `sidebar-sections` | Quest workspace |  |
| `panel-utility-content` | page-roles:2238 | yes | `panel-collections` | `tab-panel` | Tabs |  |
| `workspace-menu-tab` | page-roles:2242 | no | `workspace-tabs` | **retire** | Tabs | The tab row wraps, so no overflow menu is needed. |
| `workspace-menu` | page-roles:2277 | no | `workspace-tabs` | **retire** | Tabs | As workspace-menu-tab. |
| `workspace-menu-item` | page-roles:2283 | no | `workspace-tabs` | **retire** | Tabs | As workspace-menu-tab. |
| `workspace-menu-check` | page-roles:2287 | no | `workspace-tabs` | **retire** | Tabs | As workspace-menu-tab. |
| `bucket-panel` | page-roles:2291 | yes | `panel-collections` | `bucket` | Quest workspace |  |
| `bucket-heading` | page-roles:2295 | yes | `panel-collections` | `section-heading` | Headings |  |
| `bucket-description` | page-roles:2303 | yes | `panel-collections` | `muted` | Elements |  |
| `panel-toggle` | page-roles:2313 | yes | `conversation-panel`, `site-panel` | `icon-button` | Letterpress actions |  |
| `panel-edge-tab` | page-roles:2321 | yes | `conversation-panel`, `site-panel` | **retire** | Trail band | Toggles move into the trail band and the sidebar heading. |
| `quest-sidebar-expand` | page-roles:2336 | yes | `conversation-panel` | `button-secondary in trail-tools` | Trail band | The Quest button, with aria-expanded. |
| `quest-sidebar-collapse` | page-roles:2336 | yes | `conversation-panel` | `icon-button in quest-sidebar-heading` | Quest workspace |  |
| `header-panel-control` | page-roles:2342 | yes | `conversation-panel`, `site-header` | **retire** | Trail band | No portal target needed once the toggle lives in trail-tools. |
| `command-menu` | page-roles:2407 | yes | `chat-composer`, `command-menu` | `menu[role=listbox]` | Menu; Composer |  |
| `command-list` | page-roles:2411 | yes | `command-menu` | `menu` | Menu |  |
| `command-option` | page-roles:2415 | yes | `command-menu` | `menu-item[role=option]` | Menu |  |
| `command-hint` | page-roles:2424 | yes | `command-menu` | `menu-hint` | Menu |  |
| `quest-note-composer` | page-roles:2430 | yes | `quest-note-composer`, `quest-notes` | `form-stack` | Fields | In a dialog-panel on the quests list. |
| `quest-note-hint` | page-roles:2438 | yes | `quest-note-composer` | `field-hint` | Fields |  |
| `markdown` | chat:51 | yes | `chat-parts`, `markdown`, `prompt-text` | `markdown (kept)` | Conversation | Prose styles for replies and previews. |
| `task-list-item` | chat:140 | no | — | `markdown (kept)` | Conversation | A Markdown task list item; not captured. |
| `chat-thread` | chat:199 | yes | `chat-view`, `chat-thread` | `chat-thread` | Conversation |  |
| `chat-transcript` | chat:208 | yes | `chat-thread` | `chat-transcript` | Conversation |  |
| `chat-message` | chat:212 | yes | `chat-history`, `chat-message` | `chat-message` | Conversation |  |
| `chat-speaker` | chat:230 | yes | `chat-message` | `chat-speaker` | Conversation; Label roles |  |
| `construct-avatar` | chat:245 | yes | `construct-visual` | `construct-avatar` | Construct portrait and avatar |  |
| `chat-message-user` | chat:250 | yes | `chat-message` | `chat-message-user` | Conversation |  |
| `chat-message-construct` | chat:257 | yes | `chat-message` | `chat-message-construct` | Conversation |  |
| `chat-message-body` | chat:272 | yes | `chat-message` | `chat-message-body` | Conversation |  |
| `tasks-message` | chat:286 | yes | `chat-view`, `chat-parts`, `tasks-change-part` | `chat-message-body` | Conversation |  |
| `tasks-change` | chat:286 | yes | `tasks-change-part` | `tasks-change` | Conversation |  |
| `chat-reply-stopped` | chat:300 | no | `stopped-reply` | `muted in chat-message-body` | Conversation | Not captured. |
| `chat-composer` | chat:305 | yes | `chat-composer`, `chat-thread` | `chat-composer` | Composer |  |
| `chat-composer-spell` | chat:310 | no | `chat-composer` | `chat-composer-hint` | Composer | The active spell shows in the hint line. Not captured. |
| `chat-composer-field` | chat:338 | yes | `chat-composer` | `field-box` | Fields |  |
| `field-box-control` | chat:338 | yes | `chat-composer` | `field-box-control` | Fields |  |
| `chat-viewport` | chat:351 | yes | `chat-thread` | `chat-transcript` | Conversation | Replaces its flex utilities. |
| `chat-composer-dock` | chat:360 | yes | `chat-thread` | `chat-composer-dock` | Composer |  |
| `working-dots` | chat:382 | yes | `chat-message`, `working-dots` | `working-dots` | Conversation |  |
| `chat-image` | chat:413 | no | `chat-parts`, `generated-image-part`, `image-attachment` | `chat-image (kept)` | Port as is | Generated images; not captured. |
| `generated-image-link` | chat:426 | no | `generated-image-part` | `generated-image-link (kept)` | Port as is |  |
| `generated-image-fill` | chat:437 | no | `generated-image-part` | `generated-image-fill (kept)` | Port as is |  |
| `chat-image-fill` | chat:445 | no | `generated-image-part` | `chat-image-fill (kept)` | Port as is |  |
| `chat-opening` | chat:453 | yes | `chat-message` | `construct-portrait in chat-message-construct` | Construct portrait and avatar | The first reply's portrait. |
| `chat-presence` | chat:457 | yes | `chat-message` | `construct-avatar` | Construct portrait and avatar | Its ring animation follows artwork/README.md. |
