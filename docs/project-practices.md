# Project practices

These are the repository's design, type, lint, test and secrets rules. They apply to every app and tool. Rules that name the site describe `apps/web/`, and their paths are relative to it unless they name a root file.

The repo is a monorepo: npm workspaces under `apps/`, with one `package-lock.json` at the root, and mise tasks in each app's `mise.toml`.

## Product

- **The AI provider stays swappable** through the Vercel AI SDK.

## Design

Follow John Ousterhout's *A Philosophy of Software Design*:

- **Deep modules:** small, simple interfaces over substantial functionality. No pass-through methods, no thin wrappers that only rename, no classes that exist only to hold one call.
- **Information hiding:** each design decision lives in exactly one module, for example a storage layout, a wire format or an error classification. Callers don't know the schema, the provider or the format. In the site, these include the model choice, prompt assembly, the storage layout, error classification and the manual's URL scheme. Callers don't know the prompt text. A route or page is a thin adapter over a domain module.
- **Pull complexity downward:** a module handles its hard cases itself rather than pushing them to callers through options or extra steps.
- **Define errors out of existence:** prefer interfaces with no error case. An unknown or malformed id is "not found" (`undefined`), not an exception; deletes are idempotent. Re-indexes are idempotent too. Errors that remain go through `src/errors/app-error.ts`.
- **Different layer, different abstraction:** layers each speak their own vocabulary; in the site, UI, domain and storage. Avoid temporal decomposition, which splits code by the order things happen rather than by the knowledge they hide.
- **Somewhat general-purpose:** interfaces fit today's needs without baking in one caller's special case.
- **Comments:** interface comments say what a module does and promises, not how. Implementation comments explain only what the code can't. Names are precise and consistent across the codebase.
- **Strategic, not tactical:** leave the code a little better designed than you found it.
- **A change is complete:** it updates the tests and docs it affects. Build on useful existing work instead of restarting.

## Types

- No `any`, no non-null `!`, and no `as` casts except at one validated boundary.
- Parse external data at the boundary with zod and use the parsed types inside it. In the site that means request bodies, form data, env vars, JSON columns and model tool inputs.
- Domain ids get their own types where they could be mixed up, such as `ProjectId` and `ChatId`.

## Lint

- **No dodges:** satisfy a rule through better design, never through tricks that slip past it, such as computed keys, bracket reads or `process.getBuiltinModule`. Never weaken a test, check, lint rule or type to get a pass.
- **The one `biome-ignore`** is on drizzle's `primaryKey` import, where the rule can't tell a current overload from a deprecated one.

### Patterns the rules force

- Regexes are top-level, named and use the `u` flag.
- Parameter and return types are explicit; interfaces use property-style signatures; exports come last in a file; keys from an index signature are read by destructuring.
- No ternaries: a conditional class uses `if`. No `void` on promises. An optional boolean prop is tested with `=== true`.
- `noSecrets` flags long camelCase identifiers in strings, so a `describe` names the behaviour or command, not a long function name.
- Radix imports are named (`import { DropdownMenu } from "radix-ui"`). Handlers passed as props are module-level functions.
- Read env vars only through `src/env.ts`, adding a new accessor for a new variable. Log only through `src/errors/error-log.ts`.
- Code that imports `Suspense` fails lint; use Next's segment conventions instead.

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

- **Every query on user data** builds its `where` from the predicates in `src/accounts/owner-scope.ts`. Store functions take `owner: UserId` first, and a foreign id reads as not found. Real-database tests exercise owner isolation. New exports need owner-scoped queries and real-dependency coverage.
- **Schema changes go only through migrations.** Change the tables in `src/db/tables/`, then `npm run db:generate`. Never edit `drizzle/meta/` by hand; on a merge conflict in it, regenerate.
- **The release workflow migrates production while the old build is live** (`.github/workflows/release.yml`): it builds the new deployment, migrates, and only then makes the new build live, so the old build runs on the new schema for a few minutes. A Vercel rollback (`vercel rollback`, or the dashboard) restores old code but never reverts the schema. **A migration must work with the build that is live:** add tables and nullable or defaulted columns first; drop or rename something, or make it `NOT NULL`, only in a later release, once the live build no longer reads or writes the old form. Releases are manual, so two merges can go out in one release: don't merge the second step into `integration` until the first is live in production. Say in the PR which kind each migration is.

## Prompts and the AI SDK

- Prompt and buddy texts say "the user" and "their", never "she" or "her".
- AI SDK 7: `streamText`'s `response` covers the last step only, so a follow-up call reads `result.responseMessages`. Text parts have no ids: group consecutive text parts, and key other parts by their own ids, such as `toolCallId`.

## Tests

- **A flake is a failure** (`flakes-are-failures`). Fix the cause or the measurement; never rerun until it passes. A passing repeat adds no evidence, and no test may depend on timing.
- **Fix a known flake first, on its own,** before other work that would trip on it. A flake left open costs a run in every branch that meets it.
- **Test a feature or reproduce a bug, not an implementation.** A test checks behaviour that a user or caller relies on, or reproduces a bug that was fixed. It doesn't pin private helpers, call order, internal state or wording that nothing relies on.
- **No tautological tests.** A test that can't fail while the code is wrong proves nothing: one that checks a mock returns what it was given, compares a value with itself, or re-proves the language or framework. Delete it, or rewrite it to check an outcome.
- **Tests don't need frequent maintenance.** A refactor that keeps behaviour breaks no test. A test that breaks on most changes to its subject is testing the implementation; rewrite it against the outcome.
- **No timed waits; mock time.** A test never sleeps or polls on a timer for something to happen. It awaits the event itself, such as a promise, a process exit, a file change or a FIFO. Code that waits or reads the clock takes its clock or delay as a parameter, so tests pass a fake one. A subprocess, which fake timers can't reach, gets short durations through its configuration. A deadline may only fail a test, never pace it.
- **Fake services are long-lived servers.** A fake external service, such as GitHub, runs as one server per test machine, and the program reaches it the way it reaches the real one. Don't start a process for each call.
- **Tests clean up.** A test stops every process it starts and puts a deadline on every wait.
- **Reuse the test kits.** Before writing a helper, fixture or fake, look in `test/` for one, and extend it rather than writing a copy.

In the site:

- **Fast default checks**: `npm run check` runs lint/format/import checks, types, deterministic shell safety checks and filesystem/repository guards, including use-case coverage, plus the six cheap in-process Vite guards (1.62 seconds together in the retained focused run, no browser binaries or database). `npm test` and `test:watch` select both Node projects, `repository` and `vite-integration`. `test:vite` selects only those six default guards; browser projects use explicit `test:browser`; `test:integration` selects guards plus all Vite/browser projects. Server, e2e, visual and build/font checks remain explicit opt-ins. A fast pass proves none of those unrun stages. Keep failures visible, with no skip/todo, guard exemption, timeout/concurrency change or assertion weakening. Optimize costly tasks separately or schedule an authorized integration stage; operator-wrapper adoption is separate. See the [stage costs and prerequisites](../README.md#tests).
- **Use cases drive tests**. Playwright e2e tests cover only visual regressions (`e2e/visual/`) and the auth workflows: sign-up, sign-in, sign-out, the sign-in limits, and the signed-out access gate. Every other use case gets a Vitest test. A case that needs a real server or database gets a server test against the test database in `.env.test`, which calls the Server Action, route handler or store with real users and sessions. A server test is `test/**/*.server.test.ts`, run in Node by `npm run test:server` (and first by `npm run test:e2e`, never by `npm test`); it makes its users, data and sessions with the kit in `test/test-database/`, which deletes them after the test. A case that needs only the UI gets a browser integration or feature-entrypoint test. Browser-mode component integrations exercise UI behavior through the real browser, without requiring a whole application flow. Browser tests are `test/**/*.browser.test.tsx`, run explicitly by `npm run test:browser` in headless Chromium and WebKit; one that needs the browser's time zone is `*.zoned.browser.test.tsx`, run in each zone of `ZONES` by its own `browser-<zone>` project, and one that needs a touch screen is `*.touch.browser.test.tsx`, run with touch by the `browser-touch` project (`vitest.config.mts`).
- **The mock tutor:** e2e tests run against a non-production database with `TUTOR_MODEL=mock`, never against real Claude. Its commands (`/mock-tool`, `/mock-search`, `/mock-error` and the rest) are listed in `MOCK_COMMANDS` in `src/tutor/mock-script.ts`, each with its usage line.
- **The test database:** The orchestrator provides `.env.test` with its local database and `E2E_PORT` pinned to the checkout's lane. Test commands consume it without allocating names or ports or tearing down lane resources. For manual work, `npm run test-env:init` writes it with the worktree's own database and site port, or copy `.env.test.example` by hand and configure them. `test:server` resets and migrates that database; `test:e2e` runs server tests followed by Playwright only on success. Guards require localhost or 127.0.0.1, a safe database name, the mock tutor and file outbox. Keep one full web suite scheduled at a time until this change is accepted and operator setup is separately compatible. See [the local test-environment contract](#the-orchestrator-owns-the-environment) below.
- **Visual and phone checks:** see "Visual tests" in the README. An intended visual change commits its new baselines in the same commit. A new page gets a visual spec and an entry in `PHONE_PAGES` (`test/app/phone-pages-test-kit.tsx`). A new theme gets an entry in `LONG_NAME_LENGTHS` (`test/themes/signed-in-pages.browser.test.tsx`).
- **Visual rasterization:** Chromium visual projects disable partial rasterization so clipped repaints do not change rounded-corner colours. Keep the byte-exact repaint regression in `e2e/visual/project.spec.ts`; do not replace it with a pixel allowance. WebKit and the auth project keep their normal settings. See the [#506 diagnosis and baseline evidence](visual-evidence/issue-506/README.md).
- **Visual baseline review:** every PR that changes baselines gets an independent agent review of the old, new and diff images side by side. Send any flagged images to Autumn. Visual baseline checks stay in the e2e gate.
- **Check what the user sees, not class names.** UI tests find elements by role, label or text and check what is shown or done, never a CSS class name such as `card` or `error-box`. Screenshot tests cover the styling.
- **E2e helpers:** every test gets its own `account` and `testData` from `e2e/fixtures.ts`, deleted after the test; the fixtures make them with the server tests' kit in `test/test-database/`. Next's route announcer also has `role="alert"`, so find an alert inside its container (`alertIn` in `page-helpers.ts`) or by its text, never by `getByRole("alert")` alone.
- **Typing right after a goto:** WebKit hydrates a page well after the load event `page.goto` waits for, and text typed before then misses the form's state. Fill a field right after a goto with `fillWhenReady` from `page-helpers.ts` (or `sendMessage` in `chat-page.ts` for the composer).

## Secrets and production

- Never print a `.env*` file. Never copy a secret into code, docs, logs, issues or commits.
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
  Reuse checks the repository-owned startup command as well as the image,
  connection, network and loopback publication. Old/default startup commands
  require replacement; inspection failure stops setup before replacing the proxy.
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

### Local proxy connection attempts

Both Compose's manual proxy and lane proxies use
`apps/web/scripts/test-env/start-neon-proxy.sh`. It passes
`--connect-compute-lock=permits=0` to the Neon binary. This disables the proxy's
connection-attempt admission limiter, whose default permits and short acquisition
timeout can reject test queries while concurrent lanes make connections slower.
Postgres still enforces its 300-connection limit. No failed request is retried by
this change, and production and preview configuration stay unchanged.

Before provisioning, `setup.sh` and `npm run test-db:up` run
`check-neon-proxy.sh` against the pinned image. The check starts the real binary
with the same option and requires its parsed connection-lock configuration to
report an initial limit of zero in the recognized limiter field, not elsewhere
in the log event. It sends no database queries and removes its container on exit.
It also requires Compose and lane image pins to match.
An unsupported option, a nonzero limit or an unrecognized startup log fails
provisioning. When updating the proxy image, keep this check;
if its startup log format changes, verify the new binary's disabled-limiter
semantics before updating the check. Run the check alone from `apps/web` with
`bash scripts/test-env/check-neon-proxy.sh`.

The startup command retains the image's endpoint-table initialization, TLS,
WebSocket listener and Caddy HTTP frontend. Lane proxies inline the script so a
reused container does not depend on an earlier checkout's files. Compose mounts
the same script as a config file.

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

For a manual run, `npm run test-env:init` in `apps/web` writes
`apps/web/.env.test` from the example with a database (`pb_wt_<key>`) and site
port (30000-39999) derived from the worktree's path, so each worktree has its
own; it keeps an existing `.env.test` and touches no containers or databases.
Or copy the example **by hand** and configure a local test database and unused
site port. From
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
npm run test:e2e -- --workers 4              # forward options to Playwright only
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

`npm run check`, filesystem guards and browser tests need no database. `npm run test:scripts`
includes `scripts/test-env/test-env.test.sh`, which tests the proxy-setting guard
and puts `fake-docker.sh` on PATH as Docker in disposable fixture checkouts.
These tests never use real Docker/databases and observe publication at the rename
boundary rather than racing a reader.
