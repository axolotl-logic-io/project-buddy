# Contributing

These are the rules for all code in the Project Buddies software ecosystem, for people and agents alike: the site in `apps/web/`, the issue pipeline in `apps/issue-pipeline/`, and every script and tool beside them ([`practices-cover-all-code`](https://github.com/axolotl-logic/project-buddy/wiki/Decisions-Code-and-tooling#practices-cover-all-code) in the wiki). The README covers setup and commands. The wiki's [Decisions](https://github.com/axolotl-logic/project-buddy/wiki/Decisions) pages record the design decisions behind these rules and what was rejected. Remaining work is tracked in GitHub issues.

Design, Types and Lint apply to every app, as do the general rules in Tests (test-first, a flake is a failure, `npm audit`). Product, UI, Data, Prompts and the AI SDK, the site-specific rules in Tests, and Secrets and production describe the site. Paths in those sections are relative to `apps/web/`, the site's folder, unless they name a root file.

Where this file and a config file disagree, the config file wins: `tsconfig.json`, the root `biome.jsonc` and `apps/web/biome.jsonc`, `playwright.config.ts`.

## Product

- **Users:** a small group of invited users, each with private data and a $5 monthly Claude quota. There is no public sign-up and no admin page.
- **The Blender manual** is read only through official, permitted channels. The `docs.blender.org`, `developer.blender.org` and `projects.blender.org` web pages and `download.blender.org` serve a Cloudflare bot challenge to scripts: don't scrape them, mirror them with `wget`, or work around the challenge. The index comes from a `git clone` of the manual source (`manual-via-git-clone`).
- **Licence:** the manual is CC BY-SA 4.0. The UI shows the attribution, and quoted manual text stays under CC BY-SA.
- **A buddy changes tone, not facts.** Steps, menu paths, shortcuts and citation links stay exact for every buddy, and the app renders citations outside the buddy's prose. Buddies are written voice only: no audio, no voice cloning. Buddy rules stay light (`no-banned-lists`).
- **Scope:** the Blender Reference Manual only. No screenshots, other sources or `.blend` scene support in version 1.
- **The AI provider stays swappable** through the Vercel AI SDK.

## Design

Follow John Ousterhout's *A Philosophy of Software Design*:

- **Deep modules:** small, simple interfaces over substantial functionality. No pass-through methods, no thin wrappers that only rename, no classes that exist only to hold one call.
- **Information hiding:** each design decision lives in exactly one module, for example the model choice, prompt assembly, the storage layout, error classification and the manual's URL scheme. Callers don't know the schema, the provider or the prompt text. A route or page is a thin adapter over a domain module.
- **Pull complexity downward:** a module handles its hard cases itself rather than pushing them to callers through options or extra steps.
- **Define errors out of existence:** prefer interfaces with no error case. An unknown or malformed id is "not found" (`undefined`), not an exception; deletes and re-indexes are idempotent. Errors that remain go through `src/errors/app-error.ts`.
- **Different layer, different abstraction:** UI, domain and storage each speak their own vocabulary. Avoid temporal decomposition, which splits code by the order things happen rather than by the knowledge they hide.
- **Somewhat general-purpose:** interfaces fit today's needs without baking in one caller's special case.
- **Design it twice:** for a new module interface, sketch two alternatives, and say which you chose and why in the pull request or report.
- **Comments:** interface comments say what a module does and promises, not how. Implementation comments explain only what the code can't. Names are precise and consistent across the codebase.
- **Strategic, not tactical:** leave the code a little better designed than you found it.
- **Review red flags:** shallow module, information leakage, temporal decomposition, pass-through method, overexposure, repetition, special-general mixture, conjoined methods, vague names, and code that is hard to describe or comment.

## Types

- **The strictest TypeScript:** see `tsconfig.json` (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` and the rest, with `allowJs` off).
- No `any`, no non-null `!`, and no `as` casts except at one validated boundary.
- Parse external data at the boundary with zod: request bodies, form data, env vars, JSON columns and model tool inputs. Inside the boundary, use the parsed types.
- Use `import type` for types. Switches over unions are exhaustive, with a `never` check. Prefer discriminated unions to bags of optional fields.
- Domain ids get their own types where mixing them up is possible, such as `ProjectId` and `ChatId`.
- No `satisfies` and no `as const`: annotate the type instead, and check a structural fit with a type test (as `tutorTools` does against `ToolSet`). The one exception is `as const` on the `<SECTION>_COPY` objects in `src/ui/copy/`.

## Lint

- **Biome's `all` preset,** with every group at `error`, so info diagnostics fail too (`biome-infos-fail`). `npm run check` runs `biome check --error-on-warnings`, so warnings and import order fail.
- **Don't turn rules off.** Fix the code, even if that means redesigning the UI. Tests follow the same rules as other code; if code is hard to test, fix its interface.
- **No dodges:** satisfy a rule through better design, never through tricks that slip past it (computed keys, bracket reads, `process.getBuiltinModule`). No `biome-ignore`, except the one on drizzle's `primaryKey` import, where the rule can't tell a current overload from a deprecated one (`biome-overload-false-positive`).
- **Scoped overrides** are allowed only where a framework's or platform's prevailing practice requires the forbidden pattern, kept to the smallest boundary, with a reason in the root `biome.jsonc` or `apps/web/biome.jsonc` (`best-practice-over-lint`). Anything else that can't be satisfied goes to the repo's owner before any override is added.
- **Limits:** 300 lines per file and 50 per function; `describe` callbacks count as functions.

### Patterns the rules force

- Imports name the file extension (`@/x.ts`), in Biome's order. Fix one file with `npx biome check --write <file>`.
- Specs use `test`, not `it`. `noSkippedTests` and `useExpect` forbid `test.fixme` stubs.
- Regexes are top-level, named and use the `u` flag.
- Parameter and return types are explicit; interfaces use property-style signatures; exports come last in a file; keys from an index signature are read by destructuring.
- No ternaries: a conditional class uses `if`. An optional boolean prop is tested with `=== true`. No `void` on promises.
- Radix imports are named (`import { DropdownMenu } from "radix-ui"`). Handlers passed as props are module-level functions.
- `noSecrets` flags long camelCase identifiers in strings, so a `describe` names the behaviour or command, not a long function name.
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
- **Adding an extra:** follow "ADDING AN EXTRA" in `src/flags/flags.ts`. Each extra is tagged with `{...extraTag(id)}` and has an entry in `EXTRA_SCENES` (`src/flags/hide-extras.browser.test.tsx`).
- **Accessibility and phones:** WCAG AA in every theme. No sideways scroll at 320 px; targets at least 24 px, and 44 px where possible; the composer stays above the keyboard; no hover-only controls.
- **Server Components:** pages and layouts stay Server Components.
- **Tool parts:** every `TOOL_PARTS` entry names its `placement` (`"inline"` or `"under"`), and an inline entry names `textBefore` (`"working-note"` for a lookup, `"prose"` otherwise). Code reads `placementOf(part)`, never a tool name.

## Data

- **Every query on user data** builds its `where` from the predicates in `src/accounts/owner-scope.ts`. Store functions take `owner: UserId` first, and a foreign id reads as not found. `src/accounts/owner-scope-coverage.test.ts` checks every export of the modules that touch user data, so a new export fails until it is called there with its queries checked, or allowed without an owner, with the reason.
- **Schema changes go only through migrations.** Change the tables in `src/db/tables/`, then `npm run db:generate`. Never edit `drizzle/meta/` by hand; on a merge conflict in it, regenerate.
- **The release workflow migrates production while the old build is live** (`.github/workflows/release.yml`): it builds the new deployment, migrates, and only then makes the new build live, so the old build runs on the new schema for a few minutes. A Vercel rollback (`vercel rollback`, or the dashboard) restores old code but never reverts the schema. **A migration must work with the build that is live:** add tables and nullable or defaulted columns first; drop or rename something, or make it `NOT NULL`, only in a later release, once the live build no longer reads or writes the old form. Releases are manual, so two merges can go out in one release: don't merge the second step into `integration` until the first is live in production. Say in the PR which kind each migration is.

## Prompts and the AI SDK

- Prompt and buddy texts say "the user" and "their", never "she" or "her".
- AI SDK 7: `streamText`'s `response` covers the last step only, so a follow-up call reads `result.responseMessages`. Text parts have no ids: group consecutive text parts, and key other parts by their own ids, such as `toolCallId`.

## Tests

- **Test-first:** Vitest for logic and for use cases, with a component or browser test for a case that needs only the UI and a server test for one that needs a real server or database; Playwright only for visual regressions and the auth workflows. `npm run check` and `npm audit` (0 vulnerabilities) pass before every merge.
- **Use cases drive tests** (`use-cases-drive-tests`). Playwright e2e tests cover only visual regressions (`e2e/visual/`) and the auth workflows: sign-up, sign-in, sign-out, the sign-in limits, and the signed-out access gate (`e2e-visual-and-auth-only`). Every other use case gets a Vitest test. A case that needs a real server or database gets a server test against the test database in `.env.test`, which calls the Server Action, route handler or store with real users and sessions. A server test is `src/**/*.server.test.ts`, run in Node by `npm run test:server` (and first by `npm run test:e2e`, never by `npm test`); it makes its users, data and sessions with the kit in `src/test-database/` (`testUser`, `testData`, `signIn`, `signOut`, `lapsed`, `requestWithSession`, `expectRedirect`, `expectNotFound`), which deletes them after the test. A case that needs only the UI gets a component or browser test. Component tests are `src/**/*.test.tsx` under jsdom; browser tests are `src/**/*.browser.test.tsx`, run by `npm test` in headless Chromium and WebKit; one that needs the browser's time zone is `*.zoned.browser.test.tsx`, run in each zone of `ZONES` by its own `browser-<zone>` project, and one that needs a touch screen is `*.touch.browser.test.tsx`, run with touch by the `browser-touch` project (`vitest.config.mts`). A src test or `describe` titled exactly by a `use_case_*` slug covers that case, and a slug title there must name a case; only titles are checked in src, so other src tests keep plain titles. Each e2e test outside `e2e/visual/` is titled exactly by the slug of an auth case, one of the `AUTH_CASES` in `use-cases/auth-cases.ts`, or sits in `test.describe("<slug>")` of one: `use-cases.test.ts` enforces `e2e-visual-and-auth-only` against that list, and fails an e2e test there that names any other case, and an entry of the list that isn't a case. A case written before its test is listed in `PENDING_CASES` (`e2e/pending-cases.ts`); a case is tested or pending, never both. New behaviour gets a variation line in the area's `use-cases/*.md`. Whoever implements a use case writes its test.
- **A flake is a failure.** Fix the cause or the measurement; never rerun until it passes. A passing repeat adds no evidence, and no test may depend on timing.
- **The mock tutor:** e2e tests run against a non-production database with `TUTOR_MODEL=mock`, never against real Claude. Its commands (`/mock-tool`, `/mock-search`, `/mock-error` and the rest) are listed in `MOCK_COMMANDS` in `src/tutor/mock-script.ts`, each with its usage line.
- **The test database:** Postgres in Docker behind Neon's local proxy on port 4444 (`compose.test-db.yml`), configured by `.env.test` (copy `.env.test.example`). `npm run test:server` and `npm run test:e2e` each reset it from empty first. `checkTestEnvironment()` in `scripts/test-db/test-database.ts` refuses any database not on localhost. Two checkouts that run the tests at the same time each need their own database name and `E2E_PORT`.
- **Visual and phone checks:** see "Visual tests" in the README. An intended visual change commits its new baselines in the same commit. A new page gets a visual spec and an entry in `PHONE_PAGES` (`src/app/phone-pages-test-kit.tsx`). A new theme gets an entry in `LONG_NAME_LENGTHS` (`src/themes/signed-in-pages.browser.test.tsx`).
- **E2e helpers:** every test gets its own `account` and `testData` from `e2e/fixtures.ts`, deleted after the test; use them, and the shared helpers in `e2e/` (`fixtures.ts`, `chat-page.ts`, `log-in.ts`, `page-helpers.ts`, `sign-in-pages.ts`, `sign-in-clock.ts`, `outbox.ts`, `visual/visual-page.ts`), rather than writing a copy. The fixtures make their accounts and data with the server tests' kit in `src/test-database/`. Next's route announcer also has `role="alert"`, so find an alert inside its container (`alertIn` in `page-helpers.ts`) or by its text, never by `getByRole("alert")` alone.
- **Typing right after a goto:** WebKit hydrates a page well after the load event `page.goto` waits for, and text typed before then misses the form's state. Fill a field right after a goto with `fillWhenReady` from `page-helpers.ts` (or `sendMessage` in `chat-page.ts` for the composer).
- **Unit-test helpers** sit beside the code they fake, named `fake-*.ts`, `*-fixtures.ts` or `*-test-kit.ts`: for example `src/db/fake-neon-http.ts`, which runs the real Neon driver against a stubbed `fetch`.

## Secrets and production

- **Secrets** live in `.env` and `.env.local` (both ignored by git), in Vercel, and in the repo's Actions secrets for the release workflow. Never print a `.env*` file; read one variable with `node --env-file`, or check it's present with `grep -c`. Never copy a secret into code, docs, logs, issues or commits.
- **One Neon database** serves Production, Preview and Development. Never write test data to it. A production smoke test labels its data "(delete me)" and deletes it afterwards.
- **PRs target `integration`; deploys are manual.** A merge into `integration` deploys only a preview, which `.github/workflows/integration.yml` smoke-tests. Production gets nothing on merge or push. To release, run `scripts/deploy.sh`: it fast-forwards `main` to a tested `integration` commit and opens a deploy ticket, an issue labelled `deploy`. Never push to `main` by hand. Deploys run from a clean checkout and never with `--force`. Don't make Claude unavailable on purpose in a smoke test.
