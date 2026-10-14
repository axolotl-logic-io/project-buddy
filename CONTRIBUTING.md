# Contributing

These are the rules for changing project-buddy's code, for people and agents alike. The README covers setup and commands. The wiki's [Decisions](https://github.com/axolotl-logic/project-buddy/wiki/Decisions) pages record the design decisions behind these rules and what was rejected. Remaining work is tracked in GitHub issues.

Paths here are relative to `apps/web/`, the site's folder, unless they name a root file.

Where this file and a config file disagree, the config file wins: `tsconfig.json`, the root `biome.jsonc` and `apps/web/biome.jsonc`, `playwright.config.ts`.

## Product

- **Users:** a small group of invited users, each with private data and a $5 monthly Claude quota. There is no public sign-up and no admin page.
- **The Blender manual** is read only through official, permitted channels. The `docs.blender.org`, `developer.blender.org` and `projects.blender.org` web pages and `download.blender.org` serve a Cloudflare bot challenge to scripts: don't scrape them, mirror them with `wget`, or work around the challenge. The index comes from a `git clone` of the manual source (`manual-via-git-clone`).
- **Licence:** the manual is CC BY-SA 4.0. The UI shows the attribution, and quoted manual text stays under CC BY-SA.
- **A persona changes tone, not facts.** Steps, menu paths, shortcuts and citation links stay exact for every persona, and the app renders citations outside the persona's prose. Personas are written voice only: no audio, no voice cloning. Persona rules stay light (`no-banned-lists`).
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
- **Scoped overrides** are allowed only where a framework's or platform's prevailing practice requires the forbidden pattern, kept to the smallest boundary, with a reason in the root `biome.jsonc` or `apps/web/biome.jsonc` (`best-practice-over-lint`). Anything else that can't be satisfied goes to Autumn before any override is added.
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
- **Adding a theme** touches only `src/themes/`, plus its e2e entry and baselines; follow "ADDING A THEME" in `src/themes/themes.ts`. `contract.test.ts` checks it defines the whole contract and `contrast.test.ts` checks WCAG AA.
- **Adding an extra:** follow "ADDING AN EXTRA" in `src/flags/flags.ts`. Each extra is tagged with `{...extraTag(id)}` and listed in `EXTRA_PAGES` (`e2e/extra-pages.ts`).
- **Accessibility and phones:** WCAG AA in every theme. No sideways scroll at 320 px; targets at least 24 px, and 44 px where possible; the composer stays above the keyboard; no hover-only controls.
- **Server Components:** pages and layouts stay Server Components.
- **Tool parts:** every `TOOL_PARTS` entry names its `placement` (`"inline"` or `"under"`), and an inline entry names `textBefore` (`"working-note"` for a lookup, `"prose"` otherwise). Code reads `placementOf(part)`, never a tool name.

## Data

- **Every query on user data** builds its `where` from the predicates in `src/accounts/owner-scope.ts`. Store functions take `owner: UserId` first, and a foreign id reads as not found. `src/accounts/owner-scope-coverage.test.ts` checks every export of the modules that touch user data, so a new export fails until it is called there with its queries checked, or allowed without an owner, with the reason.
- **Schema changes go only through migrations.** Change the tables in `src/db/tables/`, then `npm run db:generate`. Never edit `drizzle/meta/` by hand; on a merge conflict in it, regenerate.
- **Production applies migrations in its build,** before the new deployment goes live (`vercel-build` in `apps/web/package.json`), so the live build runs on the new schema for a few minutes. **A migration must work with the build that is live:** add tables and nullable or defaulted columns first; drop or rename something, or make it `NOT NULL`, only in a later change, once no merged code reads or writes the old form. Say in the PR which kind each migration is.

## Prompts and the AI SDK

- Prompt and persona texts say "the user" and "their", never "she" or "her".
- AI SDK 7: `streamText`'s `response` covers the last step only, so a follow-up call reads `result.responseMessages`. Text parts have no ids: group consecutive text parts, and key other parts by their own ids, such as `toolCallId`.

## Tests

- **Test-first:** Vitest for logic, Playwright for use cases. `npm run check` and `npm audit` (0 vulnerabilities) pass before every merge.
- **Use cases drive tests** (`use-cases-drive-tests`). Each e2e test is titled exactly by a `use_case_*` slug from `use-cases/`, or sits in `test.describe("<slug>")`. A case written before its test is listed in `PENDING_CASES` (`e2e/pending-cases.ts`); a case is tested or pending, never both. New behaviour gets a variation line in the area's `use-cases/*.md`. Whoever implements a use case writes its test.
- **A flake is a failure.** Fix the cause or the measurement; never rerun until it passes. A passing repeat adds no evidence, and no test may depend on timing.
- **The mock tutor:** e2e tests run against a non-production database with `TUTOR_MODEL=mock`, never against real Claude. Its commands (`/mock-tool`, `/mock-search`, `/mock-error` and the rest) are listed in `MOCK_COMMANDS` in `src/tutor/mock-script.ts`, each with its usage line.
- **The test database:** Postgres in Docker behind Neon's local proxy on port 4444 (`compose.test-db.yml`), configured by `.env.test` (copy `.env.test.example`). `npm run test:e2e` resets it from empty first. `checkTestEnvironment()` in `scripts/test-db/test-database.ts` refuses any database not on localhost. Two checkouts that run the tests at the same time each need their own database name and `E2E_PORT`.
- **Visual and phone checks:** see "Visual tests" in the README. An intended visual change commits its new baselines in the same commit. A new page gets a visual spec and an entry in `PHONE_PAGES` (`e2e/mobile.spec.ts`).
- **E2e helpers:** every test gets its own `account` and `testData` from `e2e/fixtures.ts`, deleted after the test; use them, and the shared helpers in `e2e/` (`chat-page.ts`, `log-in.ts`, `page-helpers.ts`, `sign-in-pages.ts`, `outbox.ts`, `viewports.ts`, `visual/visual-page.ts`), rather than writing a copy. Next's route announcer also has `role="alert"`, so find an alert inside its container (`alertIn` in `page-helpers.ts`) or by its text, never by `getByRole("alert")` alone.
- **Typing right after a goto:** WebKit hydrates a page well after the load event `page.goto` waits for, and text typed before then misses the form's state. Fill a field right after a goto with `fillWhenReady` from `page-helpers.ts` (or `sendMessage` in `chat-page.ts` for the composer), and call `waitForHydrated` before a click that needs the page's scripts.
- **Unit-test helpers** sit beside the code they fake, named `fake-*.ts`, `*-fixtures.ts` or `*-test-kit.ts`: for example `src/db/fake-neon-http.ts`, which runs the real Neon driver against a stubbed `fetch`.

## Secrets and production

- **Secrets** live in `.env` and `.env.local` (both ignored by git) and in Vercel. Never print a `.env*` file; read one variable with `node --env-file`, or check it's present with `grep -c`. Never copy a secret into code, docs, logs, issues or commits.
- **One Neon database** serves Production, Preview and Development. Never write test data to it. A production smoke test labels its data "(delete me)" and deletes it afterwards.
- **Deploys** run from a clean checkout and never with `--force`. Don't make Claude unavailable on purpose in a smoke test.
