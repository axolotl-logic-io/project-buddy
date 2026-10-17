# project-buddy

project-buddy is a personal Next.js site that teaches Blender, the open-source 3D creation suite.

Before changing the code, read `CONTRIBUTING.md` (the rules for code, tests and production) and the wiki's [Decisions](https://github.com/axolotl-logic/project-buddy/wiki/Decisions) pages (the design decisions and what they rejected). To read the wiki locally, clone it into `wiki/`, which git ignores: `git clone https://github.com/axolotl-logic/project-buddy.wiki.git wiki`. Remaining work is tracked in GitHub issues.

## Layout

The repo is a monorepo of npm workspaces with mise tasks ([`monorepo-layout`](https://github.com/axolotl-logic/project-buddy/wiki/Decisions-Code-and-tooling#monorepo-layout) in the wiki):

- `apps/web/`: the site, a Next.js app. Everything below describes it, and its paths are relative to this folder.
- `apps/issue-pipeline/`: the issue pipeline, which runs from an installed copy; see its `README.md`.
- The root holds the shared tooling (`package.json` with the workspaces, the one `package-lock.json`, `mise.toml`, `biome.jsonc`) and the top-level docs (`AGENTS.md`, `CONTRIBUTING.md`, this README).

## Development

Node is pinned to 24 in the root `mise.toml`. Run `mise install` once, then use mise shell activation or prefix commands with `mise exec --`. Install every workspace's dependencies once, at the root, with `npm ci`.

From anywhere in the repo, mise runs the site's tasks:

```bash
mise //apps/web:check    # npm run check
mise //apps/web:test:e2e # npm run test:e2e
mise //apps/web:build    # npm run build
mise //apps/web:dev      # npm run dev
mise //...:check         # check every app
```

Run the npm scripts in `apps/web/`, or add `--workspace apps/web` to run them from the root:

```bash
npm run dev          # start the dev server at http://localhost:3000
npm test             # run unit tests once (Vitest)
npm run test:watch   # run unit tests in watch mode
npm run test:scripts # test the workflows' shell scripts in .github/scripts (a stand-in curl, no network)
npm run test:e2e     # build, start and run end-to-end tests (Playwright, Chromium)
npm run lint         # lint with Biome; any warning fails the run
npm run typecheck    # type-check with tsc --noEmit
npm run format       # format with Biome (writes files)
npm run format:check # verify formatting without writing
npm run check        # biome check (lint, format, import order; warnings fail), typecheck, test:scripts, then test (jsdom, Chromium and WebKit); stops at the first failure
npm run build        # production build
npm run db:generate  # generate SQL migrations in drizzle/ from src/db/schema.ts
npm run db:migrate   # apply migrations to the database at DATABASE_URL
npm run manual:reindex # rebuild the Blender manual search index at DATABASE_URL
```

[Biome](https://biomejs.dev) lints and formats the code; its settings are split across two files: the root `biome.jsonc` holds the policy for the whole repo, and `apps/web/biome.jsonc` extends it with the site's scoped overrides, whose globs are relative to `apps/web/`. `npx biome check` gives the same result at the root or in `apps/web/`. Tailwind class order is checked by the lint rule `useSortedClasses`, not by the formatter, so `npm run format` does not sort classes. To apply the sort, run `npx biome lint --write --unsafe --only=nursery/useSortedClasses`. The editor extension is listed in `.vscode/extensions.json`. Run `npm run check` before committing.

### Database

The app uses Neon Postgres through [Drizzle ORM](https://orm.drizzle.team) and the Neon serverless HTTP driver. Each feature defines its tables in `src/db/tables/`, re-exported from `src/db/schema.ts`, and server code gets the client from `getDb()` in `src/db/client.ts`. Both the app and drizzle-kit read `DATABASE_URL`; see `.env.example`. Put it in `apps/web/.env.local`, which git ignores, or run `vercel env pull .env.local` in `apps/web/` once the Vercel project is linked. `.env.test`, which the e2e tests read, lives in `apps/web/` too. `npm run db:generate` works without `DATABASE_URL`; `npm run db:migrate` needs it.

### Branches and deploys

Every pull request targets `integration`, not `main`. `main` is what production runs, and only `scripts/deploy.sh` moves it.

1. **A PR merges into `integration`.** The workflow `.github/workflows/integration.yml` builds the new head as a Vercel preview (`vercel deploy`, Preview environment variables) and runs the smoke test against it. It never migrates, because previews share the production database, so a preview of code that needs a pending migration may fail on the pages that read it. A failed preview opens or comments on an issue titled `Integration preview failed: <short sha>`, labelled `ops`. The workflow needs the repo secret `VERCEL_AUTOMATION_BYPASS_SECRET` to pass Vercel's Deployment Protection, as well as the release's Vercel secret and variables.
2. **`scripts/deploy.sh [--dry-run] [<commit>]` releases a tested commit.** It takes the head of `integration` unless you name another commit on it, checks that its Integration preview passed and that `main` fast-forwards to it, lists what will ship, fast-forwards `main` (never a force-push), and opens a deploy ticket. A fix pushed straight to `main` must be merged back into `integration` first, or the script stops.
3. **The deploy ticket starts the release** described below.

Production is released, and migrated, by the GitHub Actions workflow `.github/workflows/release.yml`, never automatically. To release, run `scripts/deploy.sh`, or open a deploy ticket by hand: an issue labelled `deploy` (or add the label to an open issue). The workflow releases the head of `main`, comments the result on the ticket and closes it when the release passes its smoke test. Only someone with write access can start one. It builds on Vercel without going live (`vercel deploy --prod --skip-domain`), applies the pending migrations with `drizzle-kit migrate` while the previous build is still live, makes the new build live (`vercel promote`), and smoke-tests `https://project-buddy-rust.vercel.app` with `apps/web/scripts/release/smoke.ts`. Vercel's own Git deployments are off for every branch, previews included (`apps/web/vercel.json`), and no build migrates. The workflow needs the repo secrets `VERCEL_TOKEN` and `PRODUCTION_DATABASE_URL` and the repo variables `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID`.

You can also run the Release workflow by hand (`workflow_dispatch`) from the Actions tab. When a step fails, the workflow opens an issue titled `Production release failed: <short sha>`, labelled `ops`, or comments on the one already open, and comments on the deploy ticket, which stays open. It names the failed step, the commit, the deployment and the run. If the build or the migration failed, production is still on the previous build; if going live or the smoke test failed, the new build may be live and is not working. A Vercel rollback (`vercel rollback`, or the dashboard) restores the previous code but never the schema.

### Tutor chats

A project has many chats; each chat has one project and one buddy, both fixed when it starts. The tables live in `src/db/tables/projects-and-chats.ts`. `src/app/api/chat/route.ts` hands each new message to `replyToChat` in `src/tutor/reply.ts`, which streams Claude's reply through the Vercel AI SDK and saves both messages. The model is chosen once in `src/tutor/model.ts`, with the API key that `src/env.ts` reads from `ANTHROPIC_API_KEY`, and `src/tutor/system-prompt.ts` builds the system prompt, including the persona prompt. Set `TUTOR_MODEL=mock` to use a deterministic mock model instead of Claude, as the tests do; see `.env.example`.

### Errors

`src/errors/app-error.ts` sorts every failure of a call to Anthropic or Neon into an `AppErrorCase`, such as `out-of-credits` or `database-unreachable`. The stores, the rate limits and `searchManual` run their queries through `withAppErrors`. The chat route passes model errors, including those that arrive mid-stream, to `toAppError`. `toAppError` logs the original error with its case, status, upstream message and request id, and this log line is what appears in the Vercel logs as `[app-error] <case> in <operation>`. The browser receives only the case and shows that case's fixed message, never the upstream text.

### Invite code

Only invited people can make an account: the sign-up page (`src/app/signup/`) asks for the invite code, which `checkInviteCode` in `src/auth/invite-code.ts` checks against `INVITE_CODE`, and an email address. Everyone signs in by an emailed link (`src/accounts/login-links.ts`), from the sign-in page or straight after signing up; a link works for 30 minutes, and continuing on the page it opens sets an HTTP-only `session` cookie signed with `SESSION_SECRET`, valid for 30 days. `src/proxy.ts` (Next.js Proxy, formerly Middleware) admits only the sign-in page, the sign-up page and `/login/link` without a session: other pages redirect to `/login`, and `/api/*` routes answer 401.

`src/accounts/rate-limits.ts` holds the limits, counted in the `rate_limits` table under the HMAC of each address, never the address itself. One connection (its first `x-forwarded-for` address) may ask for 3 links to one address in 15 minutes, and 20 links in an hour in all; one address gets at most 10 links in 15 minutes from every connection together. A connection that enters 5 wrong invite codes within 15 minutes of its first is locked out of signing up until those 15 minutes end; the right code resets its count. The page's answer is the same within or past a limit. Set `INVITE_CODE`, `SESSION_SECRET`, `RESEND_API_KEY` and `EMAIL_FROM_ADDRESS` (the bare sender address, on a domain verified in Resend; email shows it under Hippy's name) in `.env.local` and in the Vercel project; see `.env.example`. Signing up and signing in need `DATABASE_URL` too.

### Manual index

The tutor searches the Blender Reference Manual through the `manual_sections` table. `npm run manual:reindex` makes a shallow `git clone` of the manual's latest stable release branch into a temporary directory, splits every RST file under `manual/` into one section per heading, and replaces the table's contents in one transaction. It reads `DATABASE_URL` from the environment or `.env.local`, and the table must already exist (`npm run db:migrate`). Each section links to `https://docs.blender.org/manual/en/latest/<path>.html#<anchor>`, with the anchor Sphinx gives the heading. `searchManual()` in `src/manual/search-manual.ts` queries the index.

When a new stable Blender release ships, set `MANUAL_BRANCH` in `src/manual/manual-source.ts` to its release branch, such as `blender-v5.4-release`, and run `npm run manual:reindex`.

The script runs under Node's built-in TypeScript support, so modules it imports use relative imports with a `.ts` extension instead of the `@/` alias.

### Tests

Unit tests live next to the code in `src/` as `*.test.tsx` and run with Vitest under jsdom. Browser tests, `src/**/*.browser.test.tsx`, run with Vitest in headless Chromium and WebKit through Playwright; `npm test` runs both. End-to-end tests live in `e2e/` as `*.spec.ts` and run with Playwright. Each runner ignores the other's directory. End-to-end tests cover only visual regressions and the auth workflows (`e2e-visual-and-auth-only`). Every other use case is tested in Vitest: by a server test against the test database if it needs a real server or database, and otherwise by a component or browser test. Server tests are `src/**/*.server.test.ts`, run with Vitest in Node by `npm run test:server`, which resets the test database in `.env.test` first and needs Docker; `npm run test:e2e` runs them before Playwright, and `npm test` never does. They make their users, data and sessions with the kit in `src/test-database/`, described in `apps/web/AGENTS.md`.

Before the first `npm run check` or e2e run, install the browsers once with `npx playwright install chromium webkit`. `npm run test:e2e` runs `npm run build && npm run start` on port 3000. Outside CI it reuses a server that is already running on that port, so stop `npm run dev` first if you want to test the production build. `npm run check` does not run e2e tests, to stay fast.

### Visual tests

The visual Playwright projects, in `e2e/visual/`, screenshot every page and compare each shot with its baseline in the spec's `<spec>.spec.ts-snapshots/` folder:

- **`visual`** (Desktop Chrome): every theme, under Light and Dark, at 1280 and 390 px wide, named `<page>-<theme>-<mode>-<width>-darwin.png`.
- **`visual-iphone-15`** (WebKit) and **`visual-pixel-7`** (Chromium): the default theme, Gravy Falls, under Light and Dark, on each phone as Playwright emulates it (screen, pixel ratio, touch and user agent), named `<page>-gravy-falls-<mode>-<device>-darwin.png`. The devices are listed in `e2e/visual/shot-devices.ts`. Install WebKit once with `npx playwright install webkit`.

`npm run test:e2e` runs them beside the other projects, in parallel, since each test has its own account and no visual test writes anything another test reads; `npm run test:visual` runs only them. A failure writes the expected, actual and diff images to `test-results/`.

Each spec says how to reach its page with fixed data and which parts change between runs, such as dates; `e2e/visual/visual-page.ts` takes the shots:

- **Signed in by cookie:** a signed-in page's shots start with a session cookie made in the test rather than through the login form, and without `Secure`, because WebKit drops `Secure` cookies on `http://localhost`. The login form is tested in the `chromium` project.
- **Settled:** a shot waits until nothing on the page is `aria-busy="true"`, such as a loading skeleton, and until the fonts have loaded. Then `e2e/visual/fit-screen.ts` makes the screen as tall as the page, reading the page's height only once it holds for two frames and trying again until two fits agree. Code blocks keep a stand-in height until they are first on screen.
- **Masked:** each changing part is covered by a box, and must be found on the page first, so a change to its text fails the test instead of leaving a date in the shot. Specs find those parts, and every element, by role and by text from the copy modules in `src/ui/copy/`, never by literal text.

Keeping the baselines:

- **A change meant to change how the site looks:** run `npm run test:visual:update`, which resets the test database and rewrites only the baselines that differ, look at the changed images, and commit them in the same commit as the change. A new page or state gets a spec in `e2e/visual/` and its baselines the same way. A new page also gets an entry in `PHONE_PAGES` in `src/app/phone-pages-test-kit.tsx`, from which `src/app/phone-pages.touch.browser.test.tsx` checks every page at 320 and 390 px wide, with touch, in every theme, for sideways scrolling and touch targets smaller than 24 px (`npm test`).
- **Baselines come from Chromium and WebKit on macOS** (the `-darwin` suffix), because fonts render differently on each platform. A run on Linux, such as in CI, would need its own baselines, made in Playwright's Docker image.
- **When two branches change the same baseline,** don't merge the images: the integration agent merges the code, runs `npm run test:visual:update` on the merged code, and commits the new baselines.
