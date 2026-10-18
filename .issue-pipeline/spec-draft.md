## Behaviour

1. The site header's chat link reads "Chats" and still goes to `/chat` (`CHAT_COPY.headerLink`, now "Chat").
2. The home page's chat link reads "Chats" and still goes to `/chat` (`HOME_COPY.chatLink`, now "Chat"). Its projects link still reads "Projects" and goes to `/projects`.
3. The error and not-found pages' projects link reads "Projects" and still goes to `/projects` (`PROBLEMS_COPY.projectsLink`, now "Your projects").
4. The projects page's list heading (its `h2` above the list) reads "Projects" (`PROJECTS_COPY.listHeading`, now "Your projects"). The page's `h1` still reads "Projects".
5. The chats page's list heading (its `h2` above the previous chats) reads "Chats" (`STANDALONE_CHATS_COPY.listHeading`, now "Your chats"). The page's `h1` still reads "Chats".
6. Nothing else changes: every link keeps its target, and the other "Your …" texts ("Your name", "Your buddies", the buddy prompt hint) and the header's projects link ("Projects") stay as they are.
7. The visual baselines that show the header, the home page or these headings are regenerated in the same commit as the copy change, and only these labels differ in them.

## Out of scope

- The chats page's project selector and badges (the follow-up issue).
- Any other copy, including `HOME_COPY.projectsLink` (already "Projects", `apps/web/src/ui/copy/site.ts:24`), `PROJECTS_COPY.headerLink`, `ACCOUNT_COPY.nameHeading` and `BUDDIES_COPY.ownHeading`.
- Link targets, page structure and styles.
- `src/components/ui/button.test.tsx:8`, whose local "Your projects" string is test data independent of the copy modules.

## Design

A copy-only change: edit five values in `apps/web/src/ui/copy/`. Every consumer renders the label from the copy module, so no component changes.

| Copy key | File | Old → new | Rendered by |
|---|---|---|---|
| `CHAT_COPY.headerLink` | `apps/web/src/ui/copy/chat.ts:47` | "Chat" → "Chats" | `apps/web/src/components/site-header.tsx:21` |
| `STANDALONE_CHATS_COPY.listHeading` | `apps/web/src/ui/copy/chat.ts:41` | "Your chats" → "Chats" | `apps/web/src/app/(workspace)/chat/page.tsx:25` |
| `HOME_COPY.chatLink` | `apps/web/src/ui/copy/site.ts:25` | "Chat" → "Chats" | `apps/web/src/app/page.tsx:17` |
| `PROBLEMS_COPY.projectsLink` | `apps/web/src/ui/copy/problems.ts:8` | "Your projects" → "Projects" | `apps/web/src/app/error.tsx:42`, `apps/web/src/app/not-found.tsx:16` |
| `PROJECTS_COPY.listHeading` | `apps/web/src/ui/copy/projects.ts:13` | "Your projects" → "Projects" | `apps/web/src/app/(workspace)/projects/(list)/layout.tsx:23` |

After the change the projects page has an `h1` (`layout.tsx:17`) and an `h2` (`layout.tsx:23`) that are both named "Projects", and the chats page's `h1` (`apps/web/src/app/(workspace)/chat/layout.tsx:11`) and `h2` (`chat/page.tsx:25`) are both named "Chats". So a lookup by heading name alone would now match two elements. The existing check at `apps/web/src/app/(workspace)/chat/page.test.tsx:56` therefore now names `level: 2`; I made that edit in the test commit, and it passes before and after the change. The other heading lookups already name a level: `projects/(list)/layout.test.tsx:33`, `e2e/sign-in.spec.ts:117` and `e2e/visual/standalone-chats.spec.ts:33`. Any link lookup that names a label (`site-header*.test.tsx`, `page.test.tsx`, `error.test.tsx`, `not-found.test.tsx`) reads it from the copy module, so it follows the change. `chats/[chatId]/page.test.tsx:77` already expects the chat page's back link, "Chats" (`STANDALONE_CHATS_COPY.backLink`), and renders no header, so it is still unambiguous.

**Visual baselines.** `apps/web/playwright.config.ts:91-98` keeps one `-darwin` baseline per page, theme, mode and screen, with `maxDiffPixels: 10` and `threshold: 0`. The header appears on every signed-in page, so most of the 272 `apps/web/e2e/visual/*.spec.ts-snapshots/*-darwin.png` files will change. Regenerate them on macOS with `npm run test:visual:update` in `apps/web` (`apps/web/package.json:19`). That script runs `test:server` and resets the test database from `.env.test` first (`package.json:16-18`), so the docker test database must be up. It never touches the shared Neon database. Playwright 1.64's `--update-snapshots` defaults to `changed` (`npx playwright test --help`), which rewrites only baselines that fail the comparison. After the run, check `git status`. Commit only the PNGs whose change is one of these labels, together with the copy edit. Leave out any PNG that changed for another reason, since the issue allows only these labels to differ.

**Practices followed** (Coding practices digest; `AGENTS.md`):
- UI: copy lives in `src/ui/copy/`, and components render it from there.
- Tests: tests pin promised behaviour (`tests-pin-promised-behaviour`), and here the promise is the issue's labels. So the new tests name the labels literally, as `projects/(list)/layout.test.tsx:33` already does with "Projects". Copying the constants into the tests would not test the change.
- Site tests (`use-cases-drive-tests`, `e2e-visual-and-auth-only`): the labels are checked in Vitest component tests. Playwright only regenerates visual baselines, and a visual change commits its baselines in the same commit.
- Lint: `test`, not `it`; behaviour-naming titles; functions within biome's line limit. I put the new error-page and chats-page tests in their own `describe` blocks for that limit.
- A flake is a failure (`flakes-are-failures`): if a baseline differs for any reason other than these labels, find the cause and fix it. Never rerun until it passes.

Wiki decision followed: `central-chat` → Navigation (Decisions-Product). I added a "List names" bullet there that records this naming (see Wiki updates). This change departs from no decision.

## Test interfaces

- `SiteHeader`, `SignedInLinks`: `apps/web/src/components/site-header.tsx`, `render(<SiteHeader links={await SignedInLinks()} />)`.
- `Home`: `apps/web/src/app/page.tsx`, `render(<Home />)`.
- `ErrorBoundary`: `apps/web/src/app/error.tsx`, `render(<ErrorBoundary error={error} retry={retry} />)`.
- `NotFound`: `apps/web/src/app/not-found.tsx`, `render(<NotFound />)`.
- `ProjectListLayout`: `apps/web/src/app/(workspace)/projects/(list)/layout.tsx`, `render(<ProjectListLayout params={…}>{children}</ProjectListLayout>)`.
- `StandaloneChatsPage`: `apps/web/src/app/(workspace)/chat/page.tsx`, `render(await StandaloneChatsPage())`.
- The visual baselines: `apps/web/e2e/visual/*.spec.ts`, run by `npm run test:visual` / `test:visual:update`.

## Tests

Committed in `bad7e1fc`. Each test fails today for the right reason: Testing Library finds no element with the new name, and shows the old label ("Your projects", or a link named "Chat") in its error. I ran them once against the base (6 failed, 23 passed). Then I applied the five copy edits locally and ran them again, together with the other site-header, chats and flags unit tests: 21 files and 111 tests passed. I reverted those copy edits before committing.

| Test | Interface | Behaviour | Fails today because |
|---|---|---|---|
| `src/components/site-header.test.tsx` › SignedInLinks › "names the two lists' links Chats and Projects" | `SiteHeader`, `SignedInLinks` | 1, 6 | the header's chat link is named "Chat" |
| `src/app/page.test.tsx` › Home page › "names the two lists' links Projects and Chats" | `Home` | 2, 6 | the home page's chat link is named "Chat" |
| `src/app/error.test.tsx` › "ErrorBoundary's link to the projects" › "names its link to the projects list Projects" | `ErrorBoundary` | 3, 6 | the link is named "Your projects" |
| `src/app/not-found.test.tsx` › use_case_open_missing_page › "names its link to the projects list Projects" | `NotFound` | 3, 6 | the link is named "Your projects" |
| `src/app/(workspace)/projects/(list)/layout.test.tsx` › use_case_view_projects › "heads the list Projects" | `ProjectListLayout` | 4 | the `h2` is named "Your projects" |
| `src/app/(workspace)/chat/page.test.tsx` › "the chats list's heading" › "heads the list of previous chats Chats" | `StandaloneChatsPage` | 5 | the `h2` is named "Your chats" |

Existing tests that keep pinning item 6 and read their labels from the copy modules: `site-header.test.tsx:60` (all five header links, in order, with their hrefs), `site-header-first-html.test.tsx`, `site-header.browser.test.tsx`, `page.test.tsx:33`, `projects/(list)/layout.test.tsx:25` (the `h1` "Projects"), `chat/page.test.tsx:43` (the `h1` and, now level 2, the list heading), `account/page.test.tsx:55` ("Your name") and `buddies/(list)/page.test.tsx:72` ("Your buddies").

The visual baselines are item 7's test. `npm run test:visual` fails today against new copy, and it passes once the regenerated baselines are committed. No new visual spec is needed because no page is added.

To finish, the implementer edits the five copy values, runs `npm run check` in `apps/web` (biome, typecheck, unit tests), regenerates the baselines, and checks that `npm run test:visual` passes.

## Wiki updates

- `Decisions-Product.md`, `central-chat`: added a "List names" bullet. It records that every link or heading naming the two lists reads "Projects" or "Chats" (Axlog, 2026-10-18, #471), and that the other "Your …" headings stay. The Navigation bullet beside it quotes the old "Chat" link, which is why the page needed this update.

## Assumptions and risks

- **The baselines need macOS and the docker test database.** They are `-darwin` only (Issue-Pipeline wiki page). An implementer that can't run Playwright on darwin can't regenerate them, and should hand off rather than commit baselines from another platform.
- **Unrelated pixel drift.** A baseline can drift because of fonts or timing rather than the labels. Leave such files out of the commit, and report them rather than rerunning until they pass (`flakes-are-failures`).
- **Wider labels.** "Chats" is wider than "Chat", which could wrap the header on the narrowest phone shot (320 px, no sideways scroll). Review the phone baselines for a wrapped or clipped header. If it wraps, that is a layout bug to raise, not one to hide in the baselines.
- **Two headings share a name** on each list page (`h1` and `h2`). The issue asks for this. Screen readers can still tell them apart by level.
- **Typecheck in a fresh checkout.** `tsc --noEmit` reported missing `LayoutProps`/`PageProps` until Next's route types are generated (`next typegen` / build). This comes from the environment, and none of these errors is in the changed tests.

## Sources

- Issue #471 (`issue.md`) and its triage notes.
- `apps/web/src/ui/copy/chat.ts:36-57`, `site.ts:24-27`, `problems.ts:4-10`, `projects.ts:5-22`.
- `apps/web/src/components/site-header.tsx:21-33`, `apps/web/src/app/page.tsx:14-17`, `apps/web/src/app/error.tsx:42`, `apps/web/src/app/not-found.tsx:16`, `apps/web/src/app/(workspace)/projects/(list)/layout.tsx:17-23`, `apps/web/src/app/(workspace)/chat/page.tsx:25`, `apps/web/src/app/(workspace)/chat/layout.tsx:11`.
- `apps/web/playwright.config.ts:80-100` and `apps/web/package.json:14-21`.
- Wiki: Coding-Practices-Digest, Decisions-Product (`central-chat`), Decisions-Site-and-UI (`header-links-slot`), Issue-Pipeline.

<!-- end of spec -->
