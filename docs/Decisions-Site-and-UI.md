# Decisions: Site and UI

Part of [Decisions](Decisions.md). Each decision has a name, which issues and code comments use to refer to it.

## `suspense-via-segment-conventions`

Biome 2.5.15 reports `import { Suspense } from "react"` under `noUnresolvedImports` (biomejs/biome#10283). Axlog chose (2026-10-10) Next's segment conventions instead of inline `<Suspense>`: each route's static shell sits in the segment's `layout.tsx`, the page holds only the data-dependent part, and `loading.tsx` holds the fallback. No code imports `Suspense`, and the rule stays on.

## `header-links-slot`

Signed-in header links come from the root parallel slot `src/app/@header/`, which reads `currentUser()` (orchestrator, 2026-10-12). The header waits for that read and arrives whole in the first HTML (Axlog, 2026-10-14; #106). The slot has no loading state; the root layout sets `instant = false`, disabling Cache Components' static-shell check app-wide. Pages render per request, while their own content still streams behind segment `loading.tsx`. The slot's `error.tsx` keeps a database failure within the page's error display.

Links are Chat (`/chat`), Projects, Buddies, Settings and Account, followed by the theme picker. On an iPhone 15 the header uses at most two rows in every theme, one where it fits (Axlog, 2026-10-13; #17, #309). Below `sm`, links flow from the site name's row and wrap; the picker shows only its icon but keeps its accessible name. Targets stay 44 px tall and the site name stays at least 24 px tall. From `sm` up, the links form a row beside the name. At 320 px a third row is preferable to sideways scrolling. `site-header.browser.test.tsx` checks the row limit.

Rejected: streaming links behind placeholder copies, which left the header incomplete without JavaScript; a session read in the root layout, where a database failure would fail the whole page; client pathname-based links, which require Suspense; duplicated public-route lists; a public Settings page; and a menu that hides Settings and Account.

## `chat-ui-assistant-ui`

The chat is built from assistant-ui primitives (`@assistant-ui/react` with `@assistant-ui/react-ai-sdk`), not copied registry components, so only our thin wrapper is linted (Axlog, 2026-10-11). It renders custom parts through `MessagePrimitive.Parts`. Risks: it is 0.x with daily releases (versions pinned), and it keeps a second state store mirroring `useChat`. Rejected: Streamdown alone (not a chat UI), copied Vercel AI Elements (250–600 Biome diagnostics), and CopilotKit, Deep Chat, NLUX, chatscope and LlamaIndex chat-ui.

## `adopt-radix-ui`

Radix Primitives through the unified `radix-ui` package, styled with our own tokens, cover every design element of the site (Axlog, 2026-10-11). It is an npm dependency, so Biome doesn't lint it. assistant-ui stays for the chat's behaviour. Rejected: shadcn/ui (on Radix or Base UI: copied code that Biome lints, plus `cva`, `clsx` and `tailwind-merge`) and Base UI alone.

## `chat-ui-flags-and-mobile`

Orchestrator, 2026-10-12, on Axlog's requests.
- **Breadcrumbs stay reachable in long chats:** the chat page's header (breadcrumbs and title) stays pinned while messages scroll, compact on phones. The chat name stays clamped to one line there; the full name shows in the chat list and the Rename field. Rejected: breadcrumbs under the composer, a "back to top" button, a two-line name on phones (the header would reach about 25% of an iPhone 15 screen) and a `title` (hover-only).
- **Feature flags for extras, on by default, switched by the user:** one registry in `src/flags/`; `/settings` switches them off; `<html data-hide>`, set before paint from the cookie, hides tagged elements through the last cascade layer, `extras`. Hiding is display only. Extras: working notes, memory change cards, tool lines, the pinned header, chat names in the chat list, page decorations, the usage meter, a persona's prompt mechanics parts, and the interview persona picker. The persona mechanics and interview persona extras are the two off by default (issues #104, #108). Citations, the persona label and the composer are not extras. Rejected: deploy-time flags only Axlog controls.
- **Mobile is supported:** every page works on phones. Both chat pages, `/chats/[chatId]` and the central chat's `/chat`, export a `viewport` that sets `interactiveWidget: "resizes-content"`; dynamic viewport units were rejected because the document scrolls and the composer is sticky.

## `chat-project-filter-contract`

The isolated `ChatProjectFilter` named export in `apps/web/src/components/chat-project-filter.tsx` is server-renderable (#480). Its `projects` prop is a readonly, ordered array of `{ id: ProjectId, name: string }`; `selectedProjectId` is an optional `ProjectId`. It performs no data queries or URL parsing and has no client-side selection state or callbacks. The caller supplies already-owned projects and resolves raw URL values against that list; the control is not an authorization boundary.

The native select has the visible and accessible label **Project**, field name `project`, and **All** first with an empty value, followed by the supplied projects in their original order. A matching id is selected in the server HTML; an omitted or unknown id falls back to All without adding an option. With no projects, All remains the sole selected option and the **Show chats** submit button stays enabled. There is no No project option or search. The select and button share a native GET form with action `/chat`; submitting All sends `project=` without requiring JavaScript. Labels come from `STANDALONE_CHATS_COPY` in `src/ui/copy/chat.ts`.

The control reuses the site's themed `SelectField` and secondary `Button`, with both targets following `--target-size` (44 px by default). Its layout contains long spaced and unbroken names at 320 and 390 px without sideways scrolling; the closed select may truncate, but each option retains its full name. Isolated server-markup and native form-serialization tests cover the contract, while Vitest browser tests cover phone layout, larger target tokens, and keyboard focus across themes and modes.

This is a handoff contract, not a completed Chats page: #480 does not wire the filter into `/chat`, change queries or chat cards, or update page screenshots and visual baselines. Final page composition belongs to the parent Chats work (#472).

## `reload-during-reply-known-gap`

A reload during a reply loses the live reply (orchestrator, 2026-10-12; issue #52). The server still finishes and saves the reply, but the reloaded page shows only the user's message until they reload again after the reply is saved. This is a known limitation in version 1. Deferred, not rejected: resumable streams (they need a shared stream store) and a "still replying" state that picks the reply up (it needs a way to tell a reply in progress from a failed one, which also shows as the user's message with no reply).

## `site-themes`

Themes are Gravy Falls (the default), Ghost Hasslers and Ay, Liens!, spoofs of Gravity Falls, Ghostbusters and Aliens, each with Light, Dark and System (Axlog, 2026-10-11). Components read semantic tokens; themes only define them. The choice lives in a cookie (per browser, not per account), applied by a pre-paint script, so the HTML needn't depend on it; the proxy reads it only for font preload headers (below). The cookie is written by a Server Action (`saveThemeChoiceAction`) with no account check, so it is saved in every browser and on signed-out pages. Rejected: the Cookie Store API, which is missing in browsers from before 2025 and on pages not served over HTTPS or localhost (#42).

Theme fonts are self-hosted from `apps/web/src/themes/fonts/<family>/` via `next/font/local`: latin, `wght`-only variable woff2 files, each with its `OFL.txt`, copied from the `@fontsource-variable` packages (#123; @axolotl-logic, 2026-10-14). Rejected: `next/font/google`, which fetches from Google Fonts at build time, and fontsource as a dependency.

The server's rendering never reads the theme cookie, and the HTML is the same for every visitor. The proxy (`apps/web/src/proxy.ts`) reads the cookie only to send a `Link` header that preloads the saved theme's fonts on every page it lets through (not `/api/*`, redirects or 401s); a missing or unknown theme preloads Gravy Falls' (#124, 2026-10-14). No font preloads through next/font (`preload: false` on every font). The URLs come from the committed `apps/web/src/themes/theme-font-urls.ts`, regenerated from a production build's `@font-face` rules after a font file, its options or Next's version changes; `npm run check:build-fonts` (`apps/web/scripts/check-build-font-urls.ts`) checks them against the build's `@font-face` rules: `npm run test:e2e` runs it after its build, before starting the server, and it fails on any drift or when there is no built CSS. It is a script over `.next/static/**/*.css`, not a Playwright test, so `e2e-visual-and-auth-only` is unchanged (#348, 2026-10-17; it replaced the check in `e2e/theme-font-preload.spec.ts`). Rejected: (a) reading `.next` manifests at runtime, since next/font's manifest lists only preloaded fonts (none) and it ties the proxy to build internals and the filesystem; (b) keeping next/font's own preload, which goes in the shared HTML, so every visitor would also get the default theme's fonts; (c) preloading every theme's fonts; (d) choosing preloads in the pre-paint script, ruled out by @axolotl-logic; (e) `cookies()` in the layout, which loses the prerendered shells. The theme picker also preloads a theme's fonts on the client when its option is pointed at or focused (not the applied theme's), with `ReactDOM.preload` and the same `theme-font-urls.ts` map, so choosing it shows no fallback font; the shared HTML and the pre-paint script are unchanged (#125, 2026-10-14).

## `theme-spacing-token`

Each theme sets its own spacing unit, which Tailwind's `--spacing` follows (Axlog, 2026-10-11): Gravy Falls 0.25rem, Ghost Hasslers 0.28rem, Ay, Liens! 0.22rem.

## `theme-heading-sizes`

Each theme sets its own heading sizes, read by `page-roles.css` (Axlog, 2026-10-12). Ay, Liens! uses smaller headings, so the login title stays on one line and "Project memory" stays beside a long project name. In Gravy Falls, Axlog accepted that the link drops below a project name of 37 or more characters; the heading test uses 36 there and 40 in the other themes. Ay, Liens!'s `danger` reads as red in both modes.

## `fixed-width-times`

Times (`formatTime`, `LocalTime`) are fixed-length and set in the theme's monospace font with tabular figures (Axlog, 2026-10-13, #58): the day and 12-hour clock hour are zero-padded and months are three letters, as in `Oct 02, 2026, 08:16 PM`. The server's unseen UTC placeholder is then as wide as the browser's local time, so the line does not shift on hydration. The day and the clock are formatted apart and joined with ", ", because engines join them differently: WebKit writes `Oct 12, 2026 at 08:16 PM`, which is longer than the server's placeholder (found by the zoned browser test, #140). Rejected: reserving a fixed box for the time, rendering the browser's zone on the server from a cookie, and accepting the shift.
