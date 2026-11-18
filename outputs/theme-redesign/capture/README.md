# Theme redesign capture

This folder records how Project Buddy looks and is built today, as the starting point for the theme redesign in [`../BRIEF.md`](../BRIEF.md). It holds screenshots and hydrated HTML of the brief's critical views and states in all three appearances, and an inventory that traces each view's classes to where they are declared.

## Contents

| Path | What it holds |
| --- | --- |
| `screenshots/` | One PNG for each view, state, appearance and width, named `<view>--<state>--<appearance>--<width>.png`. |
| `html/` | The hydrated DOM of each view and state, named `<view>--<state>.html`. A `--360` file exists only where the phone markup differs from the desktop markup. |
| `css/` | The compiled stylesheet the HTML files link to. |
| `inventory.md` | Each view's route, use cases, React components and CSS roles, and the styles that drift from the shared roles. |
| `classes.md` | Every class in each view, traced to its declaration, and every role in `page-roles.css` and `chat.css` with the views that use it. `classes.py` writes it. |
| `classes.json` | The same data as `classes.md`, with each class's count, each view's inline styles and the literal colours in each CSS file. Its per-view `components` list is a loose match: every `.tsx` file that writes one of the view's class names, so it includes files the view doesn't render. `inventory.md` lists the components each view really uses. |
| `capture-log.json` | One entry per screenshot: its URL, appearance, the page's heading and any console errors. |
| `capture.mjs` | The Playwright script that makes `screenshots/`, `html/` and `css/`. |
| `sign-in.mjs` | The Playwright script that signs a review account in and saves its session. |
| `classes.py` | The script that traces classes and writes `classes.json` and `classes.md`. |
| `compress.py` | The script that reduces the screenshots to a 128-colour palette. |

The appearances are named by their theme cookie mode: `light` is Ivory Vellum, `soot-brass` is Soot & Brass and `dark` is Espresso Leather. The widths are 1280 px (desktop) and 360 px (phone).

## Source revision

The capture shows commit `916daaa2d81b31c11422a5a8a86a63f2a30d1822` on the branch `t3/theme-redesign-mockups`, made on 2026-11-17. The site ran under `next dev` (Next.js 16.4.6), and Playwright 1.64.0 drove Chromium.

## Capture method

Each screenshot shows one page in a fresh browser context, with these settings:

- The `theme` cookie is set to `parchment.<appearance>`, so the site applies the appearance before the first paint, as a returning visitor sees it.
- On desktop, `localStorage` holds `site-panel=docked`, so the site panel is docked open on wide screens as the brief asks. The site panel is closed at 360 px.
- The script waits for the network to go quiet, for the fonts to load and then 700 ms more, so animations finish.
- The script removes the Next.js development indicator (`nextjs-portal`), which production doesn't show.
- For a full page, the script grows the window to the page's height, up to 5000 px, and then takes one window screenshot. Playwright's own full-page mode draws the sticky header in the wrong place.
- For an overlay (a menu, dialog or drawer), the script takes the window only, at 1280 × 900 or 360 × 780.
- For the quest sidebar tabs (`quest--ideas`, `quest--quick-notes` and `quest--progress`), the script grows the window to fit the sidebar, not the whole page. On desktop these screenshots show the top of the conversation beside the full sidebar, not the full conversation; `quest--conversation` shows that. On a phone they show the open drawer.

The HTML is the page after hydration, saved in the Ivory Vellum appearance. The other appearances differ only in the `data-mode` attribute on `<html>`. The script removes every `<script>` element and script preload, so a file opens as a static page. Each stylesheet link points to the copy in `css/`, and texture URLs in that copy point to `apps/web/public/textures/`.

**Note:** Font URLs in `css/` stay relative to the dev server, so an HTML file opened from disk shows fallback fonts. The screenshots show the real fonts.

## Review accounts

The capture uses two accounts in the local development database (`pb_dev_ae7e329a597c` on `127.0.0.1:5434`). Both are still there.

| Email | Name | Data |
| --- | --- | --- |
| `capture-review@project-buddy.test` | Mara Quill | Three quests, three spells, Quick Notes, ideas, milestones and 46 experience (circle 4, Initiate). |
| `capture-empty@project-buddy.test` | Fen Holloway | Nothing. It shows the empty states. |

The review account holds this data:

- "Read Latin on old maps" (`ed8448f4-cb54-4136-bc7f-ac00c21dae60`), an active quest with Vellum. It has 4 tasks (2 done), 2 ideas, 3 Quick Notes, three milestones, a `look` reply, an `exp` reply and a construct reply that records a milestone.
- "Build a walnut bookshelf" (`2570dd70-eec6-496a-904c-1301bd1e64b1`), an active quest with Lumen. It has 6 tasks (1 done), an idea, a `help` reply and a cast of the spell "Workshop log".
- "Run the autumn book swap" (`e55ce70e-1030-458f-ae70-6fc7975d134b`), a completed quest with 3 done tasks.
- The spells "Workshop log" (`7945a0c8-44ac-49bd-b0ff-a11cb7e64630`, Tasks), "Margin notes" (`0ee7f236-abda-4b85-9478-44eb1de9ab6c`, Ideas) and "Morning bell" (`0fdd642f-84f0-46a2-ac3c-1cdd96b2f03c`, Tasks), each with a reply list.

All of this was made through the site's own pages and commands, with two exceptions. The local construct never calls the `record_milestone` tool, so the three milestones were inserted into the `milestones` table. The construct reply that shows the "Added to the progress timeline" card was inserted into the `messages` table as a user message (`captureMsU1aaaaa`) and an assistant message (`captureMsA1aaaaa`) with a `tool-record_milestone` part.

The `sign-in--link-sent` state asks for a sign-in link for the review account, so each capture run adds links to the local email outbox in `apps/web/test-results/dev-email-outbox/`.

## Capture rerun

To capture the views again, follow these steps from the repository root:

1. Prepare the local environment:

   ```sh
   mise run setup
   ```

2. Start the site on a free port, such as 3100:

   ```sh
   cd apps/web && PORT=3100 npm run dev
   ```

3. In another terminal, print a sign-in link for each account:

   ```sh
   mise run sign-in-link capture-review@project-buddy.test
   mise run sign-in-link capture-empty@project-buddy.test
   ```

4. Save each account's session outside the repository. Replace `REVIEW_LINK` and `EMPTY_LINK` with the links from step 3:

   ```sh
   node outputs/theme-redesign/capture/sign-in.mjs REVIEW_LINK "Mara Quill" /tmp/pb-capture/review.json
   node outputs/theme-redesign/capture/sign-in.mjs EMPTY_LINK "Fen Holloway" /tmp/pb-capture/empty.json
   ```

5. Capture every view and state:

   ```sh
   BASE_URL=http://localhost:3100 \
   REVIEW_STATE=/tmp/pb-capture/review.json \
   EMPTY_STATE=/tmp/pb-capture/empty.json \
   node outputs/theme-redesign/capture/capture.mjs
   ```

   To capture only some states, add a filter such as `quest--` as the last argument. The script captures each `<view>--<state>` name that contains it. A full run takes about 40 minutes.

6. Reduce the screenshots to a 128-colour palette:

   ```sh
   python3 -I outputs/theme-redesign/capture/compress.py
   ```

7. Trace the classes again:

   ```sh
   python3 -I outputs/theme-redesign/capture/classes.py --markdown
   ```

The script finds the quests and spells by their names, so it needs the review account's data. If the local database is reset, sign up both accounts again and recreate the data listed in [Review accounts](#review-accounts).

The `timer--running-*` states start a timer 18 or 54 minutes before the run, so their clocks show the time of the run.

## Screenshot palette

`compress.py` quantizes each screenshot to 128 colours with median cut and no dithering. This halves the screenshots' size, from 123.8 MB to 60.2 MB, and keeps text and textures faithful at full size. The whole folder is about 63 MB. Pixel colours can be off by a few steps, so read exact colours from `apps/web/src/themes/parchment.css`, not from the screenshots.

## Gaps

These states from the brief are missing or were made in a way that differs from real use:

- **Sign-in form error:** the sign-in and sign-up forms show no error of their own. They rely on the browser's built-in validation, which draws a native bubble that Playwright can't capture. The capture shows three other notices and errors instead: `sign-in--link-sent` (the "check your email" notice), `quest--command-error` (a bad task command under the composer) and `spell--invalid-field` (a required field left empty).
- **Loading construct reply:** the local construct answers in a few milliseconds. To hold the reply open, the script blocks the browser's request to `/api/chat` in `quest--loading-reply`. The page shows the real pending state ("Vellum is thinking…", the Stop reply button and the locked Tasks panel), but the server never receives that message.
- **Milestone reply:** the milestone card in the conversation comes from inserted rows, as [Review accounts](#review-accounts) explains.
- **Production build:** the site ran under `next dev`, not a production build. Markup and CSS match a build, but the CSS file is the unminified development bundle.
- **Phone drawers:** at 360 px the quest sidebar is a drawer. The states `quest--ideas`, `quest--quick-notes`, `quest--progress`, `quest--row-menu` and `quest--confirm-dialog` open it first, and `quest--sidebar-drawer` shows it alone. `quest--sidebar-drawer` has no desktop screenshot, because the sidebar is always open there.
- **Views outside the brief:** the capture leaves out the home page, Credits, quest members and invitations, dailies, forgotten spells and retirement, expired sign-in links, the session-expired page, joining a shared timer and construct generation.
