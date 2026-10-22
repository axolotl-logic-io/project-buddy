# Project practices

These are this repository's own rules. They add to the shared [coding practices](coding-practices.md), which every repository keeps an identical copy of.

The repo is a monorepo (`monorepo-layout`): npm workspaces under `apps/`, with one `package-lock.json` at the root, and mise tasks in each app's `mise.toml`.

The shared coding practices apply to every app. The sections below describe the site. Paths in those sections are relative to `apps/web/`, the site's folder, unless they name a root file.

## Product

- **The AI provider stays swappable** through the Vercel AI SDK.

## Design

- **Information hiding:** the site's design decisions include the model choice, prompt assembly, the storage layout, error classification and the manual's URL scheme, each in exactly one module. Callers don't know the prompt text. A route or page is a thin adapter over a domain module.
- **Define errors out of existence:** re-indexes are idempotent, like deletes. Errors that remain go through `src/errors/app-error.ts`.
- **Different layer, different abstraction:** UI, domain and storage each speak their own vocabulary.

## Types

- Parse external data at the boundary with zod: request bodies, form data, env vars, JSON columns and model tool inputs.
- Domain ids that could be mixed up, such as `ProjectId` and `ChatId`, get their own types.

## Lint

- **Don't turn rules off.** Fix the code, even if that means redesigning the UI.
- **The one `biome-ignore`** is on drizzle's `primaryKey` import, where the rule can't tell a current overload from a deprecated one (`biome-overload-false-positive`).

### Patterns the rules force

- No ternaries: a conditional class uses `if`. An optional boolean prop is tested with `=== true`.
- Radix imports are named (`import { DropdownMenu } from "radix-ui"`). Handlers passed as props are module-level functions.
- Read env vars only through `src/env.ts`, adding a new accessor for a new variable. Log only through `src/errors/error-log.ts`.
- Code that imports `Suspense` fails lint; use Next's segment conventions instead (`suspense-via-segment-conventions`).

## UI

- **Copy** lives in `src/ui/copy/`, one module per area, one `<SECTION>_COPY` export per section. Importers import the area module directly. Page titles go through `pageTitle` in `site.ts`.
- **Theme tokens:** every colour, font, radius, shadow, border width, page decoration and spacing step is a semantic token utility from `src/themes/contract.css` (`bg-surface`, `text-muted`, `rounded-control`, `shadow-raised`, `font-heading`, the heading roles such as `text-page-heading`). Tailwind's own colour, radius, shadow and font scales are cleared, so `bg-red-500` doesn't compile. Components never use `dark:`, palette or hex colours, a theme name or the theme attributes.
  - Streamdown's own class names are mapped in one block of `src/components/chat/chat.css`, for the Markdown only; `streamdown-names.test.ts` fails if another file writes one.
  - Icons use `<Icon name=…>` and the `.icon` and `.icon-line` roles. Focus rings read `--focus-outline` and `--focus-offset`.
  - Touch targets don't follow the theme's spacing: set a target's height through `--target-size` (44 px, in `page-roles.css`), never with a spacing utility such as `min-h-11`.
- **CSS:** every import and rule is in a cascade layer; roles are plain classes in `page-roles.css` and `chat.css`. No `light-dark()`, `::selection` or `accent-color`. Every `var(--x)` is declared. The last layer is `extras`, which hides switched-off extras.
- **Adding a theme** touches only `src/themes/`, plus its visual baselines; follow "ADDING A THEME" in `src/themes/themes.ts`. `contract.test.ts` checks it defines the whole contract and `contrast.test.ts` checks WCAG AA.
- **Adding an extra:** follow "ADDING AN EXTRA" in `src/flags/flags.ts`. Each extra is tagged with `{...extraTag(id)}` and has an entry in `EXTRA_SCENES` (`test/flags/hide-extras.browser.test.tsx`).
- **Accessibility and phones:** WCAG AA in every theme. No sideways scroll at 320 px; targets at least 24 px, and 44 px where possible; the composer stays above the keyboard; no hover-only controls.
- **Server Components:** pages and layouts stay Server Components.
- **Tool parts:** every `TOOL_PARTS` entry names its `placement` (`"inline"` or `"under"`), and an inline entry names `textBefore` (`"working-note"` for a lookup, `"prose"` otherwise). Code reads `placementOf(part)`, never a tool name.

## Data

- **Every query on user data** builds its `where` from the predicates in `src/accounts/owner-scope.ts`. Store functions take `owner: UserId` first, and a foreign id reads as not found. `test/accounts/owner-scope-coverage.test.ts` checks every export of the modules that touch user data, so a new export fails until it is called there with its queries checked, or allowed without an owner, with the reason.
- **Schema changes go only through migrations.** Change the tables in `src/db/tables/`, then `npm run db:generate`. Never edit `drizzle/meta/` by hand; on a merge conflict in it, regenerate.
- **The release workflow migrates production while the old build is live** (`.github/workflows/release.yml`): it builds the new deployment, migrates, and only then makes the new build live, so the old build runs on the new schema for a few minutes. A Vercel rollback (`vercel rollback`, or the dashboard) restores old code but never reverts the schema. **A migration must work with the build that is live:** add tables and nullable or defaulted columns first; drop or rename something, or make it `NOT NULL`, only in a later release, once the live build no longer reads or writes the old form. Releases are manual, so two merges can go out in one release: don't merge the second step into `integration` until the first is live in production. Say in the PR which kind each migration is.

## Prompts and the AI SDK

- Prompt and buddy texts say "the user" and "their", never "she" or "her".
- AI SDK 7: `streamText`'s `response` covers the last step only, so a follow-up call reads `result.responseMessages`. Text parts have no ids: group consecutive text parts, and key other parts by their own ids, such as `toolCallId`.

## Tests

- **Use cases drive tests** (`use-cases-drive-tests`). Playwright e2e tests cover only visual regressions (`e2e/visual/`) and the auth workflows: sign-up, sign-in, sign-out, the sign-in limits, and the signed-out access gate (`e2e-visual-and-auth-only`). Every other use case gets a Vitest test. A case that needs a real server or database gets a server test against the test database in `.env.test`, which calls the Server Action, route handler or store with real users and sessions. A server test is `test/**/*.server.test.ts`, run in Node by `npm run test:server` (and first by `npm run test:e2e`, never by `npm test`); it makes its users, data and sessions with the kit in `test/test-database/`, which deletes them after the test. A case that needs only the UI gets a component or browser test. Component tests are `test/**/*.test.tsx` under jsdom; browser tests are `test/**/*.browser.test.tsx`, run by `npm test` in headless Chromium and WebKit; one that needs the browser's time zone is `*.zoned.browser.test.tsx`, run in each zone of `ZONES` by its own `browser-<zone>` project, and one that needs a touch screen is `*.touch.browser.test.tsx`, run with touch by the `browser-touch` project (`vitest.config.mts`).
- **The mock tutor:** e2e tests run against a non-production database with `TUTOR_MODEL=mock`, never against real Claude. Its commands (`/mock-tool`, `/mock-search`, `/mock-error` and the rest) are listed in `MOCK_COMMANDS` in `src/tutor/mock-script.ts`, each with its usage line.
- **The test database:** The orchestrator provides `.env.test` with its local database and `E2E_PORT` pinned to the checkout's lane. Test commands consume it without allocating names or ports or tearing down lane resources. For manual work, copy `.env.test.example` by hand and configure a distinct local database and site port. `test:server` resets and migrates that database; `test:e2e` runs server tests followed by Playwright only on success. Guards require localhost or 127.0.0.1, a safe database name, the mock tutor and file outbox. Keep one full web suite scheduled at a time until this change is accepted and operator setup is separately compatible. See [the local test-environment contract](#the-orchestrator-owns-the-environment) below.
- **Visual and phone checks:** see "Visual tests" in the README. An intended visual change commits its new baselines in the same commit. A new page gets a visual spec and an entry in `PHONE_PAGES` (`test/app/phone-pages-test-kit.tsx`). A new theme gets an entry in `LONG_NAME_LENGTHS` (`test/themes/signed-in-pages.browser.test.tsx`).
- **Visual baseline review:** every PR that changes baselines gets an independent agent review of the old, new and diff images side by side. Send any flagged images to Autumn. Visual baseline checks stay in the e2e gate.
- **Check what the user sees, not class names.** UI tests find elements by role, label or text and check what is shown or done, never a CSS class name such as `card` or `error-box`. Screenshot tests cover the styling.
- **E2e helpers:** every test gets its own `account` and `testData` from `e2e/fixtures.ts`, deleted after the test; the fixtures make them with the server tests' kit in `test/test-database/`. Next's route announcer also has `role="alert"`, so find an alert inside its container (`alertIn` in `page-helpers.ts`) or by its text, never by `getByRole("alert")` alone.
- **Typing right after a goto:** WebKit hydrates a page well after the load event `page.goto` waits for, and text typed before then misses the form's state. Fill a field right after a goto with `fillWhenReady` from `page-helpers.ts` (or `sendMessage` in `chat-page.ts` for the composer).

## Secrets and production

- **Secrets** live in `.env` and `.env.local` (both ignored by git), in Vercel, and in the repo's Actions secrets for the release workflow.
- **One Neon database** serves Production, Preview and Development. Never write test data to it. A production smoke test labels its data "(delete me)" and deletes it afterwards.
- **PRs target `integration`; deploys are manual.** A merge into `integration` deploys only a preview, which `.github/workflows/integration.yml` smoke-tests. Production gets nothing on merge or push. To release, run `scripts/deploy.sh`: it fast-forwards `main` to a tested `integration` commit and opens a deploy ticket, an issue labelled `deploy`. Never push to `main` by hand. Deploys run from a clean checkout and never with `--force`. Don't make Claude unavailable on purpose in a smoke test.

## The orchestrator owns the environment

The orchestrator provides `apps/web/.env.test` with `DATABASE_URL` and `E2E_PORT`
pinned to the checkout's assigned lane. Test commands **only consume** that
file. They never create/copy/rewrite it, choose a database name or port, or drop
the lane database/proxy at invocation exit. A missing file is an actionable
error, not permission to copy the example or fall back to other settings.

The repository supplies these Bash scripts, runnable from any working directory:

- `apps/web/scripts/test-env/setup.sh`: with `ISSUE_PIPELINE_LANE_SLOT=K`, validates
  a whole number from 1 to 399 before provisioning. It starts the shared server
  from `compose.test-db.yml`, reuses a correctly configured running proxy or
  replaces a mismatched one, and creates the lane database only if missing.
  Reuse checks the pinned image's default entrypoint and command as well as the
  image, connection, network and loopback publication; inspection failure stops
  setup before replacing the proxy.
  It atomically publishes `.env.test` from the committed example, preserving
  other test settings. A destination symlink is replaced, never written through.
  With the slot unset/empty, it touches no containers, databases or `.env.test`.
- `apps/web/scripts/test-env/lanes.sh`: the shared container/network names and
  canonical lane naming/port rules. Lane K has proxy `pb-lane-K-neon-proxy`,
  database `pb_lane_K`, loopback proxy endpoint `127.0.0.1:(24000+K)` and site
  port `20000+10K`.
- `apps/web/scripts/test-env/prune.sh`: explicit maintenance with
  `ISSUE_PIPELINE_LANE_SLOTS=N`, a nonnegative whole count. Zero explicitly
  authorizes pruning all identifiable lanes; an absent/invalid count never
  implies zero. Complete shared-server/database inventory and container listing
  must succeed before any deletion. Only exact canonical lane resources above N
  are eligible. Similar names, `pb-issue-*-neon-proxy`, `pb_issue_*`,
  `project_buddy_e2e`, `project-buddy-test-db-*`, and unrelated resources are kept.
  The shared server and infrastructure are never pruned.

Lane resources are reusable, not fresh per invocation. Setup preserves existing
lane data, while `test:server` deliberately resets/migrates its supplied database.
The orchestrator must assign distinct lanes to independent simultaneous runs.
Two runs sharing a lane, a manual configuration, or one checkout's build artifacts
are not promised automatic isolation. Do not stop the shared server while other
checkouts need it.

**Merging these scripts does not configure or install the pipeline's lane-slot
setup.** Operator-authorized changes to laneSlots and setup/prune/teardown wiring
remain separate, as does any removal of retained issue resources. Keep the
one-full-web-suite scheduling restriction until this change is accepted and
operator setup is separately compatible. This change does not alter CI,
production or preview databases, and is not a release or deployment.

## Manual runs and focused e2e tests

For a manual run, copy `apps/web/.env.test.example` to `apps/web/.env.test` **by
hand**, then configure a local test database and unused site port. From
`apps/web`, run `npm run test-db:up` to start the shared local server and
`npm run test-db:reset` to create/migrate the configured database. No lane slot
is needed for a manually supplied file. Use different manual database names and
ports for simultaneous runs. The example uses `project_buddy_e2e` and port 3100.

Commands run from `apps/web`:

```sh
npm run test:server                         # reset/migrate, then Vitest server tests
npm run test:playwright -- <file>           # only that e2e file, no server tests
npm run test:playwright -- e2e/sign-in.spec.ts
npm run test:e2e                            # test:server, then test:playwright
npm run test:visual                         # server tests, then visual projects
npm run test:visual:update                  # same, updating screenshot baselines
npm run test:scripts                        # fake Docker; no database or .env.test needed
```

`test:playwright` requires an already migrated database. `test:e2e` runs
`test:playwright` only after `test:server` succeeds, with both using the same
supplied database/port. Playwright builds/starts its own site server on that
configured port; it neither reuses an existing server nor silently chooses a
replacement port. A missing/blank `E2E_PORT` is an error, not a default-port
fallback. Ordinary Node environment overrides remain supported; keep them
consistent with the supplied file. The [local safety guard](../apps/web/scripts/test-db/test-database.ts)
rejects remote hosts, unsafe/reserved database names, a non-mock tutor and a
non-file email outbox before database changes or test execution. URL-encode spaces
and backslashes in connection-string credentials: raw forms are refused because
the driver's URL parser can interpret them differently. Accepting `pb_lane_K`
names does not grant access to production, preview or the server's own databases.

`npm run check` and unit/browser tests need no database. `npm run test:scripts`
includes `scripts/test-env/test-env.test.sh`, which puts `fake-docker.sh` on PATH
as Docker and uses disposable fixture checkouts. These tests never use real
Docker/databases and observe publication at the rename boundary rather than
racing a reader. A flake is a failure: diagnose/fix failures, never retry until
green. Intended screenshot changes require inspecting and committing baselines.
