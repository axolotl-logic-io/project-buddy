# project-buddy

project-buddy is a personal Next.js site where constructs help each user with their own projects and ideas, on any subject. Constructs use local commands to keep quest Tasks and Ideas. The [glossary](docs/GLOSSARY.md) defines the site's words.

Before changing the code, read `AGENTS.md`, which links the rules for code, tests and production in [project practices](docs/project-practices.md). Remaining work is tracked in GitHub issues. The issue pipeline in the [ecosystem repository](https://github.com/axolotl-logic-io/ecosystem) works them; its docs are in that repository's `docs/` folder.

## Layout

The repo is a monorepo of npm workspaces with mise tasks:

- `apps/web/`: the site, a Next.js app. Everything below describes it, and its paths are relative to this folder.
- `apps/instruction-counter/`: a pi-backed text-file measurement tool that emits one JSON line; see its `README.md`.
- `docs/`: domain reference, style guides, practices and operating notes, starting at `docs/README.md`.
- The root holds the shared tooling (`package.json` with the workspaces, the one `package-lock.json`, `mise.toml`, `biome.jsonc`) and the top-level docs (`AGENTS.md` and this README).

## Development

Install mise and Docker with its Compose plugin, and start the Docker engine. From the repository root, run:

```bash
mise trust
mise install
mise setup
mise //apps/web:dev
```

Setup stops a Next.js development server already running in this checkout before it reinstalls dependencies. To check the environment on its own, run `mise run doctor`. `mise doctor` is mise's own diagnostic command, not this repository's.

`mise setup` runs in this order: it installs dependencies, writes the local settings, starts the persistent development database server and gives this worktree its own database on it, then prepares the test environment (the test database server, this worktree's test database, and Playwright's browsers). It fills missing or empty local settings and keeps existing nonempty values, so repeat runs change nothing more.

If `apps/web/.env.local` names a hosted PostgreSQL database, setup keeps that file and writes the local database and missing defaults to `apps/web/.env.development.local`. Next.js development and the development commands use that override, so the hosted database is never contacted. Setup and doctor refuse any other effective database URL, including hosted databases and the test database. An explicit `DATABASE_URL` in the shell or `.env.development.local` takes precedence and must name this worktree's local database. Conflicting explicit settings are reported for you to fix.

Open `http://localhost:3000` and request a sign-up or sign-in link. With the generated configuration, emails appear as JSON files in `apps/web/test-results/dev-email-outbox/`. Open the link to continue. Local development needs no email service credentials.

To skip the email, run `mise run sign-in-link EMAIL`, where `EMAIL` is the address to sign in as. It prints a new 30-minute sign-in link. If no account has that address, it makes one, and the link asks for a name as sign-up does. Without `EMAIL`, it signs in the developer account, `developer@project-buddy.test`.

Each worktree has its own development database, named from its path, so one branch's migrations never reach another's. A database can still drift within a worktree, as when a rebase renumbers or edits a migration: Drizzle's migrator applies only migrations newer than the last one applied and skips the rest without an error. Setup compares the recorded migration hashes with the checkout before and after migrating. When they differ, it drops the database and migrates it afresh, so its data is lost. Setup resets only this worktree's own database on the local development server and refuses any other URL.

After setup, every test command runs with no further preparation. The test database is disposable, and the test server keeps its data in memory. After a restart, run `mise setup` again or `npm run test-db:up --workspace apps/web`. The test database commands read only `.env.test`.

Node is pinned to 24 in the root `mise.toml`. Use mise shell activation or prefix commands with `mise exec --`. Root tasks also work from subdirectories, as `mise //:setup` and `mise //:doctor`.

Three npm scripts check quality: `npm run lint` runs Biome and the type check, `npm test` runs every test but the end-to-end tests, and `npm run test:e2e` runs the end-to-end tests. From the repository root they run in every workspace, and in a workspace folder they run there alone. The mise tasks of the same names do the same, as `mise //:test` for every workspace or `mise //apps/web:test` for the site. Run `npm run lint` and `npm test` before committing. See [Tests](#tests) for what each runs.

[Biome](https://biomejs.dev) lints and formats the code. The root `biome.jsonc` holds the policy for the whole repository, and `apps/web/biome.jsonc` extends it with the site's scoped overrides, whose globs are relative to `apps/web/`. Tailwind class order is checked by the lint rule `useSortedClasses`, not by the formatter, so `npm run format` does not sort classes. To apply the sort, run `npx biome lint --write --unsafe --only=nursery/useSortedClasses`.

### Database

The app uses local PostgreSQL through the native `pg` driver, or hosted Neon through its HTTP driver, with [Drizzle ORM](https://orm.drizzle.team). Each feature defines its tables in `src/db/tables/`, and server code gets the client from `getDb()` in `src/db/client.ts`. Both the app and drizzle-kit read `DATABASE_URL`; see `.env.example`. Put it in `apps/web/.env.local`, which git ignores, or run `vercel env pull .env.local` in `apps/web/` once the Vercel project is linked with `npm run ops:link`. To look at production, use the `ops:*` scripts in [Reaching Vercel and production](docs/Site-Operations.md#reaching-vercel-and-production) instead. `npm run db:generate` works without `DATABASE_URL`; `npm run db:migrate` needs it.

`.env.test`, which the e2e and server tests read, also lives in `apps/web/`. The orchestrator provides it with the database and site port pinned to the lane. For a manual run, `npm run test-env:init` writes it, or copy `.env.test.example` by hand.

`mise setup` starts the persistent local development database and the worktree's database, and applies migrations. To start the server manually, run this command from `apps/web/`:

```bash
docker compose --file compose.dev-db.yml up --detach --wait
```

Then run `npm run dev:database` with this worktree's `DATABASE_URL`, which `mise setup` writes to `.env.local`, in the environment. Restart the development app after changing its database connection. A new worktree's database starts empty, and `mise run sign-in-link` makes the developer account the first time it signs in. The server's Docker volume keeps accounts and quests across container restarts, and `docker compose --file compose.dev-db.yml down` stops it while keeping data. It is separate from the disposable test database and the hosted database.

### Branches and deploys

To release production, merge a release PR from `integration` into `main` after the integration checks and preview pass. Reconcile any changes unique to `main` into `integration` first, preserving both branches' work. Never force-push either branch.

1. A push to `integration` builds a Vercel preview and runs signed-out smoke checks. It never migrates the shared production database. Code that needs a pending migration may fail on pages that read it. Check the Integration preview, Check and Full suite workflows for the integration commit before releasing.
2. Inspect pending migrations for compatibility with the live build, as [project practices](docs/project-practices.md#site-data) requires. Then merge the release PR into `main` after its required checks pass.
3. Each push to `main` automatically starts `.github/workflows/release.yml` for that push's exact commit. It builds without going live (`vercel deploy --prod --skip-domain`), migrates while the previous build is live, promotes through Vercel's REST API, and runs signed-out smoke checks against `https://project-buddy-rust.vercel.app`.

Releases share a concurrency group and never cancel a running release. GitHub keeps at most one pending run, replacing an older pending run with a newer one. Vercel Git deployments remain disabled for every branch (`apps/web/vercel.json`), and builds never migrate. The release needs secrets `VERCEL_TOKEN` and `PRODUCTION_DATABASE_URL` and variables `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID`. Previews also need `VERCEL_AUTOMATION_BYPASS_SECRET`.

A failed or cancelled release opens or updates an `ops` issue titled `Production release failed: <short sha>`, naming the step, commit, deployment and run. A preview failure opens or updates `Integration preview failed: <short sha>`. Fix failures through a PR, or rerun the failed workflow after an external cause is resolved. A failed build leaves production unchanged; a failed migration leaves the old build live but may have partially changed the schema. A promotion or smoke failure needs investigation because the schema has migrated and the new build may be live. A Vercel rollback restores code but never the schema.

### Local construct engine

The app makes no requests to AI model companies. A rite replies with one of its fixed templates, filled in with the rite's name, the space's words, the conjuration's text and the user's name. See [construct use cases](apps/web/use-cases/constructs.md) and [rite use cases](apps/web/use-cases/grimoire.md).

### Quests, spaces and performances

Quests at `/quests` is the signed-in landing page. Start a quest offers Dailies, Learn a thing, Make a thing and Do a thing. Each quest has spaces of murmlings, starting with Tasks and Ideas, and a record of its performances: rites performed on a space, where each conjuration adds a murmling and the rite replies. Its owner, or anyone already in it, can share it by inviting people as [members](docs/GLOSSARY.md#quest-member). Dailies continues the same quest each day. See [quest use cases](apps/web/use-cases/quests.md), [space use cases](apps/web/use-cases/spaces.md) and [performance use cases](apps/web/use-cases/performances.md).

Each starting point assigns its quest's construct, which speaks the rites' replies in its performances. Grimoire at `/grimoire` lists built-in and own rites. Profile at `/profile` holds the user's name and experience; Settings at `/settings` holds appearance and security.

Spaces and their murmlings are in `src/db/tables/spaces.ts`, and each change to a space is recorded in `space-changes.ts` so it can be undone. Rites, performances and conjurations are in `src/db/tables/performances.ts`. `conjure` in `src/performances/performance-store.ts` adds the conjuration's murmling, picks the rite's reply with `riteReply` in `src/rites/rite.ts`, and saves both in one transaction. The `/api/v1` routes under `src/app/api/v1/` serve the same stores to scripts and other programs; see the [API use cases](apps/web/use-cases/api.md).

### Errors

`src/errors/app-error.ts` sorts every failure of a call to Neon into an `AppErrorCase`, such as `database-unreachable`. The stores and the rate limits run their queries through `withAppErrors`. `toAppError` logs the original error with its case, status, upstream message and request id, and this log line is what appears in the Vercel logs as `[app-error] <case> in <operation>`. The browser receives only the case and shows that case's fixed message, never the upstream text.

### Sign-up and login

Anyone can sign up from `/login` or `/signup` by requesting an emailed link. For an address without an account, the site stores a hashed verification token in `signup_links`, without making an account. The link expires after 30 minutes; another request replaces it. Opening `/login/link` is read-only. Choosing Continue atomically consumes the verification link and creates an ordinary account. A new account enters a required Name first; the account and name are saved together only after validation. Confirmation signs the browser in for 30 days. Concurrent confirmations cannot create duplicate accounts. A storage failure preserves verification for retry.

Existing accounts receive reusable 30-minute sign-in links (`src/accounts/sign-in-links.ts`), including when they use Sign up. Confirmation sets an HTTP-only `session` cookie signed with `SESSION_SECRET`. The proxy admits `/login`, `/signup`, `/login/link`, `/credits`, `/timer` and every timer link without a session. Other pages redirect to `/login`, and protected API routes answer 401. Authorization also checks the stored session epoch. Signing out everywhere revokes both login and pending verification links for the account.

`src/accounts/rate-limits.ts` holds the limits, counted in the `rate_limits` table under the HMAC of each address, never the address itself. One connection (its first `x-forwarded-for` address) may ask for 3 links to one address in 15 minutes, and 20 links in an hour in all; one address gets at most 10 links in 15 minutes from every connection together. The page's answer is the same within or past a limit. Set `SESSION_SECRET`, `RESEND_API_KEY` and `EMAIL_FROM_ADDRESS` (the bare sender address, on a domain verified in Resend; email shows it under Vellum's name) in `.env.local` and in the Vercel project; see `.env.example`. Sign-up and login need `DATABASE_URL` too.

### Tests

Tests live in `test/<level>/`, under the path their subject has: `component/` for isolated components, `component-integration/` for components with real dependencies, and `system/` for the built program with fake external services. Shared kits live in `test/support/`. The commands, the stage each one runs and the rules for server and e2e tests are in [`apps/web/AGENTS.md`](apps/web/AGENTS.md).

In the site, `npm test` runs three stages in turn and stops at the first failure. Each stage is also its own script:

- `npm run test:unit` runs the shell script tests and two Vitest projects: `repository`, the filesystem guards in `**/*.test.{ts,mts}`, and `vite-integration`, the cheap in-process Vite guards. It needs no database, `.env.test` or browser.
- `npm run test:browser` runs the browser integrations, `test/component-integration/**/*.browser.test.tsx`, with Vitest in headless Chromium and WebKit on the host. It installs the browsers if they are missing.
- `npm run test:server` runs the server tests, `test/component-integration/**/*.server.test.ts`, with Vitest in Node against the test database, which it resets and migrates first. They make their users, data and sessions with the kit in `test/support/test-database/`.

`npm test` therefore needs `.env.test` and the running test database server, which `mise setup` prepares.

The end-to-end tests, `test/system/*.spec.ts`, run with Playwright and cover only the auth workflows (`e2e-auth-only`). `npm run test:e2e` resets and migrates the test database, builds the site, checks the built font URLs and starts the site on `E2E_PORT`. It never reuses a server already running there. `test/component-integration/use-cases/use-cases.test.ts` enforces `e2e-auth-only` against the auth cases in `use-cases/auth-cases.ts`.

Every other use case is tested in Vitest: by a server test if it needs a real server or database, and otherwise by a browser integration or feature-entrypoint test. Each runner ignores the other's directory.

Keep timeouts, concurrency, isolation, the local database fences and assertions unchanged. Do not report an unrun stage as passed. The instruction counter's fake-pi subprocess checks stay in its default gate and make no real-model calls.

### Orchestrator-owned local tests

The orchestrator provides `apps/web/.env.test`, with `DATABASE_URL` and `E2E_PORT` pinned to its assigned lane. `apps/web/scripts/test-env/setup.sh` validates `ISSUE_PIPELINE_LANE_SLOT=K` (1 to 399), starts the shared Docker test server, provisions or reuses database `pb_lane_K` on `127.0.0.1:5433`, and atomically publishes the file from the committed example with site port `20000+10K`. Setup does not reset existing lane data. Without a slot, it touches no container, database or `.env.test`.

Test commands only consume the supplied file. A missing `.env.test` is an error: there is no automatic copying, allocation or fallback to another database or port. Lane resources are reused and are not torn down when a test command exits. Separate active lanes have separate databases and site ports, so the orchestrator must not assign one lane to independent concurrent runs. Build artifacts in one checkout are not isolated.

For a manual run, `npm run test-env:init` in `apps/web` writes `.env.test` from the example with a database and site port derived from the worktree's path, and keeps any `.env.test` already there. Or copy the example by hand and configure a local test database and an unused site port. Then run `npm run test-db:up` to start the local server and `npm run test-db:reset` to create and migrate the configured database. Never share a manual database or port between simultaneous runs. The safety guards require localhost or 127.0.0.1, a safe database name (including `pb_lane_K`, never the server's own databases) and the file email outbox.

The shared server publishes PostgreSQL on `127.0.0.1:5433`. A locally installed PostgreSQL also works: set `DATABASE_URL` to its `localhost` or `127.0.0.1` address and port. The app also recognizes IPv6 loopback (`[::1]`), but destructive test commands still require localhost or 127.0.0.1.

To run one test file, pass it to its stage's script, for example `npm run test:e2e -- test/system/sign-in.spec.ts` or `npm run test:server -- FILE`, where `FILE` is the path of a server test.

The maintenance script `scripts/test-env/prune.sh` requires `ISSUE_PIPELINE_LANE_SLOTS=N`, a nonnegative whole count; zero prunes all identifiable lanes. It inventories the shared server before any removal and refuses uncertain inspection. It removes only canonical lane databases above N and leaves retained issue resources and other namespaces untouched. Do not run shared-server `test-db:down` while another checkout needs the server.

Keep one full web suite scheduled at a time. The repository scripts do not configure or install the pipeline's lane-slot, setup, prune or teardown wiring, and operator setup is separate. The installed issue pipeline is changed in the ecosystem repository. See [project practices](docs/project-practices.md). A flake is a failure.

### Phone and theme checks

A new page gets an entry in `PHONE_PAGES` in `apps/web/test/component-integration/app/phone-pages-test-kit.tsx`. The browser tests check every page at 320 and 390 px wide, with touch, in every theme, for sideways scrolling and touch targets smaller than 24 px (`npm run test:browser`).

The site offers three fixed textured appearances: Ivory Vellum, Soot & Brass, and Espresso Leather. Texture swatches in the site panel and Settings apply the choice immediately and remember it in this browser. The site never follows the system appearance. See [appearance use cases](apps/web/use-cases/appearance.md). Theme contract and contrast tests check the token definitions and WCAG AA color pairs.

### Review accounts

Three accounts in your worktree's development database show the site at different levels of use, for design reviews and screenshots:

- **Empty**, `review+empty@project-buddy.test`: a name and nothing else, for the empty states.
- **Typical**, `review+typical@project-buddy.test`: three quests, one of them completed, with tasks, ideas, Quick Notes and performances of its own rites, one of them replying in Markdown; three own rites; and about 45 experience, circle 4.
- **Crowded**, `review+crowded@project-buddy.test`: sixteen quests and fourteen own rites, with every name and text at its length limit, words too long to wrap, long conjurations, a reply in rich Markdown with a table and code, and long Tasks and Ideas spaces with Quick Notes.

To make the accounts, start the site with `mise //apps/web:dev`, then run this command from the repository root:

```sh
mise run review-data
```

The command deletes the three accounts, makes them again and prints a 30-minute sign-in link for each. To use other addresses, pass a base address, such as `mise run review-data me@example.test`, which gives `me+empty@example.test` and so on. The base address itself is never changed. If the site runs on another port, set `PROJECT_BUDDY_URL`, such as `PROJECT_BUDDY_URL=http://localhost:3210`.

The command refuses any database but your worktree's own development database, and any site address but `localhost`. It goes through the local site's API where it can. It deletes the accounts straight from the database, and saves the accounts' own rites through the rite store, because the API only reads rites. The content is in `apps/web/scripts/development/review-content.ts`.

### Visual comparison

The visual comparison screenshots each critical view of the site as the review accounts, in each appearance at each width. Given a folder of mockups, it also screenshots each view's mockup and writes a page that shows the two side by side.

To compare the site with mockups, make the review accounts first, then run this command from the repository root:

```sh
mise run visual-compare -- --mockups MOCKUPS
```

`MOCKUPS` is a folder of mockup pages named `<view>--<state>.html`, such as `quests--list.html`. Each page must show itself alone in the appearance and at the width given by `?bare&appearance=<appearance>&width=<width>`.

The command builds this worktree for production, starts it on a free port with your worktree's development database, takes the screenshots and stops the site. It writes them to `project-buddy-visual` in your temporary folder, or to `--out`: `site/` and `mockups/` hold the screenshots, `index.html` is the comparison page, `results.json` holds the same results for other tools, and `site.log` holds the site's output. It exits with an error if a view had a problem, such as a page error or a step that failed.

Run `mise run visual-compare -- --help` for the options. The default widths, `1280,360`, leave out the 320 px width that [the site's agent rules](apps/web/AGENTS.md) ask for, so add it with `--widths 1280,360,320`. `--dev` starts the development server, and a worktree runs one at a time, so stop your own first.

The views are in `apps/web/scripts/visual/views.ts`. Each one names its view and state, its review account, its page and the Playwright steps that bring it to its state. To add a view, add an entry there.

### Visual baseline

The visual baseline measures the site so runs can be compared. It loads each view marked `measure` in `apps/web/scripts/visual/views.ts` as the typical review account, or signed out, in each appearance at each width. For each load it records the bytes transferred by resource type, the font files fetched, Largest Contentful Paint (LCP), Cumulative Layout Shift (CLS) and the accessibility violations [axe](https://github.com/dequelabs/axe-core) finds. It also brings every other view to its state and scans it with axe.

Make the review accounts first, then run this command from the repository root:

```sh
mise run visual-baseline -- --out OUT
```

The command builds this worktree for production, starts it on a free port with your worktree's development database, measures and stops the site. It writes `baseline.json` (every figure) and `summary.md` (the findings and a table of every load) to `OUT`, or to `project-buddy-baseline` in your temporary folder.

Each load uses a fresh browser with an empty cache, after one unmeasured request that lets the site compile and warm up. Nothing is throttled, so LCP and CLS are this computer's: compare them between runs on the same computer, not with field data. Transfer sizes are bytes on the wire, headers included. Measure a production build, because `--dev` sizes are much larger.

It takes the same options as the visual comparison, except `--mockups`; run `mise run visual-baseline -- --help` for the list.

## Installed app

Project Buddy installs on a phone's Home Screen from the browser: Chrome on Android offers **Install app**, and Safari on an iPhone offers **Add to Home Screen** in the Share menu. The web app manifest is `apps/web/src/app/manifest.ts`, with icons in `apps/web/public/icons/`.

See [installed app use cases](apps/web/use-cases/notifications.md) for Home Screen installation.
