# Decisions

Each decision has a name, which issues and code comments use to refer to it. A decision records what was chosen and what was rejected. "Autumn" marks a decision by the project's owner; "orchestrator" marks one made by the agent that ran the build, which stands until Autumn reverses it. The rules that follow from these decisions are in `CONTRIBUTING.md`.

## Product

### `manual-only`

The tutor indexes only the Blender Reference Manual. On 2026-10-09 Autumn dropped the developer docs, the Python API guide pages, Blender Studio training and screenshot check-ins.

### `manual-via-git-clone`

The index comes from a git clone of the manual source at `projects.blender.org`, which works over HTTPS although the web UI is behind a Cloudflare challenge. The repo holds about 2,400 RST files under CC BY-SA 4.0. Blender has no official GitHub mirror, and unofficial copies are not used. Use plain `git clone`; `gh repo clone` fails there with HTTP 405.

### `latest-stable-manual`

Index only the latest stable release branch (`blender-v5.3-release` as of 2026-10-09) and cite `latest` URLs (`docs.blender.org/manual/en/latest/...`, matching the branch's `html_baseurl`). Version-pinned `/5.3/` URLs also resolve, but Autumn chose `latest`. Re-index when a new stable release ships.

### `keyword-search-agentic`

Search uses keywords only, with no embeddings. Claude writes the queries and refines them across several searches, using Postgres full-text search in Neon. Add hybrid search with Voyage embeddings only if the tutor misses relevant sections.

### `project-memory-shared-text`

Project state lives in one editable Markdown document per project, shared by all of the project's chats and injected into their prompts. The tutor edits it directly, and the edits are visible, versioned and reversible.

### `use-case-behavior-rulings`

Orchestrator, 2026-10-11:
1. A question outside Blender gets a brief in-persona answer, with no manual links and an offer to return to the project.
2. When the manual lacks a topic, the tutor says so, gives no uncited Blender steps, and may link a related section it looked up.
3. Undo restores an earlier version as a new version, and every version stays.
4. A save based on an outdated version is refused. The newer version is shown, and the user's unsaved text stays on screen.
5. Each memory version records when it was made and whether the user or the tutor made it.
6. Only the tutor's replies render as Markdown. The user's messages show exactly as typed.

### `project-interview-rulings`

- **New Project** has no persona choice; its chat is always Hippy (Autumn, 2026-10-12).
- **Openings:** Claude writes every new chat's opening in the persona's voice, in one awaited call (30 s timeout), before any row is created. With empty memory it is the interview's first question; otherwise a synopsis of the project and what's next.
- **No fallback** (Autumn, 2026-10-12): if the opening call fails, nothing is created, and the form keeps the input and says Claude is unavailable. Replies in an existing chat keep their error message under the reply; no status check and no locked composer.
- **The interview** asks for goal, skill level and purpose, one question at a time, then milestones, saving to memory after every answer. `personas-and-prompts-rulings` narrows it to the project's creation chat.

### `haiku-chat-names`

Claude Haiku names each chat after the user's 1st, 3rd, 5th, 7th and 14th message (their messages only). A user can rename a chat by hand, and then Haiku stops renaming it. These calls count toward the quota. Tests use the mock.

### `working-notes-quiet`

Text in a reply that isn't meant for the user shows as a quiet note (Autumn, 2026-10-11). A text part is a working note when a later inline tool part in the same reply is a lookup (Autumn, 2026-10-12): text before `search_manual` is a note; text before `update_memory` or `cite_manual` is not. Each `TOOL_PARTS` entry says which. The rule is presentational only, applies to saved chats on reload, and a note is smaller, muted and labelled.

### `not-found-is-200`

A Not found page answers HTTP 200, not 404 (Autumn, 2026-10-12; issue #46). `loading.tsx` on the id routes streams the shell before `notFound()` runs, and the page carries `noindex`. The loading skeletons stay. Rejected: an ownership check in `proxy.ts`; dropping `loading.tsx` on the id routes; a lookup in a layout above the loading boundary.

## Personas

### `persona-spoof-names`

Personas have spoof names, like the themes (Autumn, 2026-10-11, renamed 2026-10-12): Hippy (the default), Mr. Tee, Fjord Tines, Span Tines, Argon Sprangler and Roland Dustchain (ids `hippy`, `mr-tee`, `fjord-tines`, `span-tines`, `argon-sprangler`, `roland-dustchain`). Fjord and Span are brothers. Only real names are out. A chat saved under an unknown id reads as Hippy.

### `personas-as-text`

Personas are text (Autumn, 2026-10-11). The six built-ins are text in the repo, and each user's personas are stored as text. A user creates a persona by cloning one, then edits it. A chat keeps the persona text it started with, as a snapshot, so editing a persona doesn't change existing chats.

### `personas-and-prompts-rulings`

Autumn asked on 2026-10-12 for cloning, the interview at project creation, and editable prompt parts. Details are the orchestrator's (2026-10-12) unless marked.
- **Every static prompt part is editable** (Autumn): the user sees the prompt as named parts and edits them; a persona is its full set of static parts (voice, teaching rules, interview, tool, citation and memory mechanics). Dynamic parts (memory, project name, date, manual version) show read-only. Each part has "reset to default"; mechanics parts warn that changes can break citations, memory or search. Built-in personas are read-only; editing one starts a clone.
- **What counts as a part:** tool descriptions (`search_manual`, `cite_manual`, `update_memory`) are editable, built per request by a typed `tutorTools(descriptions)` factory; input-field descriptions show read-only. The kickoffs and the answer-now note are parts, and their recognisers (`isNeutralKickoff`, `isOpeningKickoff`) move with them; the mock recognises them by text, since position can't tell a site-started chat from a seeded one. The memory part's intro is editable; its `<project_memory>` tags are locked. `PERSONA_SHARED_RULES` ("facts don't change with voice") is its own part. Date and manual version go in the second system message, so the shared prefix stays cached.
- **Cloning:** a built-in persona or one of the user's own, into their own as "<name> (copy)".
- **No sharing** (Autumn, 2026-10-12): a persona is never visible to another user. No share links, no share table, no share page. Rejected earlier: a live shared persona and a gallery.
- **One persona per chat** (Autumn, 2026-10-12): no multi-persona chats. A chat keeps the one persona it started with, as a snapshot (name and parts) on the chat row. Rejected: a `chat_personas` table and `messages.chat_persona_id`, which only multiple personas needed.
- **Interview at project creation:** only the creation chat interviews, while the memory lacks any of goal, skill level, purpose or milestones, and the project page links back to it. It is marked by `projects.interview_chat_id`, set by `startProject`.
- **Caching cost is measured, not capped:** each release's smoke test records `cacheRead` and `cacheWrite` for an edited persona.

### `no-banned-lists`

No banned-word lists, no content guardrails on the personas, and no tests of what the personas say (Autumn, 2026-10-12). Kept: the shared rules that keep steps, menu paths, shortcuts and citations exact, and their tests. Catchphrases, in-world words and franchise nods are allowed everywhere; words already removed stay removed unless Autumn asks. Reviews and smoke tests don't judge a persona's voice; a smoke test checks the persona's name and that the reply answers.

## Claude

### `claude-via-ai-sdk`

Claude, through the Vercel AI SDK with Autumn's Anthropic API key, powers the tutor. The model ids live in the tutor module: `claude-sonnet-5-5` for replies and openings, `claude-haiku-5-5` for chat names.

### `anthropic-prompt-caching`

Anthropic prompt caching, through the AI SDK, stays hidden inside `src/tutor/` (Autumn, 2026-10-10). It roughly halves the cost of search-heavy questions.

## Accounts

### `passphrase-gated-email-sign-in`

No public sign-up (Autumn, 2026-10-11). This replaced the original passphrase-only gate.
- **"Site passphrase" became "invite code"** (Autumn, 2026-10-12: "Rename, including in variable names"). A rename only: still one shared code, in the `INVITE_CODE` environment variable. Rejected by Autumn: per-person single-use codes. The field stays masked (`type="password"`), and migration `0004`'s comment stays, since applied migrations don't change (orchestrator).
- **Sign-up** needs the invite code plus an email address. A wrong code sends nothing; the lockout (5 wrong codes per connection in 15 minutes) refuses even the right one. The lockout lives in `rate_limits` under the key `wrong-invite-code:<client>`, and migration `0006` drops the old `failed_logins` table (orchestrator, 2026-10-12). Rejected: a counter generic over two tables. Sign-up with an existing email sends a login link.
- **Sign-in** is by an emailed link, with no passwords. A link lasts 30 minutes and works any number of times within that window (Autumn, 2026-10-12). The link opens a "Continue" page and only its POST sets the session, so mail scanners never get one. It isn't bound to the browser.
- **Answers never reveal accounts:** the form always says "check your email", including for unknown addresses and rate-limited requests, and the email is sent in `after()` so the timing is equal.
- **Link limits** (orchestrator, 2026-10-12): 3 per address and connection per 15 minutes; 10 per address per 15 minutes, counting only requests within their connection's limit; 20 per connection per hour. Addresses are stored as HMACs, and expired rows are deleted as limits are counted. No single connection can use up another's links to an address, but many connections together can still fill an address's limit; the use case documents this.
- **Session:** 30 days, in a signed cookie carrying the user's `session_epoch`. **Sign out everywhere** bumps the epoch and deletes the user's links (Autumn, 2026-10-12).
- **Own code, no auth library** (orchestrator, 2026-10-12): Better Auth makes links single-use with no way to turn it off, and Auth.js v5 is still beta and deletes tokens on use.
- **No admin page** and no seeded account: Autumn signs up like anyone else.

### `resend-for-email`

Resend sends the login emails (Autumn, 2026-10-11) from `bot@axolotl-logic.io`, with the site's title as the display name (orchestrator, 2026-10-12). The domain `axolotl-logic.io` has Resend's DKIM, SPF and MX records and a DMARC `p=none`; the key is send-only. Calls use plain `fetch` with a zod-checked response, and errors are classified by status and name. In tests, `EMAIL_TRANSPORT=outbox` writes each email to a file instead: to a temporary name unique to the write, then renamed to `<key>.json`, so a reader never sees half a file (orchestrator, 2026-10-12). Rejected: one shared temporary name, and retrying parses in the reader.

### `private-user-data`

Each user's projects, memory, chats and personas are private, with isolation tested between two users. `user_id` is on `projects` only; chats, messages and memory reach their owner through the project. `src/accounts/owner-scope.ts` holds the only ownership predicates, every store function takes `owner` first, and a foreign id reads as not found (orchestrator, 2026-10-12). Rejected: `user_id` on every table, branded owned-id types, and Postgres row-level security (the Neon HTTP driver would need a batch per query).
- **Coverage test** (orchestrator, 2026-10-12): `owner-scope-coverage.test.ts` checks every export of every module that touches user data. An insert passes when the owner is in the inserted values or comes through a parent row the same call inserted for the owner. `login-links.ts` is included, each export allowed by name with its reason, and a stale allowance fails the test. The rate limits and the invite-code check stay out, since they are keyed by address or connection, never a user. Rejected: leaving `login-links.ts` out.
- **A foreign project's memory:** `editMemory` returns `undefined`, as restoring does, and the `update_memory` tool throws `AppError("not-found")` (orchestrator, 2026-10-12). Rejected: a new tool output status, and a `not-found` result variant.
- **Hidden extras** are stored in `users.hidden_extras`. `/settings` writes both the database and the cookie, and sign-in copies the database into the cookie, because the pre-paint script reads only the cookie.

### `claude-spend-quota`

Each user may spend $5 of Claude per calendar month in UTC, Autumn included (Autumn, 2026-10-11).
- **What counts:** every model call (replies and every step, the answer-now call, openings, naming) at the model's prices, including cache reads and writes, metered once in `model.ts`. Prices live in `src/quota/prices.ts`, in micro-USD.
- **Over quota:** new messages, chats and projects are refused with the quota message and the reset date (the 1st of next month, UTC), which the server sends. Reading, renaming and editing memory still work. A reply that crosses the line finishes, with its answer-now call and naming. No smaller model is offered. Rejected: allowing new chats over quota.
- **A refused send** puts the user's text back in the box and leaves no unsaved message or empty reply behind, including in an empty chat.
- **Usage** shows on the account page, with spend rounded up to the cent, but never shown as the limit itself before the quota is used up: 4,990,001 µ$ shows $4.99, and 1 µ$ shows $0.01 (orchestrator, 2026-10-12). Rejected: rounding down. `formatResetDay` in `quota-terms.ts` is the only reset-day formatter.
- **`out-of-credits`** copy speaks to invited users (the tutor is unavailable, try later), not to an admin.
- **An answered message is never answered again:** a resend gets 409 `already-answered`, which the browser handles by reloading. `saveMessage` reports `inserted` or `already-saved`, and a message saved but missing from the history the request read is also refused (orchestrator, 2026-10-12). A resend that arrives while the first reply still streams is still answered and charged (issue #51). Rejected: a double-send e2e test, which would depend on timing, and answering a held last message again only after 300 s, which would block a real retry after a fast failure.
- **Spend for a deleted owner is dropped quietly,** matched only by a foreign-key violation on `monthly_spend`'s user key (orchestrator, 2026-10-12). Rejected: test teardown waiting for `after()`.
- **`finish` waits for the spend write,** so spend is stored before the response ends. Typing was never lost in 144 forced fills on WebKit with it (orchestrator, 2026-10-12).
- **Known gaps:** concurrent replies can overshoot $5 by the replies in flight, and a stream stopped before `finish` is charged an estimate (both by design). A failed spend write is lost (issue #23).

## Site and UI

### `suspense-via-segment-conventions`

Biome 2.5.15 reports `import { Suspense } from "react"` under `noUnresolvedImports` (biomejs/biome#10283). Autumn chose (2026-10-10) Next's segment conventions instead of inline `<Suspense>`: each route's static shell sits in the segment's `layout.tsx`, the page holds only the data-dependent part, and `loading.tsx` holds the fallback. No code imports `Suspense`, and the rule stays on.

### `header-links-slot`

The header's signed-in links come from a root parallel slot, `src/app/@header/`, that reads `currentUser()` (orchestrator, 2026-10-12). Its loading state reserves the links' row with hidden copies, so the layout doesn't shift. `/`, `/login`, `/settings` and `/signup` are partial prerenders: the shell stays prerendered and only the links stream. Rejected: client links reading `usePathname()` (the build fails outside `<Suspense>`); static links by route (stale after signing out everywhere, and a second copy of the public paths); a public `/settings`; null slot pages that would repeat the public paths.

### `chat-ui-assistant-ui`

The chat is built from assistant-ui primitives (`@assistant-ui/react` with `@assistant-ui/react-ai-sdk`), not copied registry components, so only our thin wrapper is linted (Autumn, 2026-10-11). It renders custom parts through `MessagePrimitive.Parts`. Risks: it is 0.x with daily releases (versions pinned), and it keeps a second state store mirroring `useChat`. Rejected: Streamdown alone (not a chat UI), copied Vercel AI Elements (250–600 Biome diagnostics), and CopilotKit, Deep Chat, NLUX, chatscope and LlamaIndex chat-ui.

### `adopt-radix-ui`

Radix Primitives through the unified `radix-ui` package, styled with our own tokens, cover every design element of the site (Autumn, 2026-10-11). It is an npm dependency, so Biome doesn't lint it. assistant-ui stays for the chat's behaviour. Rejected: shadcn/ui (on Radix or Base UI: copied code that Biome lints, plus `cva`, `clsx` and `tailwind-merge`) and Base UI alone.

### `chat-ui-flags-and-mobile`

Orchestrator, 2026-10-12, on Autumn's requests.
- **Breadcrumbs stay reachable in long chats:** the chat page's header (breadcrumbs and title) stays pinned while messages scroll, compact on phones. The chat name stays clamped to one line there; the full name shows in the chat list and the Rename field. Rejected: breadcrumbs under the composer, a "back to top" button, a two-line name on phones (the header would reach about 25% of an iPhone 15 screen) and a `title` (hover-only).
- **Feature flags for extras, on by default, switched by the user:** one registry in `src/flags/`; `/settings` switches them off; `<html data-hide>`, set before paint from the cookie, hides tagged elements through the last cascade layer, `extras`. Hiding is display only. Extras: working notes, memory change cards, tool lines, the pinned header, chat names in the chat list, page decorations, and the usage meter. Citations, the persona label and the composer are not extras. Rejected: deploy-time flags only Autumn controls.
- **Mobile is supported:** every page works on phones. The chat page's `viewport` export sets `interactiveWidget: "resizes-content"`; dynamic viewport units were rejected because the document scrolls and the composer is sticky.

### `site-themes`

Themes are Gravy Falls (the default), Ghost Hasslers and Ay, Liens!, spoofs of Gravity Falls, Ghostbusters and Aliens, each with Light, Dark and System (Autumn, 2026-10-11). Components read semantic tokens; themes only define them. The choice lives in a cookie (per browser, not per account), applied by a pre-paint script so pages keep their prerendered shells.

### `theme-spacing-token`

Each theme sets its own spacing unit, which Tailwind's `--spacing` follows (Autumn, 2026-10-11): Gravy Falls 0.25rem, Ghost Hasslers 0.28rem, Ay, Liens! 0.22rem.

### `theme-heading-sizes`

Each theme sets its own heading sizes, read by `page-roles.css` (Autumn, 2026-10-12). Ay, Liens! uses smaller headings, so the login title stays on one line and "Project memory" stays beside a long project name. In Gravy Falls, Autumn accepted that the link drops below a project name of 37 or more characters; the heading test uses 36 there and 40 in the other themes. Ay, Liens!'s `danger` reads as red in both modes.

## Code and tooling

### `aposd-and-strict-typing`

Ousterhout's *A Philosophy of Software Design*, and the strictest available TypeScript and Biome settings (Autumn, 2026-10-10). Both are written out in `CONTRIBUTING.md`, and reviews check every change against them.

### `biome-for-lint-and-format`

Biome lints and formats instead of ESLint and Prettier, because `eslint-config-next` pulled in `braces@3.0.3` (GHSA-vfj7-8cjw-p6xm), which had no patched release.

### `biome-infos-fail`

Every Biome group is set to `error`, so info diagnostics also fail `npm run check`. Autumn ruled (2026-10-10) that no rule is turned off, the UI may be redesigned to satisfy the rules, and tests get no looser rules. Rules for other frameworks stay off.

### `biome-config-authoritative`

`biome.jsonc` is authoritative (Autumn, 2026-10-10). Where a description of the lint setup differs from it, the config wins, and reviewers don't report the difference as drift. The Astro, Svelte, React Native, Turborepo, Solid, Qwik and Vue domains stay off. A new override or `biome-ignore` still follows `best-practice-over-lint`.

### `biome-drizzle-meta-exclusion`

`drizzle/meta/` stays excluded from Biome, because drizzle-kit rewrites it on every generate (Autumn, 2026-10-10).

### `best-practice-over-lint`

Autumn, 2026-10-10: "Go with the stricter option, especially if it causes a rewrite that improves the general design. Don't hack around the failing rules, design a better system. Default exports are okay, as it is the prevailing setup. Best practices overrule having a lint rule."
- `noDefaultExport` has a scoped override for Next's special files and the tool configs.
- Next's Metadata API exports (`metadata`, `generateMetadata`, `viewport`) are allowed through `useComponentExportOnlyModules`' `allowExportNames` (orchestrator's reading).
- `noNodejsModules`, `noProcessEnv` and `noConsole` are confined to the smallest platform boundaries, which alone get scoped overrides: `src/env.ts`, `error-log.ts`, CLI entry points, and the email outbox (`src/email/outbox.ts`, `e2e/outbox.ts`). Anthropic's snake_case usage keys get a `useNamingConvention` override on `src/quota/anthropic-usage.ts`, its test and `spend-meter-test-kit.ts` only.
- `as const` stays on the `<SECTION>_COPY` objects in `src/ui/copy/`, as every copy module already does; everywhere else annotates the type (orchestrator, 2026-10-12). Rejected: annotating every copy section.
- No lint dodges: no computed keys, bracket reads or `process.getBuiltinModule` to slip past a rule. A Biome bug with no supported fix goes back to Autumn.

### `biome-css-class-rules`

Biome's `noUndeclaredClasses` and `noUnusedClasses` follow imports, and pages escape both because nothing imports them. Roles are plain classes in layered CSS files (`page-roles.css`, `chat.css`). Autumn approved (2026-10-11) a scoped override of both rules on the root layout, the site frame it imports (header, footer, theme picker) and the global CSS files, so the layout can use Tailwind utilities.

### `use-cases-drive-tests`

`use-cases/` (one file per area, conventions in its `README.md`) is the source of the end-to-end tests. `use-cases/use-cases.test.ts` checks that every case has a test titled exactly its slug, or is pending in `e2e/pending-cases.ts`; that every slug title names a case; that every e2e test outside `e2e/visual/` sits under a slug title; and that every link resolves. Version 1 is not done until every case has a passing test. Tests use the mock model against a non-production database; only smoke tests use real Claude.

### `e2e-test-database-speed`

The test database's password is hashed with one SCRAM iteration, in `compose.test-db.yml` only, because the local Neon proxy authenticates every HTTP query (about 8 ms per query instead of 76) (orchestrator, 2026-10-12). The visual projects run in parallel, and the chat screenshots are built from stored rows. Rejected: switching the tests to the websocket `Pool`, which production doesn't use; and dropping the second full run at merges, which is the flake gate.

### `flakes-are-failures`

A flake is a failure: fix its cause or the measurement, and never rerun until it passes (Autumn). A passing repeat adds no evidence, and a diagnosis gets two hours before it goes back to Autumn.

### `gitguardian-false-positive`

GitGuardian's `NODE_CRYPTO_TOKEN` alert on `src/auth/session-token.test.ts` is a false positive: a known-answer token signed with the in-repo test secret (Autumn). Don't rotate it, rewrite history, or derive the fixture at test time.
