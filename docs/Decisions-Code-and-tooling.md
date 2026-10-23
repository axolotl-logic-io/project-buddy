# Decisions: Code and tooling

Part of [Decisions](Decisions.md). Each decision has a name, which issues and code comments use to refer to it.

## `real-dependency-tests`

Autumn decided on 2026-10-22 (#508; ecosystem #164) that these repositories have no unit tests. A unit test imports a module and calls it directly without a real dependency. Do not write them. Tests exercise behavior through a real dependency or the whole system: actual filesystem artifacts, the isolated database, a browser or a subprocess. Browser-mode component integrations and feature-entrypoint tests are valid without a whole application flow. Loading a module from disk does not by itself make a test filesystem-backed. Pure validators with fake inputs and fully mocked dependencies remain unit tests.

Autumn also approved deleting the site's 70 jsdom rendered-UI test files. Retain actual filesystem guards, server/database tests, browser integrations, Playwright visual/auth tests, shell-script tests and the instruction-counter's subprocess tests. Direct-call tests of script modules do not qualify as the shell/subprocess suite. No replacement tests are authorized by this decision alone. Production behavior is unchanged.

Rejected: “Logic gets a unit test” (the former lowest-level rule), simulated DOM tests, and an e2e-only requirement. The shared [coding practices](coding-practices.md) carry the exact replacement wording. Cross-repository adoption is pending ecosystem #164's matching delivery. The [#508 coverage-loss record](test-policy/issue-508.md) lists deleted behavior checks, retained guards, known gaps and validation evidence. Historical evidence below and in visual-evidence remains intact.

## `fast-default-checks`

Autumn decided on 2026-10-22 to turn time-consuming checks/tests off by default and document how to optimize them or isolate them to a stage. This supersedes unconditional full-suite default gates, not cheap guards or truthful validation evidence. `npm run check` retains Biome, types, deterministic shell safety checks and Node filesystem/repository guards, including the use-case coverage guard, plus all six in-process Vite guards. The retained focused Vite run took 1.62 seconds together, with no browser-binary or database prerequisite, so these cheap guards stay in the default. `npm test` and `test:watch` select both `repository` and `vite-integration`. The instruction counter's short fake-pi subprocess suite remains a cheap default check, with no real-model calls.

Keep `test:vite` as a focused subset of the default. Costly real-dependency coverage remains available as named opt-ins: `test:browser` for Chromium/WebKit including zones and touch; `test:integration` for the broad guards/Vite/browser suite; and the unchanged `test:server`, `test:e2e` and `test:visual` stages. Bare `vitest run` remains the broad Vitest selection, not the default npm task. `.mts` discovery and type coverage remain. No test assertions, timeouts, concurrency, environment isolation or mock-model fences change.

A fast gate does not validate unrun browser/server/e2e, build/font or visual behavior. The known missing `use_case_view_buddies` and `use_case_see_manual_credit` coverage still fails the cheap default guard; adding replacement cases needs separate owner approval. Preserve failed-run evidence. Review timing from retained logs to optimize expensive stages, or schedule them explicitly; source delivery does not install an operator wrapper or authorize those stages. See [costs and prerequisites](../README.md#tests).

Rejected: silently running full browser/server/e2e gates by default, deleting genuine coverage to save time, marking unrun work passed, or hiding missing-use-case failures through exclusions, metadata changes or guard exemptions.

## `test-code-in-test`

Code that only tests use lives with the tests, not in `src/` (Axlog, 2026-10-18, #474): "If it's not used outside the tests, it should be among them." The intent is to put each file with its use and its purpose. `src/` holds only what the app runs. Each app keeps its tests and their helpers in `test/`, each in the folder its subject has under `src/`; the site's server-test kit is `test/test-database/`. `test/src-holds-no-tests.test.ts` fails on a test file or a `fake-*`, `*-fixtures` or `*-test-kit` helper under `src/`. Tests that read source files with `import.meta.glob` use Vite's `base` option to read `src/`, so their keys stay relative to the subject's folder.

It replaces the rule that unit-test helpers sit beside the code they fake, which recorded no reason.

## `agents-md-holds-the-rules`

The repo's coding, test and production rules live in the shared [coding practices](coding-practices.md) and this repo's [project practices](project-practices.md), which the short root `AGENTS.md` links; there is no `CONTRIBUTING.md` or `CLAUDE.md` (Axlog, 2026-10-18). When the rules were gathered into `AGENTS.md`, Axlog removed these: the scope paragraph and `practices-cover-all-code`; the config-wins note (`biome-config-authoritative`); the Product rules except the swappable AI provider; design-it-twice and the review red flags; the strictest-TypeScript, `import type`, exhaustive-switch, `satisfies` and `as const` rules; Biome's `all` preset (`biome-infos-fail`); scoped overrides (`best-practice-over-lint`); the 300-line file and 50-line function limits; imports naming the file extension; test-first with `npm audit`; the slug-title, `AUTH_CASES` and `PENDING_CASES` rules; and the rule against connecting to the production database. The lint config is unchanged, so whatever Biome enforces still fails the check.

## `plan-retired`

Axlog retired the staged working plan on 2026-10-12 in favour of GitHub issues and the repo's docs. This replaced `delegated-staged-build`.

## `practices-cover-all-code`

Retired from `AGENTS.md` by Axlog on 2026-10-18 ([`agents-md-holds-the-rules`](#agents-md-holds-the-rules)). This was the blanket rule that coding practices cover every part of the software ecosystem. Read the current scope and requirements in the [coding practices](coding-practices.md) and [project practices](project-practices.md); don't restore the retired rule.

## `aposd-and-strict-typing`

Use Ousterhout's *A Philosophy of Software Design* and the project's current typing and lint requirements in the [coding practices](coding-practices.md) and [project practices](project-practices.md) (Axlog, 2026-10-10). Axlog removed the requirement to choose the strictest available TypeScript settings on 2026-10-18 ([`agents-md-holds-the-rules`](#agents-md-holds-the-rules)); `tsconfig.json` is unchanged.

## `biome-for-lint-and-format`

Biome lints and formats instead of ESLint and Prettier, because `eslint-config-next` pulled in `braces@3.0.3` (GHSA-vfj7-8cjw-p6xm), which had no patched release.

## `biome-infos-fail`

Every Biome group is set to `error`, so info diagnostics also fail `npm run check`. Axlog removed the `all` preset requirement from `AGENTS.md` on 2026-10-18, but the config is unchanged ([`agents-md-holds-the-rules`](#agents-md-holds-the-rules)). Axlog ruled (2026-10-10) that no rule is turned off, the UI may be redesigned to satisfy the rules, and tests get no looser rules. Rules for other frameworks stay off.

## `biome-config-authoritative`

Axlog removed the rule that lint configuration wins over documentation from `AGENTS.md` on 2026-10-18 ([`agents-md-holds-the-rules`](#agents-md-holds-the-rules)). The root and app Biome configs still define what lint enforces; the former rule against reporting differences as drift is no longer contribution guidance.

## `biome-drizzle-meta-exclusion`

`drizzle/meta/` stays excluded from Biome, because drizzle-kit rewrites it on every generate (Axlog, 2026-10-10).

## `best-practice-over-lint`

Satisfy lint through better design, never through a dodge (Axlog, 2026-10-10). Do not use computed keys, bracket reads or `process.getBuiltinModule` to evade a rule. A Biome bug with no supported fix goes back to Axlog. The one documented import suppression is [`biome-overload-false-positive`](#biome-overload-false-positive).

Axlog removed the scoped-overrides and `as const` requirements from `AGENTS.md` on 2026-10-18 ([`agents-md-holds-the-rules`](#agents-md-holds-the-rules)). Existing platform, framework and external-field overrides remain in the Biome configs, which hold their exact file lists. The no-dodges rule remains contribution guidance.

## `biome-css-class-rules`

Biome's `noUndeclaredClasses` and `noUnusedClasses` follow imports, and pages escape both because nothing imports them. Roles are plain classes in layered CSS files (`page-roles.css`, `chat.css`). Axlog approved (2026-10-11) a scoped override of both rules on the root layout, the site frame it imports (header, footer, theme picker) and the global CSS files, so the layout can use Tailwind utilities.

## `use-cases-drive-tests`

`use-cases/` holds one file per area, with conventions in its `README.md`. Each case has a test or group titled exactly its slug, in Vitest or Playwright as [`e2e-visual-and-auth-only`](#e2e-visual-and-auth-only) decides. Until implemented it may instead be pending in `e2e/pending-cases.ts`, never both. Version 1 is not done until every case has a passing test.

`use-cases/use-cases.test.ts` checks coverage, slug titles and links. It reads Vitest's `test`, `it` and `describe` titles in test files; other tests may keep plain titles, and ordinary text may name any slug. Every e2e test outside `e2e/visual/` belongs under an auth-case slug from `use-cases/auth-cases.ts`. Tests use the mock model and a non-production database; only smoke tests use real Claude.

Vitest test placement:
- Browser-mode component integrations and feature-entrypoint tests use `test/**/*.browser.test.tsx`, run explicitly by `npm run test:browser` in Chromium and WebKit. Filesystem guards run by default in the Node `repository` project; the six cheap in-process Vite plugin guards run in the `vite-integration` project, also selected by default. The former jsdom component suite was removed by `real-dependency-tests`.
- Server tests use `test/**/*.server.test.ts`, run in Node against the test database by `npm run test:server` and first by `npm run test:e2e`, never by `npm test`.
- Time-zone tests use `*.zoned.browser.test.tsx`. Each zone in `ZONES` has its own `browser-<zone>` project and browser contexts with that zone and locale. The plain browser project excludes them.
- Touch tests use `*.touch.browser.test.tsx`, run by `browser-touch` with `hasTouch`; the plain browser project excludes them. `isMobile` stays off because it would scale Vitest's runner iframe, not the tested page. The phone checks cover `PHONE_PAGES` in `test/app/phone-pages-test-kit.tsx`.
- Layout measurements call `installThemeFonts()` once and await `loadFonts()` before measuring, from `test/themes/theme-fonts-test-kit.ts`. Screen sizes and `MINIMUM_TARGET_PX` live in `test/viewports-test-kit.ts`.

Rejected: keeping every use case in Playwright, which was too slow (#131, #341).

## `e2e-visual-and-auth-only`

Axlog, 2026-10-17: "e2e should only test for visual regressions and the auth workflows."

Playwright e2e tests cover only two things. The first is visual regressions: the screenshot tests in `e2e/visual/`. The second is the auth workflows: sign-up, sign-in, sign-out, the sign-in limits, and the signed-out access gate, where a signed-out visitor, or one whose session has lapsed, is sent to log in. Every use case still has a test titled by its slug (`use-cases-drive-tests`), wherever that test lives.

Every other case is tested in Vitest:
- A case that needs a real server or database gets a server test against the test database in `.env.test`. The test calls the Server Action, route handler or store with real users and sessions, not through a browser.
- A case that needs only the UI gets a browser-mode component integration or feature-entrypoint test (`*.browser.test.tsx`), not necessarily a whole application flow.
- Account isolation (`use_case_private_data`) becomes a server test with two users, so it stays covered.

Reason: the e2e suite is the slowest one. It runs twice in the flake gate on every pipeline verify (`e2e-test-database-speed`), and it has timed out under load. Most of its cases don't need a browser.

### Server-test design

These came with moving cases out of Playwright (#341, #342, #345–#347, #350, #351):

- **One server suite:** `vitest.server.config.mts` runs tests in Node. Its setup checks the test environment and mocks Next's request-bound APIs. `npm run test:server` resets the test database first; `npm run test:e2e` runs server tests before Playwright, and `npm test` never runs them. Rejected: adding a server project to the default Vitest config, which would require a filter on every `npm test`.
- **One shared kit:** `test/test-database/` provides users (`testUser`), their data through stores (`testData`), real sessions (`signIn`, `signOut`, `lapsed`), requests (`requestWithSession`), and navigation checks (`expectRedirect`, `expectNotFound`). The setup cleans up after each test. E2e fixtures use the same user and data kit. Rejected: a Vitest `test.extend` fixture object, which would make every server test import a kit-specific `test` instead of Vitest's.
- **Async work ends with the test:** the setup's mock of next/server uses `after-test-kit.ts`. It starts each `after()` task immediately and keeps it; `afterTasksDone()` waits for all tasks, including ones they start. A test awaits it before reading what a reply saved, and the setup awaits it before cleanup, so no task outlives its test.
- **One chat entry point:** `chat-test-kit.ts` sends messages through `POST /api/chat` as the signed-in user. `sendChatMessage` returns the status and whole body even on failure, after the `after()` tasks finish. `tutorReply`, `tutorPrompt`, `tutorEdits`, resend helpers and saved-reply readers build on it. The kit reads the owner from `currentUser()`; an owner argument would repeat the session.
- **Shared specialised helpers:** the same directory holds `spend-test-kit.ts`, `two-users-test-kit.ts`, `memory-form-test-kit.ts`, `storage-down-test-kit.ts` and `scratch-database-test-kit.ts`. Storage-down tests point `DATABASE_URL` at port 1 on the test database's host, restore the URL and reset the cached client afterwards, and use an unstored user so cleanup needs no database query during the outage. Memory-action tests mock next/cache's `refresh()`, which needs a Server Action scope.
- **Isolation through real users:** `test/accounts/private-data*.server.test.ts` checks layers with two users, real data and sessions. Another user's id must produce exactly the answer an unknown id produces. Pages run as async Server Components under `expectNotFound`; lists render through `renderToStaticMarkup`.
- **Whole-database tests own a database:** `scratchDatabase` gives each test a checked database configuration beside the test database, with a unique suffix. The test resets that database first and drops it afterwards. Full reindex and old-schema migration tests never need the shared database to themselves or last. Rejected: a whole-database project serialized after the other tests.
- **Visual effects need visual evidence:** the unpinned chat-header test compares element screenshots one screen down, pinned and unpinned. Rejected: `elementFromPoint` alone, which cannot see the header's fade because it has `pointer-events: none`.
- **The scope is enforced:** `use-cases/use-cases.test.ts` rejects non-auth slug titles outside `e2e/visual/` and rejects auth-list entries that aren't cases.

Rejected: the earlier rule that a case needing a real server, database or navigation stays in Playwright (#131), because that rule put most cases in the slowest suite.

## `e2e-test-database-speed`

The local test database uses one SCRAM iteration in `compose.test-db.yml` (orchestrator, 2026-10-12). The Neon proxy authenticates every HTTP query; this reduced the measured cost from about 76 ms to 8 ms per query. Production authentication is unchanged. Visual projects run in parallel, and chat screenshots use stored rows.

Local Playwright runs use 80% of the cores; CI keeps 50% (#20, 2026-10-13). On the measured 10-core machine, 8 workers gave the fastest full run (69–70 s, versus 80–81 s at half the cores and 73 s at 10).

Rejected: switching tests to the websocket `Pool`, which production does not use; dropping the second full run, which is the flake gate; and shortening mock delays or polling intervals, neither of which improved the full run's wall time.

## `flakes-are-failures`

A flake is a failure: fix its cause or the measurement, and never rerun until it passes (Axlog). A passing repeat adds no evidence, and a diagnosis gets two hours before it goes back to Axlog.

## `web-tests-under-load`

Wait for the event that marks async work done rather than for a clock when an event exists (orchestrator, #355). For example, warm the code highlighter through `loadCodeHighlighting` before measuring highlighted text, and await a stubbed reply's body before checking the rendered chat.

A remaining clocked wait covers only work with no completion event, such as a lazy code chunk and React commit. Give its timeout a top-level named constant and a comment recording what it covers, the worst measured time and the load used for that measurement. Set it to at least three times that worst time. A cold grammar import failed within the old 1000 ms colour poll in both browsers at 1-minute load averages of 43–83 on 10 cores.

Server tests set test and hook timeout `SERVER_TEST_TIMEOUT_MS` to 40 000 ms (#382). Database round trips, chat requests and cleanup exceeded Vitest's 5000 ms default under load. The worst measured test, including cleanup, took 12 742 ms at load averages of 38–50 on 10 cores, with other suites and one busy loop per core running. The timeout is three times that measurement, rounded up. The browser projects keep Vitest's defaults. The former unit project was removed by `real-dependency-tests`.

Rejected: raising unrelated timeouts or rerunning until green ([`flakes-are-failures`](#flakes-are-failures)).

## `browser-deps-prebundled`

The browser test projects (`browser`, `browser-<zone>` and `browser-touch`) pre-bundle a fixed list of dependencies with Vite's dependency discovery off (#375). The list is `PREBUNDLED_DEPS` in `apps/web/vitest.browser-deps.mts`, sorted, and holds only the app's own bare imports in the browser: the browser tests, `vitest.browser-setup.ts` and the `src/` code they load. Vitest and `@vitejs/plugin-react` add their own entries. The module's one export, the Vite plugin `prebundledBrowserDeps()`, sets `optimizeDeps.noDiscovery: true` and that `include`. In each browser server's client environment, it fails an import, from one of the app's own files, of a package that the resolved `optimizeDeps` lists neither include nor exclude. The error names the package, the importing file and the list's file, so a new bare import fails at once rather than being served unbundled. To add a dependency, add it to the list.

Cause: Vitest 5 gives each project its own Vite server and optimizer cache (`node_modules/.vite/vitest/<sha1 of the project's name>`), and a project's Chromium and WebKit instances share that one server. With discovery on, an import the startup scan missed made Vite optimize again mid-run. That changed the deps' browser hash, so Vite turned away the other instance's in-flight imports of the old version: #346's verify failed in Tokyo/Chromium with "Failed to fetch dynamically imported module" under load. next/cache had been added to `include` alone for the same reason.

Rejected: a pre-bundle step before the browser tests, which adds a command before every browser run and still leaves discovery on; and leaving discovery on with a longer `include`, which can't stop the next missed import from re-bundling mid-run. Out of scope: two runs at once in the same checkout, which share the optimizer cache dirs, and which Vite doesn't support (vitejs/vite#12603). A test file that fails to import with a SyntaxError is not this case (#386): see `served-syntax-check`.

## `served-syntax-check`

Browser test projects check that every JavaScript module Vite serves parses as an ES module (#386). The plugin `servedSyntaxCheck()` in `apps/web/vitest.browser-syntax.mts` logs the app-relative file, line, column, parser message and surrounding transformed code when parsing fails. It serves the module unchanged, so the test still fails normally.

The check sees the client environment's `transformRequest` result after every plugin and import analysis. A plugin's own `transform` hook is too early: Vitest rewrites dynamic imports afterwards.

Reason: browser test files intermittently failed to import with SyntaxErrors that named neither a module nor a position. The cause remains unproven; #386 records the investigation. Fixed dependency pre-bundling did not prevent these failures, so [`browser-deps-prebundled`](#browser-deps-prebundled) is a separate safeguard. If an import fails with a SyntaxError and the check logs nothing, the server sent code that parses; investigate what happened between the server and browser.

Rejected: a whole-run Vitest reporter inspecting cached transforms, and a `transform` hook that cannot see the final code. Out of scope: concurrent runs in one checkout, which share Vite optimizer caches and are unsupported.

## `os-neutral-browsers`

Every browser the tests use runs in one place: `playwright run-server` in Playwright's own Linux image, pinned by digest in `apps/web/compose.browsers.yml` (Axlog, 2026-10-23). Playwright's projects and Vitest's browser projects connect to it (`apps/web/browser-server.ts`) with `exposeNetwork: "<loopback>"`, so a page still loads the site and Vitest's server from the host's localhost. Screenshot baselines carry no platform suffix, and layout measurements such as `LONG_NAME_LENGTHS` are taken as that image renders them. `test/browser-server.test.ts` checks the image and server versions match the locked `@playwright/test`, and that no baseline is named for a platform. The server runs with `--unsafe` so the visual projects' `--disable-partial-raster` reaches Chromium; it is published only on 127.0.0.1.

Reason: the baselines were `-darwin` only and the layout constants were measured on macOS, so the suite could not pass on a Linux host. Linux Chromium rounds hinted glyph advances to whole pixels (Martian Mono at 20.8 px: 15.00 px per glyph against macOS's 14.04), which wrapped a 40-character Ay, Liens! heading that fits on macOS.

Rejected: a baseline set per platform, which doubles every visual change and still lets layout tests differ by host; and Chromium flags such as `--font-render-hinting=none` on the host, which leave WebKit and the system fonts host-dependent.

## `biome-overload-false-positive`

Biome's `noDeprecatedImports` checks imports, not calls, so it reports drizzle's `primaryKey` because one of its overloads (the variadic one) is deprecated, even where code calls the documented `primaryKey({ columns })`. Biome closed biomejs/biome#7636 as a trade-off of the rule's design, so no release will fix it (Axlog, 2026-10-14). `src/db/tables/monthly-spend.ts` calls `primaryKey({ columns })` and suppresses the rule on that one import with a `biome-ignore` that gives this reason and links the issue; `test/db/monthly-spend-table.test.ts` checks it is the only `biome-ignore` in `src/`. The rule stays on. Rejected: drizzle's undocumented `PrimaryKeyBuilder` class, turning the rule off, and waiting for a Biome release.

## `gitguardian-false-positive`

GitGuardian's `NODE_CRYPTO_TOKEN` alert on `test/auth/session-token.test.ts` is a false positive: a session token in the format before accounts, signed with the in-repo test secret, which the test keeps as a malformed token that reads as nothing (Axlog). Don't rotate it, rewrite history, or derive the fixture at test time.

## `monorepo-layout`

The repo is a monorepo of npm workspaces, with mise monorepo tasks across the apps (Axlog, 2026-10-14). The site lives in `apps/web/` and the instruction counter in `apps/instruction-counter/`; the issue pipeline, once `apps/issue-pipeline/` (#160), now lives in the [ecosystem repository](https://github.com/axolotl-logic-io/ecosystem). The root holds only the shared tooling and the top-level docs: one `package.json` that declares the `apps/*` workspaces and holds Biome and the `overrides`, the one `package-lock.json`, `mise.toml` (the monorepo root, pinning node), the Biome policy in `biome.jsonc`, `AGENTS.md` and the README. Each app has its own `mise.toml` with its tasks, run from anywhere as `mise //apps/web:check`, or `mise //...:check` for every app.

Rejected: Turborepo, because its cache would replay the flake gate's second e2e run, its hashes miss the test database and `.env.test`, fresh pipeline worktrees never hit the cache, and two packages gain nothing from its task graph. Nx and moon, which are built for many projects and languages and have the same caching concern. Bazel, Buck2 and Pants, which need BUILD files per target and a build engineer to maintain them.
