# Project practices

These are the repository's design, type, lint, test and secrets rules. The sections from Design through Secrets are a shared core, kept word for word the same in [ecosystem](https://github.com/axolotl-logic-io/ecosystem/blob/main/docs/project-practices.md) and [project-buddy](https://github.com/axolotl-logic-io/project-buddy/blob/main/docs/project-practices.md); change both together. The sections after them are this repository's own.

The repo is a monorepo with its apps under `apps/`. Sections named for the site describe `apps/web/`, and their paths are relative to it unless they name a root file.

## Design

Follow John Ousterhout's *A Philosophy of Software Design*:

- **Deep modules:** small, simple interfaces over substantial functionality. No pass-through methods, no thin wrappers that only rename, no classes that exist only to hold one call.
- **Information hiding:** each design decision lives in exactly one module, for example a storage layout, a wire format or an error classification. Callers don't know the schema, the provider or the format.
- **Pull complexity downward:** a module handles its hard cases itself rather than pushing them to callers through options or extra steps.
- **Define errors out of existence:** prefer interfaces with no error case. An unknown or malformed id is "not found" (`undefined`), not an exception; deletes are idempotent.
- **Different layer, different abstraction:** layers each speak their own vocabulary. Avoid temporal decomposition, which splits code by the order things happen rather than by the knowledge they hide.
- **Somewhat general-purpose:** interfaces fit today's needs without baking in one caller's special case.
- **Comments:** interface comments say what a module does and promises, not how. Implementation comments explain only what the code can't. Names are precise and consistent across the codebase.
- **Strategic, not tactical:** leave the code a little better designed than you found it.
- **A change is complete:** it updates the tests and docs it affects. Build on useful existing work instead of restarting.

## Types

- No `any`, no non-null `!`, and no `as` casts except at one validated boundary.
- Parse external data at the boundary with zod and use the parsed types inside it.
- Domain ids get their own types where they could be mixed up.

## Lint

- **No dodges:** satisfy a rule through better design, never through tricks that slip past it, such as computed keys, bracket reads or `process.getBuiltinModule`. Never weaken a test, check, lint rule or type to get a pass.

### Patterns the rules force

- Regexes are top-level, named and use the `u` flag.
- Parameter and return types are explicit; interfaces use property-style signatures; exports come last in a file; keys from an index signature are read by destructuring.
- No ternaries. No `void` on promises.
- `noSecrets` flags long camelCase identifiers in strings, so a `describe` names the behavior or command, not a long function name.

## Tests

Tests are sorted by the ISTQB (CTFL v4.0) test levels. A test lives in `test/<level>/`, under the path its subject has. A helper that more than one level uses lives in `test/support/`; one that a single level uses sits beside its tests.

| Level | Tests | Folder |
| --- | --- | --- |
| Component | one component on its own | `component/` |
| Component integration | components together, or one with a real dependency such as a database, a browser, Git, the filesystem or a subprocess | `component-integration/` |
| System | the whole built program through its entry points, with external services faked | `system/` |
| System integration | the program against real external services; opt-in, never in the default gates | `system-integration/` |
| Acceptance | an issue's Gherkin scenarios, one test each, run against the system | `acceptance/` |

- **A flake is a failure**. Fix the cause or the measurement; never rerun until it passes. A passing repeat adds no evidence, and no test may depend on timing.
- **Fix a known flake first, on its own,** before other work that would trip on it. A flake left open costs a run in every branch that meets it.
- **Test a feature or reproduce a bug, not an implementation.** A test checks behavior that a user or caller relies on, or reproduces a bug that was fixed. It doesn't pin private helpers, call order, internal state or wording that nothing relies on.
- **No tautological tests.** A test that can't fail while the code is wrong proves nothing: one that checks a mock returns what it was given, compares a value with itself, or re-proves the language or framework. Delete it, or rewrite it to check an outcome.
- **Tests don't need frequent maintenance.** A refactor that keeps behavior breaks no test. A test that breaks on most changes to its subject is testing the implementation; rewrite it against the outcome.
- **No timed waits; mock time.** A test never sleeps or polls on a timer for something to happen. It awaits the event itself, such as a promise, a process exit, a file change or a FIFO. Code that waits or reads the clock takes its clock or delay as a parameter, so tests pass a fake one. A subprocess, which fake timers can't reach, gets short durations through its configuration. A deadline may only fail a test, never pace it.
- **Fake services are long-lived servers.** A fake external service, such as GitHub, runs as one server per test machine, and the program reaches it the way it reaches the real one. Don't start a process for each call.
- **Tests clean up.** A test stops every process it starts and puts a deadline on every wait.
- **Reuse the test kits.** Before writing a helper, fixture or fake, look in `test/` for one, and extend it rather than writing a copy.

## Secrets

Never print a `.env*` file. Never copy a secret into code, docs, logs, issues or commits.

## Product

- **No requests to AI model companies.** A rite's reply is one of its fixed templates. The browser chooses and fills it so it shows at once; the server checks the choice against the rite's reply order and fills the saved copy.

## Tasks

- **Every command is a mise task, at the same name on each level.** A root task runs the app task of the same name in every app that has it (`mise run test` runs `mise run //apps/web:test` and the other apps'), plus the repository's own part, if any. An app task runs one tool, or the script in its `scripts/` named like the task (`db:prune` runs `scripts/db/prune.ts`). There are no npm scripts; `npm` only installs.
- **A checkout needs no settings to find its local resources.** Each local database is named from the branch and the repository (`apps/web/scripts/db/database-names.ts`), so every branch of every clone has its own, and a test command never takes a database or port from a file or a caller.

## Site design

- **Information hiding:** choosing and filling a rite's reply, the storage layout, error classification and the manual's URL scheme each live in one module. Callers don't know the reply templates. A route or page is a thin adapter over a domain module.
- **Define errors out of existence:** re-indexes are idempotent, like deletes. Errors that remain go through `src/errors/app-error.ts`.
- **Different layer, different abstraction:** UI, domain and storage each speak their own vocabulary.

## Site types

- External data parsed at the boundary includes request bodies, form data, env vars and JSON columns.
- `QuestId`, `ListId` and `PerformanceId` are separate id types.

## Site lint

- **Composite keys:** use the `{ columns }` overload of drizzle's `primaryKey`. The only allowed `biome-ignore` is `noDeprecatedImports` on that import, where the rule can't tell a current overload from a deprecated one, and it cites https://github.com/biomejs/biome/issues/7636.
- A conditional class uses `if`, since ternaries are out. An optional boolean prop is tested with `=== true`.
- Radix imports are named (`import { DropdownMenu } from "radix-ui"`). Handlers passed as props are module-level functions.
- Read env vars only through `src/env.ts`, adding a new accessor for a new variable. Log only through `src/errors/error-log.ts`.
- Don't import `Suspense`; use Next's segment conventions instead.

## Site UI

- **Copy** lives in `src/ui/copy/`, one module per area, one `<SECTION>_COPY` export per section. Importers import the area module directly. Page titles go through `pageTitle` in `site.ts`.
- **Theme tokens:** every color, font, radius, shadow, border width, page decoration and spacing step is a semantic token utility from `src/themes/contract.css` (`bg-surface`, `text-muted`, `rounded-control`, `shadow-raised`, `font-heading`, the heading roles such as `text-page-heading`). Tailwind's own color, radius, shadow and font scales are cleared, so `bg-red-500` doesn't compile. Components never use `dark:`, palette or hex colors, a theme name or the theme attributes.
  - Streamdown's own class names are mapped in one block of `src/components/performances.css`, for the Markdown only; `streamdown-names.test.ts` fails if another file writes one.
  - Icons use `<Icon name=…>` and the `.icon` and `.icon-line` roles. Focus rings read `--focus-outline` and `--focus-offset`.
  - Touch targets don't follow the theme's spacing: set a target's height through `--target-size`, never with a spacing utility such as `min-h-11`.
- **Page notices:** use `Notice` (`components/ui/form-message.tsx`) for static page state, `FormStatus` for routine feedback and `Alert` for errors needing immediate announcement. They share an opaque surface, border, padding and wrapping from `.notice`. State the purpose in words; errors also use the shared alert icon. Keep field errors (identified by id), hints, introductions and ordinary empty-state copy inline. Keep notices and their links or actions available until navigation or the next action; preserve focus when a submitted control disappears. Do not give static state a live role. Empty status regions stay mounted without a visible box.
- **CSS:** every import and rule is in a cascade layer; roles are plain classes in `page-roles.css` and `performances.css`. No `light-dark()`, `::selection` or `accent-color`. Every `var(--x)` is declared.
- **Site appearance:** the site has three fixed appearances: Ivory Vellum, Soot & Brass, and Espresso Leather. Change an appearance through `src/themes/parchment.css` and the semantic token contract. Every appearance must set every token, pass WCAG AA and size its headings in order.
- **Accessibility and phones:** WCAG AA in every theme. No sideways scroll at 320 px; targets at least 24 px, and 44 px where possible; the composer stays above the keyboard; no hover-only controls.
- **Server Components:** pages and layouts stay Server Components.
- **Tool parts:** every `TOOL_PARTS` entry names its `placement` (`"inline"` or `"under"`), and an inline entry names `textBefore` (`"working-note"` for a lookup, `"prose"` otherwise). Code reads `placementOf(part)`, never a tool name.

## Site data

- **Every query on user data** builds its `where` from the predicates in `src/accounts/owner-scope.ts`. A quest and everything in it are open to its owner and accepted members (`questOpenTo`); a pending invitation opens nothing but the invitee's own Pending row (`questPendingFor`), and owner-only actions use `questOwnedBy`. "Open to" predicates name what is reached through a quest open to the user, such as its lists and performances. Store functions take the acting user (`owner: UserId`) first, and a foreign id reads as not found. Real-database tests exercise access for the owner, a member, a pending invitee, a removed member and an unrelated user. New exports need access-scoped queries and real-dependency coverage.
- **Store reads are cached; store writes expire them.** A store read runs under `"use cache"`, keyed by the acting user, and calls `keepRead` or a `keepQuest*` helper (`src/db/read-cache.ts`, `src/quests/quest-reads.ts`), which tags it with the user's account and every quest it reads through, and gives a read of today a lifetime that ends at midnight. A store write calls `expireReads` with every account and quest it changed, after its transaction commits; a name, time zone or sign-up change calls `expireAccountReads`. Callers never name a tag. Server tests check that a write expires the reads it changes, for every user who reads them, with `writeExpiresRead` (`test/component-integration/test-database/read-cache-test-kit.ts`). Pages and layouts never write: a write while rendering is refused.
- **Schema changes go only through migrations.** Change the tables in `src/db/tables/`, then `mise run //apps/web:db:generate`. Never edit `drizzle/meta/` by hand; on a merge conflict in it, regenerate.
- **The release workflow migrates production while the old build is live** (`.github/workflows/release.yml`): it builds the new deployment, migrates, and only then makes the new build live, so the old build runs on the new schema for a few minutes. A Vercel rollback (`vercel rollback`, or the dashboard) restores old code but never reverts the schema. **A migration must work with the build that is live:** add tables and nullable or defaulted columns first; drop or rename something, or make it `NOT NULL`, only in a later release, once the live build no longer reads or writes the old form. A release PR can contain several integration merges: don't merge the second step into `integration` until the first is live in production. Say in the PR which kind each migration is.

## Product documentation

Changes to rites, constructs, reply templates or relevant user flows update the corresponding repository documentation in the same PR.

## Site construct and rite texts

- Rite replies and construct texts say "the user" and "their", never "she" or "her".

## Site tests

- **Quality checks.** `mise run lint` runs Biome and the type check. `mise run test` runs every test in parallel lanes: React Doctor and the fast checks; the server tests; and the Vitest browser tests beside the Playwright tests. Each `test:*` task in `apps/web/mise.toml` is one stage and runs on its own too. CI runs the same `mise run test`.
- **Reruns.** The full run reports each stage as it finishes, lets the other stages finish after a failure, and prints a command for each failed case, which runs from any folder. Run `mise run test` again after fixing the failures.
- **Use cases drive tests.** Every use case gets a test in the lane that can see its risk.
  - A browser test (`*.browser.test.tsx`) checks one component or page in one state, in both Chromium and WebKit: what it shows, focus and the keyboard, touch, phone layouts, the light and dark appearance, the time zone, optimistic states, error copy, and storage or reply faults it injects.
  - A Playwright e2e test (`test/system/*.spec.ts`) follows a user through the built site where only the real App Router and server show the outcome: sign-up, sign-in and sessions, redirects after a Server Action, Back and Forward, the router cache, the header slot, and console errors along the way.
  - Don't write a test that only checks that a mock was called, that repeats another test's outcome through the same entry point, or that waits a fixed time instead of for what the user sees.
  - A case that needs a real server or database but no page gets a server test (`*.server.test.ts`) that calls the Server Action, route handler or store with real users and sessions from the kit in `test/support/test-database/`, which deletes them after the test. A browser test that needs the browser's time zone is `*.zoned.browser.test.tsx`, and one that needs a touch screen is `*.touch.browser.test.tsx`. [Tests](../README.md#tests) in the README lists the commands.
- **Give each outcome one primary test.** Add another test when it exercises a distinct risk, such as browser focus, a database constraint, or a session in the built site. When two tests exercise the same outcome through the same entry point, retain the distinct assertions in one case.
- **Check a regression test against the bug.** Run it with the bug present and confirm it fails for the expected reason. If a test repeatedly needs updates after changes that preserve its outcome, rewrite the assertion or delete it if another test already covers the outcome.
- **Local replies:** every environment chooses rite replies in the browser and checks and fills them on the server. Tests use the real rites and inject only the particular storage or reply fault a test exercises.
- **The test databases:** the server tests and the Playwright tests each have a database of the branch's own on the in-memory test server (`compose.test-db.yml`), and each suite empties and migrates its own before it runs, so the two run at once. The suites take their settings only from `scripts/test-env/suite-environment.ts`: that database, the file email outbox and a fixed session secret. `mise run db:prune` drops the databases of deleted branches.
- **Phone checks:** a new page gets an entry in `PHONE_PAGES` (`test/component-integration/app/phone-pages-test-kit.tsx`).
- **Check what the user sees, not class names.** UI tests find elements by role, label or text and check what is shown or done, never a CSS class name such as `card` or `error-box`.
- **E2e helpers:** every test gets its own `account` and `testData` from `test/system/fixtures.ts`, deleted after the test. The fixtures make them with the server tests' kit in `test/support/test-database/`. Next's route announcer also has `role="alert"`. Locate the page's alert inside its container or by its text.
- **Typing right after a goto:** WebKit hydrates a page well after the load event `page.goto` waits for, and text typed before then misses the form's state. Fill a field right after a goto with `fillWhenReady` from `page-helpers.ts`.

## Site production

- **Secrets** live in `.env` and `.env.local` (both ignored by git), in Vercel, and in the repo's Actions secrets for the release workflow.
- **One Neon database** serves Production, Preview and Development. Never write test data to it. A production smoke test labels its data "(delete me)" and deletes it afterwards.
- **Release PRs merge `integration` into `main`.** On every PR and integration push, `.github/workflows/ci.yml` runs `mise run lint` and `mise run test` as two jobs, with a test database on the runner and no secrets. Integration protection requires passing checks and an up-to-date branch. Integration pushes deploy and smoke-test previews only. Before merging an integration-to-main release PR, reconcile branch divergence, verify integration checks and preview, and inspect pending migrations against the live build. `mise run deploy` runs those checks, opens and merges the release PR, and follows the release; it stops on a migration the live build might not run with, and `mise run deploy --dry-run` prints the PR without opening it. Every main push automatically builds, migrates, promotes and smoke-tests production through `.github/workflows/release.yml`. Releases never overlap or cancel a running release. Use PRs and required checks; never force-push protected branches. Don't make Claude unavailable on purpose in a smoke test.
