# Theme redesign inventory

This inventory lists each captured view's route, use cases, React components and CSS roles. It also lists the styles that drift from the shared roles. It describes commit `916daaa2d81b31c11422a5a8a86a63f2a30d1822`, captured on 2026-11-17. [`README.md`](README.md) explains how the capture was made.

Paths are relative to `apps/web/src/` unless they start with `apps/`. A role is a class with its own rule in `app/page-roles.css` or `components/chat/chat.css`. Each role below is given with its declaring line. [`classes.md`](classes.md) lists every class in every view, including Tailwind utilities, and traces each one to its declaration.

Use case slugs come from the files in `apps/web/use-cases/`.

## Site chrome

Every captured view shows the site header, the trail band (the breadcrumb bar under the header) and the site panel. The site panel is in the DOM on every page, even when the visitor is signed out.

- **Components:** `app/layout.tsx`, `app/@header/[...path]/page.tsx`, `components/site-header.tsx`, `components/signed-in-header.tsx`, `components/header-links.tsx`, `components/header-size.tsx`, `components/site-panel.tsx`, `components/appearance-choices.tsx`, `components/quick-note.tsx` and `components/experience/circle-progress.tsx`.
- **Use cases:** `use_case_choose_theme`, `use_case_use_on_phone` and `use_case_experience_ring`.
- **Roles in every view:** `site-header`, `header-title`, `header-panel-control`, `hud-medallion`, `hud-name`, `hud-title`, `trail-band` (page-roles.css:1024), `site-panel`, `site-panel-toggle`, `site-panel-close`, `site-panel-heading`, `panel-edge-tab`, `panel-label`, `panel-link`, `panel-mode`, `panel-modes`, `panel-rule`, `panel-toggle`, `theme-choice-input`, `theme-choice-name`, `theme-choice-tooltip`, `theme-swatch`, `button-primary`, `button-quiet` (page-roles.css:387) and `icon`.
- **Roles in every signed-in view:** `page-column` (page-roles.css:251), `workspace-frame` (259), `trail-content` (1036), `trail-heading` (1108) and the header's experience ring, `circle-progress` (764) with `circle-progress-ring`, `-track`, `-arc` and `-number` (770–784).
- **Roles on deeper pages:** `trail-parents` (1063) and `breadcrumb-separator` (1089) appear on the quest, spell, timer and construct pages.

## Sign-in and sign-up

- **Routes:** `/login` and `/signup`.
- **States:** `sign-in--default`, `sign-in--link-sent` and `sign-up--default`.
- **Use cases:** `use_case_visit_signed_out`, `use_case_sign_up`, `use_case_sign_in_by_link` and `use_case_set_name`.
- **Components:** `app/login/page.tsx`, `app/login/sign-in-panel.tsx`, `app/login/link-request-form.tsx`, `app/signup/page.tsx`, `components/ui/field.tsx`, `components/ui/form-message.tsx` and `components/ui/button.tsx`.
- **Roles:** `site-title` (page-roles.css:349), `text-link` (380), `field` (493), `field-label` (498), `input-field` (518), `notice` (587) and `panel` (607).

The pages lay themselves out with Tailwind utilities (`max-w-sm`, `py-16`, `px-4 sm:px-6`, `text-center`, `text-balance`) rather than a role.

## Quests list

- **Route:** `/quests`.
- **States:** `quests--list`, `quests--completed-tab`, `quests--empty` and `quests--new-quest-dialog`. The overlays `site-panel--open` and `quick-note--dialog` are also captured on this page.
- **Use cases:** `use_case_view_quests`, `use_case_continue_quest`, `use_case_new_quest`, `use_case_restore_quest` and `use_case_quick_note`.
- **Components:** `app/(workspace)/quests/(list)/page.tsx`, `components/current-quest.tsx`, `components/quest-start.tsx`, `components/quest-status-tabs.tsx`, `components/quest-list.tsx`, `components/form-dialog.tsx`, `components/quick-note.tsx` and `components/ui/page-frame.tsx`.
- **Roles:**
  - current quest: `current-quest` (page-roles.css:17), `current-quest-body` (21) and `current-quest-label` (31);
  - new quest tiles: `quest-start` (37), `quest-start-tiles` (41) and `quest-start-tile` (46);
  - status tabs and list: `quests-index-tabs` (68), `quests-index-tab` (72), `quests-index-count` (109), `quests-index-content` (113), `quests-index-empty` (152), `quests-index-list` (156), `quests-index-row` (160), `quests-index-restore` (172), `quests-index-mark` (183) and `quests-index-link` (193);
  - status message: `quest-status-feedback` (204);
  - dialogs: `dialog-overlay` (1248) and `dialog-panel` (1252), with `field`, `field-label`, `field-hint` (510), `input-field` and `button-secondary` (387);
  - other: `section-heading` (362), `card-title` (374) and `notice` (587).

## Quest workspace

- **Route:** `/quests/QUEST_ID`, where `QUEST_ID` is the quest's ID.
- **States:**
  - conversation: `quest--conversation`, `quest--spell-conversation` and `quest--completed`;
  - sidebar tabs: `quest--ideas`, `quest--quick-notes` and `quest--progress`;
  - composer: `quest--composer-commands`, `quest--command-error` and `quest--loading-reply`;
  - overlays: `quest--row-menu`, `quest--confirm-dialog` and `quest--sidebar-drawer` (phone only).
- **Use cases:**
  - conversation: `use_case_open_quest`, `use_case_send_message`, `use_case_read_formatted_reply`, `use_case_construct_presence`, `use_case_stop_reply`, `use_case_follow_latest_messages`, `use_case_send_while_construct_replies`, `use_case_reply_fails`, `use_case_construct_casts_spell` and `use_case_experience_command`;
  - sidebar: `use_case_tailored_quest_panels`, `use_case_tasks_panel`, `use_case_change_tasks`, `use_case_tasks_commands`, `use_case_quest_ideas`, `use_case_quick_note`, `use_case_view_progress_timeline` and `use_case_edit_milestone`;
  - quest: `use_case_rename_quest` and `use_case_change_quest_status`.
- **Components:**
  - page: `app/(workspace)/quests/[questId]/(overview)/page.tsx`, `quest-conversation.tsx`, `progress-timeline.tsx`, `milestone-controls.tsx` and `start-conversation-form.tsx` in the same folder;
  - layout: `components/quest-workspace.tsx`, `components/chat-screen.tsx`, `components/chat-view.tsx` and `components/conversation-panel.tsx`, which renders the sidebar as `<dialog className="quest-sidebar-frame">`;
  - sidebar: `components/quest-panel.tsx`, `components/task-section.tsx`, `components/panel-collections.tsx`, `components/workspace-tabs.tsx`, `components/dailies-panel.tsx`, `components/quest-ideas.tsx`, `components/quest-notes.tsx`, `components/quest-note-composer.tsx`, `components/quest-members.tsx`, `components/quest-status-controls.tsx`, `components/tasks/task-rows.tsx`, `components/ui/editable-list.tsx` and `components/ui/confirm-dialog.tsx`;
  - chat: `components/chat/chat-thread.tsx`, `chat-composer.tsx`, `chat-message.tsx`, `chat-parts.tsx`, `command-menu.tsx`, `milestone-part.tsx`, `tasks-change-part.tsx`, `cast-spell-part.tsx`, `working-dots.tsx` and `working-note.tsx`, plus `components/markdown.tsx` and `components/spell-picker.tsx`;
  - header: `components/quest-title.tsx` and `components/constructs/adventure-character-header.tsx`.
- **Roles in page-roles.css:**
  - layout: `quest-workspace` (198), `page-frame-quest` (2162), `adventure-layout` (2166), `adventure-main` (2170), `quest-conversation` (708) and `page-slot` (267);
  - title: `quest-title` (220) and `quest-title-edit` (215);
  - sidebar: `quest-sidebar-frame` (2174), `quest-sidebar` (2186), `quest-panel-heading` (2193), `quest-next-task` (2221), `quest-sidebar-collapse` and `quest-sidebar-expand` (2336), `panel-utilities` (2225), `panel-utility-content` (2238), `workspace-rail` (1322), `workspace-tablist` (1332), `workspace-tab` (1392) and `workspace-content` (1418);
  - lists: `editable-list` and `tasks` (1759), `editable-row` (1764), `editable-check` (1790), `editable-text` (1821), `editable-actions` (1837), `editable-detail` (1884), `editable-grip` (1930), `editable-menu` (1935), `editable-menu-label` (1939), `editable-menu-item` (1943), `editable-add` (1948), `tasks-done` (1982), `editable-leading` (2044), `editable-more` (2053) and `idea-decision` (2074);
  - buckets: `bucket-notes` (1829), `bucket-tasks` (1888), `bucket-ideas` (1892), `bucket-desk` (2004), `bucket-toolbar` (2008), `bucket-summary` (2012), `bucket-empty` (2078), `bucket-empty-copy` (2106), `bucket-empty-heading` (2114), `bucket-panel` (2291), `bucket-heading` (2295) and `bucket-description` (2303);
  - task changes in replies: `tasks-change` (2121), `tasks-change-heading` (2125), `tasks-change-lines` (2135), `tasks-message` (2146) and `tasks-command` (2156);
  - composer menus: `command-menu` (2407), `command-list` (2411), `command-option` (2415), `command-hint` (2424), `quest-note-composer` (2430) and `quest-note-hint` (2438);
  - shared: `card` (615), `divided-rows` (624), `divided-row-action` (635), `notice` (587), `error-text` (581), `icon-line` (574), `text-link` (380), `button-secondary` and `button-danger` (387), `field` (493), `field-box` and `input-field` (518), `field-box-control` (531), `dialog-overlay` (1248), `dialog-panel` (1252), `construct-visual` (1262) and `construct-avatar` (1293).
- **Roles in chat.css:** `markdown` (51), `chat-thread` (199), `chat-transcript` (208), `chat-message` (212), `chat-speaker` (230), `chat-message-user` (250), `chat-message-construct` (257), `chat-message-body` (272), `chat-composer` (305), `chat-composer-field` (338), `chat-viewport` (351), `chat-composer-dock` (360), `working-dots` (382), `chat-opening` (453) and `chat-presence` (457).

The quest workspace uses 106 roles, more than any other view.

## Spellbook

- **Routes:** `/spellbook` and `/spellbook/tasks`.
- **States:** `spellbook--list` and `spellbook--yours-empty`.
- **Use cases:** `use_case_spellbook_page` and `use_case_spell_buckets`.
- **Components:** `app/(workspace)/spellbook/page.tsx`, `spell-lists.tsx`, `spell-index.tsx` and `forgotten-list.tsx` in the same folder.
- **Roles:** the quests list's `quests-index-*` roles (page-roles.css:68–193), with `card-title` (374), `field`, `field-label` and `input-field`.

The Spellbook has no roles of its own. See [Borrowed roles](#borrowed-roles).

## Spell editor

- **Route:** `/spellbook/SPELL_ID`, where `SPELL_ID` is the spell's ID. A built-in spell has a name instead of an ID, such as `/spellbook/tasks`.
- **States:** `spell--editor`, `spell--invalid-field` and `spell--built-in`.
- **Use cases:** `use_case_customize_spell` and `use_case_spell_buckets`.
- **Components:** `app/(workspace)/spellbook/[spellId]/page.tsx`, `components/prompt-editor.tsx`, `components/prompt-text.tsx`, `components/ui/text-list-field.tsx`, `components/ui/editable-list.tsx`, `components/ui/field.tsx` and `components/markdown.tsx`.
- **Roles:** `page-frame-editor` (page-roles.css:263), `definition-editor` (272), `prompt-editor-actions` (280), `prompt-editor-more` (288), `prompt-editor` (292), `prompt-editor-nav` (297), `prompt-editor-heading` and `prompt-editor-name` (327), `prompt-editor-field` (340), `prompt-sheet` (505), `panel` (607), `error-text` (581), `icon-line` (574), `notice` (587), the field roles, the `editable-*` list roles and `markdown` (chat.css:51).

## Timer

- **Routes:** `/timer` and `/timer/WORK/BREAK/START`. `WORK` and `BREAK` are the lengths of the work and break phases in minutes. `START` is the start time in milliseconds since 1970-01-01 UTC.
- **States:** `timer--setup`, `timer--running-work`, `timer--running-break` and `timer--preferences`.
- **Use cases:** `use_case_timer_start`, `use_case_timer_follow_cycle`, `use_case_timer_copy_link` and `use_case_timer_choose_appearance`.
- **Components:** `app/(workspace)/timer/page.tsx`, `app/(workspace)/timer/[work]/[break]/[start]/page.tsx`, `components/page-workspace.tsx` and `components/timer/timer-setup.tsx`, `timer-display.tsx`, `timer-dial.tsx`, `timer-hourglass.tsx`, `timer-preferences.tsx` and `timer-trail-tools.tsx`.
- **Roles:**
  - page: `page-workspace` (page-roles.css:1306), `page-workspace-heading` (1310), `workspace-intro` (1318) and `workspace-content` (1418);
  - dial: `timer-stage` (1423), `timer-face` (1433), `timer-ring` (1446), `timer-guide-lines` (1454), `timer-outer-guide` (1460), `timer-middle-guide` (1463), `timer-inner-guide` (1466), `timer-seal` (1470), `timer-dial-labels` (1474), `timer-inscription` (1480), `timer-marker` (1485), `timer-marker-fill` (1498), `timer-sigil` (1502), `timer-chapter` (1505), `timer-progress` and `timer-track` (1517), `timer-gilt` (1529), `timer-gilt-grain` (1533) and `timer-progress-rest` (1540);
  - readout: `timer-readout` (1544), `timer-value` (1552), `timer-phase` (1556), `timer-countdown` (1567) and `timer-next` (1580);
  - hourglass: `timer-hourglass` (1599), `timer-hourglass-wood` (1605), `timer-hourglass-frame` and `timer-hourglass-glass` (1609), `timer-sand` (1620), `timer-sand-grain` (1624) and `timer-sand-stream` (1630);
  - preferences: `timer-panel` (1647), `timer-panel-toggle` (1654), `timer-trail-tools` (1692) and `timer-others` (1712).

Both instruments, the dial and the hourglass, are in the DOM in every appearance. `themes/parchment.css` shows one and hides the other with `--timer-hourglass-display` and `--timer-ring-display`.

## Settings

- **Route:** `/settings`.
- **State:** `settings--default`.
- **Use cases:** `use_case_choose_theme`, `use_case_sign_out` and `use_case_sign_out_everywhere`.
- **Components:** `app/(workspace)/settings/page.tsx`, `app/(workspace)/settings/sign-out-buttons.tsx`, `components/appearance-choices.tsx` and `components/page-workspace.tsx`.
- **Roles:** `page-workspace` (page-roles.css:1306), `workspace-content` (1418), `appearance-settings` (1754), `panel` (607), `section-heading` (362) and `button-secondary` (387).

## Profile

- **Route:** `/profile`.
- **States:** `profile--experience` and `profile--empty`.
- **Use cases:** `use_case_set_name`, `use_case_experience` and `use_case_days_signed_in`.
- **Components:** `app/(workspace)/profile/page.tsx`, `app/(workspace)/profile/name-form.tsx`, `components/experience/experience-card.tsx`, `components/experience/ability-tiles.tsx` and `visits/signed-in-days-card.tsx`.
- **Roles:**
  - cards: `profile-card` (page-roles.css:791), `signed-in-days-card` (801) and `profile-card-body` (805);
  - ring: `profile-ring` (811), `profile-ring-arc` (816), `profile-ring-disc` (820), `profile-ring-track` (824), `profile-ring-fill` (829), `profile-ring-label` (834) and `profile-ring-number` (839);
  - name and standing: `profile-name` (843), `profile-name-row` (847), `profile-name-heading` (851), `profile-title` (860), `profile-progress` (867), `profile-standing` (886) and `profile-next` (890);
  - abilities: `ability-tiles` (896), `ability-tile` (900), `ability-tile-untried` (909), `ability-tile-most` (917), `ability-badge` (940), `ability-icon` (946), `ability-name` (961), `ability-count` (966), `ability-number` (971), `ability-worth` (975) and `ability-hint` (981);
  - shared: `page-workspace` (1306), `workspace-content` (1418), `section-heading` (362), `notice` (587) and `icon-line` (574).

## Construct profile

- **Route:** `/constructs/CONSTRUCT_ID`, where `CONSTRUCT_ID` is the construct's ID, such as `vellum`.
- **States:** `construct--vellum` and `construct--lumen`.
- **Use case:** `use_case_view_character_profile`.
- **Components:** `app/(workspace)/constructs/[constructId]/page.tsx`, `components/constructs/construct-visual.tsx` and `components/constructs/adventure-character-header.tsx`.
- **Roles:** `page-frame-editor` (page-roles.css:263), `definition-editor` (272), `section-heading` (362), `field-label` (498) and `construct-visual` (1262).

The construct page borrows the spell editor's frame (`page-frame-editor`, `definition-editor`) and lays out its details with Tailwind utilities (`grid grid-cols-2 sm:grid-cols-4`).

## Role use across the site

[`classes.md`](classes.md) has the full tables: every role in `page-roles.css` and `chat.css`, its line, the number of captured states that use it and the views it appears in. The totals are below.

| File | Roles | Seen in a capture | Never seen |
| --- | --- | --- | --- |
| `app/page-roles.css` | 242 | 213 | 29 |
| `components/chat/chat.css` | 26 | 19 | 7 |

These roles in `page-roles.css` appear in no captured state:

- quest sharing and members: `quest-sharing-mark`;
- quests list and title: `quests-index-answer` and `quest-title-input`;
- spell editor: `prompt-editor-save-hint`;
- shared: `page-heading`, `button-quiet-danger`, `card-actions` and `skeleton`;
- profile and constructs: `profile-name-form`, `construct-trail-tools`, `character-header-control` and `construct-card`;
- dailies: `workspace-rows`, `day-grid`, `day-grid-days`, `day-grid-day`, `day-grid-square`, `streak-chain`, `streak-links`, `streak-link`, `streak-note` and `dailies-day-controls`;
- editable lists: `editable-badge`, `editable-add-form` and `editable-form`;
- workspace menu: `workspace-menu-tab`, `workspace-menu`, `workspace-menu-item` and `workspace-menu-check`.

These roles in `chat.css` appear in no captured state: `task-list-item`, `chat-reply-stopped`, `chat-composer-spell`, `chat-image`, `generated-image-link`, `generated-image-fill` and `chat-image-fill`.

Most of these belong to states outside the brief, such as dailies, generated images, a stopped reply, the name form and loading skeletons. A role that no state reaches may also be dead, so check its component before you drop it.

## Drifting styles

These are places where a view styles itself outside the shared roles, or where two roles do one job.

### Literal colours

`page-roles.css`, `chat.css`, `construct-discovery.css`, `themes/contract.css` and `app/globals.css` hold no literal colours. Every colour comes from a theme token. `themes/parchment.css` has 97 lines with literal colours, which is expected for the theme file. `classes.json` lists them under `literal_colors`.

### Borrowed roles

- **Spellbook:** `app/(workspace)/spellbook/spell-index.tsx` and `forgotten-list.tsx` list spells with the quests list's `quests-index-tabs`, `quests-index-row`, `quests-index-link` and the other `quests-index-*` roles. `app/(workspace)/spellbook/forgotten-list.tsx:57–81` also adds `flex flex-wrap items-center gap-x-5` to `quests-index-restore`.
- **Construct profile:** the construct page uses the spell editor's `page-frame-editor` and `definition-editor`.

### Duplicated roles

- **Experience rings:** the header's `circle-progress` ring (page-roles.css:764–790, `components/experience/circle-progress.tsx`) and the profile's `profile-ring` (page-roles.css:811–842, `components/experience/experience-card.tsx`) draw the same circle progress as two SVGs with separate roles.
- **Section headings:** `visits/signed-in-days-card.tsx:15` styles its heading with `font-bold font-heading text-section-heading` instead of the `section-heading` role that the other profile card uses. Line 19 sets its number with `text-site-title-wide`, the site title's type size.
- **Chat thread:** `chat-thread` is declared in `chat.css:199`, and `page-roles.css:255` adjusts it from outside with `.page-column:has(.chat-thread)`.

### Classes with no rule

- `panel-collections` (`components/panel-collections.tsx:41`) wraps the sidebar's collection tabs and has no rule.
- `timer-engraving` (`components/timer/timer-dial.tsx:21`) groups the dial's engraving and has no rule.
- `lucide` and `lucide-*` are added by the icon library and have no rule. The `icon` role styles the icons instead.

### Utility clusters

- **Select fields:** `components/ui/field.tsx:137–142` builds the select chevron from utilities (`appearance-none pr-9` on the control and `pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted` on the icon). This cluster appears in the quest, spell, timer and quick-note captures.
- **Page layout:** the sign-in, sign-up, profile, construct and settings pages set their outer layout with utilities such as `flex flex-col gap-4`, `max-w-sm` and `grid-cols-2`. `classes.md` lists each view's utilities.
- **Trail band:** `trail-band` (page-roles.css:1024–1034) applies `bg-trail-surface/70` with no backdrop blur. Scrolled conversation text shows through the sticky breadcrumb bar in all three appearances.

### Inline styles

Inline `style` attributes in the captured HTML come from three sources:

- `components/header-size.tsx:42` sets `--header-controls-height` on the header, which `trail-band` reads at page-roles.css:1006–1019.
- `components/chat/use-chat-scroll.ts:183` sets `--chat-keyboard-inset` on the chat thread, which `chat.css:203` and `chat.css:362` read.
- Radix (dropdown positions and pointer-event locks) and Next.js (`next/image` crop and fill styles, the route announcer) add their own.

No component sets a colour or a size as an inline style.

### Layout tokens in the theme file

`themes/parchment.css` sets 42 distinct `--timer-*` tokens in 99 declarations across the three appearances, several of them radii in px. They switch the timer between the dial and the hourglass for each appearance, so the theme file controls layout as well as colour.

### Layout faults seen in the screenshots

- **Docked site panel:** at 1280 px the docked site panel covers the left edge of the quests list. Only `trail-content` moves aside for it (page-roles.css:1048–1051); the page content does not.
- **Completed-quest notice:** at 1280 px the notice on a completed quest runs under the quest sidebar (`quest--completed--*--1280.png`).
- **Spell error spacing:** in `spell--invalid-field` the error text touches the next field's label.
- **Phone timer title:** at 360 px the timer's heading is cut short (`timer--*--360.png`).
