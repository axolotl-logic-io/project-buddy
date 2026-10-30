# Project practices

These are the repository's design, type, lint, test and secrets rules. The sections from Design through Secrets are a shared core, kept word for word the same in [ecosystem](https://github.com/axolotl-logic-io/ecosystem/blob/main/docs/project-practices.md) and [project-buddy](https://github.com/axolotl-logic-io/project-buddy/blob/main/docs/project-practices.md); change both together. The sections after them are this repository's own.

The repo is a monorepo: npm workspaces under `apps/`, with one `package-lock.json` at the root, and mise tasks in each app's `mise.toml`. Sections named for the site describe `apps/web/`, and their paths are relative to it unless they name a root file.

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

- **The AI provider stays swappable** through the Vercel AI SDK.

## Site design

- **Information hiding:** the model choice, prompt assembly, the storage layout, error classification and the manual's URL scheme each live in one module. Callers don't know the prompt text. A route or page is a thin adapter over a domain module.
- **Define errors out of existence:** re-indexes are idempotent, like deletes. Errors that remain go through `src/errors/app-error.ts`.
- **Different layer, different abstraction:** UI, domain and storage each speak their own vocabulary.

## Site types

- External data parsed at the boundary includes request bodies, form data, env vars, JSON columns and model tool inputs.
- `ProjectId` and `ChatId` are separate id types.

## Site lint

- **The one `biome-ignore`** is on drizzle's `primaryKey` import, where the rule can't tell a current overload from a deprecated one.
- A conditional class uses `if`, since ternaries are out. An optional boolean prop is tested with `=== true`.
- Radix imports are named (`import { DropdownMenu } from "radix-ui"`). Handlers passed as props are module-level functions.
- Read env vars only through `src/env.ts`, adding a new accessor for a new variable. Log only through `src/errors/error-log.ts`.
- Code that imports `Suspense` fails lint; use Next's segment conventions instead.

## Site UI

- **Copy** lives in `src/ui/copy/`, one module per area, one `<SECTION>_COPY` export per section. Importers import the area module directly. Page titles go through `pageTitle` in `site.ts`.
- **Theme tokens:** every color, font, radius, shadow, border width, page decoration and spacing step is a semantic token utility from `src/themes/contract.css` (`bg-surface`, `text-muted`, `rounded-control`, `shadow-raised`, `font-heading`, the heading roles such as `text-page-heading`). Tailwind's own color, radius, shadow and font scales are cleared, so `bg-red-500` doesn't compile. Components never use `dark:`, palette or hex colors, a theme name or the theme attributes.
  - Streamdown's own class names are mapped in one block of `src/components/chat/chat.css`, for the Markdown only; `streamdown-names.test.ts` fails if another file writes one.
  - Icons use `<Icon name=…>` and the `.icon` and `.icon-line` roles. Focus rings read `--focus-outline` and `--focus-offset`.
  - Touch targets don't follow the theme's spacing: set a target's height through `--target-size` (44 px, in `page-roles.css`), never with a spacing utility such as `min-h-11`.
- **CSS:** every import and rule is in a cascade layer; roles are plain classes in `page-roles.css` and `chat.css`. No `light-dark()`, `::selection` or `accent-color`. Every `var(--x)` is declared. The last layer is `extras`, which hides switched-off extras.
- **Adding a theme:** follow "ADDING A THEME" in `src/themes/themes.ts` and add its entry in `LONG_NAME_LENGTHS` (`test/component-integration/themes/signed-in-pages.browser.test.tsx`). `contract.test.ts` checks it defines the whole contract and `contrast.test.ts` checks WCAG AA.
- **Adding an extra:** follow "ADDING AN EXTRA" in `src/flags/flags.ts`. Each extra is tagged with `{...extraTag(id)}` and has an entry in `EXTRA_SCENES` (`test/component-integration/flags/hide-extras.browser.test.tsx`).
- **Accessibility and phones:** WCAG AA in every theme. No sideways scroll at 320 px; targets at least 24 px, and 44 px where possible; the composer stays above the keyboard; no hover-only controls.
- **Server Components:** pages and layouts stay Server Components.
- **Tool parts:** every `TOOL_PARTS` entry names its `placement` (`"inline"` or `"under"`), and an inline entry names `textBefore` (`"working-note"` for a lookup, `"prose"` otherwise). Code reads `placementOf(part)`, never a tool name.

## Site data

- **Every query on user data** builds its `where` from the predicates in `src/accounts/owner-scope.ts`. Store functions take `owner: UserId` first, and a foreign id reads as not found. Real-database tests exercise owner isolation. New exports need owner-scoped queries and real-dependency coverage.
- **Schema changes go only through migrations.** Change the tables in `src/db/tables/`, then `npm run db:generate`. Never edit `drizzle/meta/` by hand; on a merge conflict in it, regenerate.
- **The release workflow migrates production while the old build is live** (`.github/workflows/release.yml`): it builds the new deployment, migrates, and only then makes the new build live, so the old build runs on the new schema for a few minutes. A Vercel rollback (`vercel rollback`, or the dashboard) restores old code but never reverts the schema. **A migration must work with the build that is live:** add tables and nullable or defaulted columns first; drop or rename something, or make it `NOT NULL`, only in a later release, once the live build no longer reads or writes the old form. Releases are manual, so two merges can go out in one release: don't merge the second step into `integration` until the first is live in production. Say in the PR which kind each migration is.

## Site prompts and the AI SDK

- Prompt and buddy texts say "the user" and "their", never "she" or "her".
- AI SDK 7: `streamText`'s `response` covers the last step only, so a follow-up call reads `result.responseMessages`. Text parts have no ids: group consecutive text parts, and key other parts by their own ids, such as `toolCallId`.

## Site tests

- **Fast default checks**: `npm run check` runs lint/format/import checks, types, deterministic shell safety checks and filesystem/repository guards, including use-case coverage, plus the six cheap in-process Vite guards (no browser binaries or database). `npm test` and `test:watch` select both Node projects, `repository` and `vite-integration`. `test:vite` selects only those six default guards; browser projects use explicit `test:browser`; `test:integration` selects guards plus all Vite/browser projects. Server, e2e and build/font checks remain explicit opt-ins. A fast pass proves none of those unrun stages. See the [stage costs and prerequisites](../README.md#tests).
- **Use cases drive tests**. Playwright e2e tests cover only the auth workflows: sign-up, sign-in, sign-out, the sign-in limits, and the signed-out access gate. Every other use case gets a Vitest test. A case that needs a real server or database gets a server test against the test database in `.env.test`, which calls the Server Action, route handler or store with real users and sessions. A server test is `test/**/*.server.test.ts`, run in Node by `npm run test:server` (and first by `npm run test:e2e`, never by `npm test`); it makes its users, data and sessions with the kit in `test/support/test-database/`, which deletes them after the test. A case that needs only the UI gets a browser integration or feature-entrypoint test. Browser-mode component integrations exercise UI behavior through the real browser, without requiring a whole application flow. Browser tests are `test/**/*.browser.test.tsx`, run explicitly by `npm run test:browser` in headless Chromium and WebKit; one that needs the browser's time zone is `*.zoned.browser.test.tsx`, run in each zone of `ZONES` by its own `browser-<zone>` project, and one that needs a touch screen is `*.touch.browser.test.tsx`, run with touch by the `browser-touch` project (`vitest.config.mts`).
- **The mock buddy:** e2e tests run against a non-production database with `BUDDY_MODEL=mock`, never against real Claude. Its commands (`/mock-tool`, `/mock-search`, `/mock-error` and the rest) are listed in `MOCK_COMMANDS` in `src/replies/mock-script.ts`, each with its usage line.
- **The test database:** The orchestrator provides `.env.test` with its local database and `E2E_PORT` pinned to the checkout's lane. Test commands consume it without allocating names or ports or tearing down lane resources. For manual work, `npm run test-env:init` writes it with the worktree's own database and site port, or copy `.env.test.example` by hand and configure them. `test:server` resets and migrates that database; `test:e2e` runs server tests followed by Playwright only on success. Guards require localhost or 127.0.0.1, a safe database name, the mock buddy and file outbox.
- **Phone checks:** a new page gets an entry in `PHONE_PAGES` (`test/component-integration/app/phone-pages-test-kit.tsx`). Browser tests check page width and touch targets at 320 and 390 px in every theme. See "Phone and theme checks" in the README.
- **Check what the user sees, not class names.** UI tests find elements by role, label or text and check what is shown or done, never a CSS class name such as `card` or `error-box`.
- **E2e helpers:** every test gets its own `account` and `testData` from `test/system/fixtures.ts`, deleted after the test; the fixtures make them with the server tests' kit in `test/support/test-database/`. Next's route announcer also has `role="alert"`, so find an alert inside its container (`alertIn` in `page-helpers.ts`) or by its text, never by `getByRole("alert")` alone.
- **Typing right after a goto:** WebKit hydrates a page well after the load event `page.goto` waits for, and text typed before then misses the form's state. Fill a field right after a goto with `fillWhenReady` from `page-helpers.ts` (or `sendMessage` in `chat-page.ts` for the composer).

## Site production

- **Secrets** live in `.env` and `.env.local` (both ignored by git), in Vercel, and in the repo's Actions secrets for the release workflow.
- **One Neon database** serves Production, Preview and Development. Never write test data to it. A production smoke test labels its data "(delete me)" and deletes it afterwards.
- **PRs target `integration`; deploys are manual.** `.github/workflows/check.yml` runs `npm run check --workspaces` on every PR. Branch protection on `integration` requires it to pass, and requires a PR's branch to be up to date with `integration` before it merges. A merge into `integration` deploys only a preview, which `.github/workflows/integration.yml` smoke-tests. Production gets nothing on merge or push. To release, run `scripts/deploy.sh`: it fast-forwards `main` to a tested `integration` commit and opens a deploy ticket, an issue labeled `deploy`. Never push to `main` by hand. Deploys run from a clean checkout and never with `--force`. Don't make Claude unavailable on purpose in a smoke test.
