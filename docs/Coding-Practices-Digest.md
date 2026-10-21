# Coding practices digest

This page summarises the repo's `AGENTS.md` and the test decisions in [Code and tooling decisions](Decisions-Code-and-tooling.md). The full files win where they differ.

The issue pipeline's spec writer reads this page in place of those files and opens a full file only for a rule that bears on its work. When a practice this page covers changes, update this page in the same change.

## Scope

- The repo is a monorepo of npm workspaces under `apps/`, with one root `package-lock.json` and mise tasks in each app's `mise.toml`, such as `mise //apps/web:check` (`monorepo-layout`).
- Design, Types and Lint apply to every app, and so does the rule that a flake is a failure. The Product, UI, Data, Prompts, site test, and Secrets and production rules describe the site, with paths relative to `apps/web/`.

## Design

The code follows John Ousterhout's *A Philosophy of Software Design*.

- **Deep modules:** small interfaces over substantial functionality. No pass-through methods, thin renaming wrappers, or classes that hold one call.
- **Information hiding:** each design decision lives in one module, such as the model choice, prompt assembly, the storage layout, error classification or the manual's URL scheme. A route or page is a thin adapter over a domain module.
- **Pull complexity downward:** a module handles its own hard cases instead of pushing options or steps onto callers.
- **Define errors out of existence:** an unknown or malformed id is "not found" (`undefined`), and deletes and re-indexes are idempotent. Errors that remain go through `src/errors/app-error.ts`.
- **Layers:** UI, domain and storage each speak their own vocabulary. Split code by the knowledge it hides, not by the order things happen.
- **Somewhat general-purpose:** interfaces fit today's needs without one caller's special case.
- **Comments and names:** interface comments say what a module promises, not how. Implementation comments explain only what the code can't. Names are precise and consistent.
- **Strategic, not tactical:** leave the code a little better designed than you found it.

## Types

- No `any`, no non-null `!`, and no `as` casts except at one validated boundary.
- External data is parsed with zod at the boundary: request bodies, form data, env vars, JSON columns and model tool inputs.
- Ids that can be mixed up get their own types, such as `ProjectId` and `ChatId`.

## Lint

- No rule is turned off, and tests follow the same rules as other code. If code is hard to satisfy or to test, redesign its interface.
- No dodges: computed keys, bracket reads and `process.getBuiltinModule` are not allowed. The one `biome-ignore` is on drizzle's `primaryKey` import (`biome-overload-false-positive`).
- Patterns the rules force:
  - Specs use `test`, not `it`; skipped tests and `test.fixme` stubs fail lint.
  - Regexes are top-level, named and use the `u` flag.
  - Parameter and return types are explicit; interfaces use property-style signatures; exports come last; keys from an index signature are read by destructuring.
  - No ternaries, and no `void` on promises. An optional boolean is tested with `=== true`.
  - Radix imports are named, and handlers passed as props are module-level functions.
  - `noSecrets` flags long camelCase identifiers in strings, so test titles name the behaviour, not a long function name.
  - In the site, env vars are read only through `src/env.ts` and logs go only through `src/errors/error-log.ts`. Importing `Suspense` fails lint (`suspense-via-segment-conventions`).

## Tests

- **Tests pin promised behaviour, not internals** (`tests-pin-promised-behaviour`): what the wiki and the README promise, reply shapes, stop codes, caps and limits, GitHub-visible effects and past bugs by issue number. Copied constants, prompt or log text, call order, argv and whole-trace snapshots are not promised.
- **A flake is a failure** (`flakes-are-failures`). Fix the cause or the measurement; never rerun until it passes. No test depends on timing.
- **Waits** follow `web-tests-under-load`: wait for the event that marks work done. A clocked wait that remains is a named constant, with its worst measured time and load, set to at least 3 times that time.
- **Tests and their helpers live in `test/`, never `src/`** (`test-code-in-test`): each in the folder its subject has under `src/`, so `src/chats/store.ts` is tested by `test/chats/store.test.ts`. Helpers are named `fake-*.ts`, `*-fixtures.ts` or `*-test-kit.ts`. `src/` holds only what the app runs.
- **Site tests** (`use-cases-drive-tests`, `e2e-visual-and-auth-only`):
  - Playwright covers only visual regressions (`e2e/visual/`) and the auth workflows. Every other use case is a Vitest test.
  - A case that needs a real server or database is a server test, `test/**/*.server.test.ts`, run by `npm run test:server` against `.env.test`'s database with the kit in `test/test-database/`.
  - A case that needs only the UI is a component test (`*.test.tsx`) or a browser test (`*.browser.test.tsx`, Chromium and WebKit). Time-zone tests are `*.zoned.browser.test.tsx`, and touch tests are `*.touch.browser.test.tsx`.
  - E2e tests use the mock tutor (`TUTOR_MODEL=mock`) and a non-production database, never real Claude.
  - E2e tests use the shared fixtures and helpers in `e2e/`, and fill a field right after a goto with `fillWhenReady`.
  - A visual change commits its new baselines in the same commit. A new page gets a visual spec and a `PHONE_PAGES` entry.
  - A new bare import in browser code goes into `PREBUNDLED_DEPS` (`browser-deps-prebundled`).

## Site rules

- **Product:** the AI provider stays swappable through the Vercel AI SDK.
- **UI:** copy (the site's user-facing text) lives in `src/ui/copy/`. Every colour, font, radius, shadow and spacing step is a semantic token from `src/themes/contract.css`. Pages and layouts stay Server Components. WCAG AA in every theme, no sideways scroll at 320 px, and touch targets set through `--target-size`.
- **Data:** every query on user data builds its `where` from `src/accounts/owner-scope.ts`, and a foreign id reads as not found. Schema changes go only through migrations (`npm run db:generate`), and a migration must work with the build that is live.
- **Prompts:** prompt and buddy texts say "the user" and "their". AI SDK follow-ups read `result.responseMessages`.

## Secrets and production

- Never print a `.env*` file, and never copy a secret into code, docs, logs, issues or commits.
- One Neon database serves Production, Preview and Development: never write test data to it.
- Pull requests target `integration`; a merge deploys only a preview. Releases are manual, through `scripts/deploy.sh`; never push to `main` by hand.
