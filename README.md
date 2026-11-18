# project-buddy

project-buddy is a personal Next.js site where constructs help each user with their own projects and ideas, on any subject. Constructs use local commands to keep quest Tasks and Ideas. The [glossary](GLOSSARY.md) defines the site's words.

Before changing the code, read `AGENTS.md`, which links the rules for code, tests and production in [project practices](docs/project-practices.md). Remaining work is tracked in GitHub issues. The issue pipeline in the [ecosystem repository](https://github.com/axolotl-logic-io/ecosystem) works them; its docs are in that repository's `docs/` folder.

## Layout

The repo is a monorepo of npm workspaces with mise tasks:

- `apps/web/`: the site, a Next.js app. Everything below describes it, and its paths are relative to this folder.
- `apps/cli/`: `project-buddy`, a command-line client for the site's `/api/v1` routes that writes JSONL; run `project-buddy --help` for its commands.
- `apps/instruction-counter/`: a pi-backed text-file measurement tool that emits one JSON line; see its `README.md`.
- `docs/`: product scope, practices and operating notes, starting at `docs/README.md`.
- The root holds the shared tooling (`package.json` with the workspaces, the one `package-lock.json`, `mise.toml`, `biome.jsonc`) and the top-level docs (`AGENTS.md` and this README).

## Development

Install mise and Docker with its Compose plugin, and start the Docker engine. From the repository root, run:

```bash
mise trust
mise install
mise setup
mise run doctor
mise //apps/web:dev
```

`mise setup` installs every workspace's dependencies with `npm ci`, creates `apps/web/.env.local` with a generated session secret and the local email outbox, starts the persistent development database server, gives this worktree its own database on it and brings that database to this checkout's migrations, writes a CLI session for a local developer account to `apps/cli/.env.local`, initializes manual test configuration with `test-env:init`, starts the test database server, creates and migrates this worktree's test database, and installs Playwright's Chromium and WebKit. It fills missing or empty local settings, preserves existing nonempty values, and makes no further configuration changes on repeat runs. It keeps development data unless the database's migrations differ from the checkout's, as below. If `apps/web/.env.local` names a hosted PostgreSQL database, setup preserves that file and adds the local database and missing defaults to `apps/web/.env.development.local`. Next.js development and the development commands use this override; the hosted database is never contacted. Existing effective development configuration must use this worktree's development database and the email outbox; a `.env.local` that still names the database every worktree once shared, `project_buddy_dev`, is switched to the worktree's own, and the shared database is left as it is; conflicting explicit settings are reported for you to fix. Setup and doctor refuse other effective database URLs, including hosted databases and the test database. An explicit `DATABASE_URL` in the shell or `.env.development.local` takes precedence and must name this worktree's local database.

Open `http://localhost:3000` and request a sign-up or sign-in link. With the generated configuration, emails appear as JSON files in `apps/web/test-results/dev-email-outbox/`. Open the link to continue.

To skip the email, run `mise run sign-in-link EMAIL`, where `EMAIL` is the address to sign in as. It prints a new 30-minute sign-in link. If no account has that address, it makes one, and the link asks for a name as sign-up does. Without `EMAIL`, it signs in the developer account, `developer@project-buddy.test`. Local development needs no email service credentials.

With the site running, `project-buddy` works with no further setup. The root `mise.toml` puts it on the PATH and loads `PROJECT_BUDDY_SESSION` from `apps/cli/.env.local`, so each command acts as the account `developer@project-buddy.test`. To check, run `project-buddy whoami`. To see that account's data in a browser, sign in as it through the email outbox. Setup renews the session when it has a week or less left, and doctor reports when it needs renewing.

`mise doctor` is mise’s built-in diagnostic command. Use `mise run doctor` for this repository’s checks. It checks Node, npm, Docker, Compose, workspace dependencies, effective development configuration, database connectivity, migration hashes and the CLI session. It changes no configuration or database data and exits nonzero when a check fails. Each failure includes a repair command or setting. It does not run tests or prove that the application builds. Database-dependent checks are skipped when dependencies or configuration are missing. If recorded migration hashes differ from this checkout, doctor reports the drift.

Each worktree has its own development database, named from its path, so one branch's migrations never reach another's. A database can still drift within a worktree, as when a rebase renumbers or edits a migration. Drizzle's migrator applies only migrations newer than the last one applied, so it skips the rest without an error. Setup checks the recorded hashes before and after migrating, and when they differ from the checkout it drops the database and migrates it afresh, then makes the developer account again. Its data is lost. Setup resets only this worktree's own database on the local development server; it refuses any other URL.

After setup, every test command below runs with no further preparation. The test database is disposable: setup resets it, as `test:server` does, and the test server keeps its data in memory, so after a restart run `mise setup` again or `npm run test-db:up --workspace apps/web`. The test database commands read only `.env.test`; setup keeps the development settings away from them. Database and browser tests remain separate from the fast default checks.

Node is pinned to 24 in the root `mise.toml`. Use mise shell activation or prefix commands with `mise exec --`. To install dependencies manually, run `npm ci` at the repository root. Root setup and doctor tasks also work from subdirectories with `mise //:setup` and `mise //:doctor`.

From anywhere in the repo, mise runs the site's tasks:

```bash
mise //apps/web:check       # fast default: lint, types, shell checks, repository and Vite guards
mise //apps/web:test:vite   # focused subset: six default in-process Vite guards
mise //apps/web:test:browser # opt in: Chromium/WebKit integrations
mise //apps/web:test:integration # opt in: guards, Vite and every browser project
mise //apps/web:test:server # npm run test:server
mise //apps/web:test:e2e    # npm run test:e2e
mise //apps/web:build       # npm run build
mise //apps/web:dev         # npm run dev
mise //...:check            # check every app
```

Run the npm scripts in `apps/web/`, or add `--workspace apps/web` to run them from the root:

```bash
npm run dev          # start the dev server at http://localhost:3000
npm test             # fast default: repository/filesystem and six cheap Vite guards (Vitest)
npm run test:watch   # watch those same two guard projects
npm run test:vite    # focused subset: six default in-process Vite guards
npm run test:browser # opt in: browser integrations, including zones and touch
npm run test:integration # opt in: all guards, Vite and browser integrations
npm run test:server  # reset the test database and run the server tests (needs Docker)
npm run test:scripts # test workflow and lane shell scripts (fake curl/Docker, no network or database)
npm run test:e2e     # run the server tests, then build, start and run end-to-end tests (Playwright)
npm run lint         # lint with Biome; any warning fails the run
npm run typecheck    # type-check with tsc --noEmit
npm run format       # format with Biome (writes files)
npm run format:check # verify formatting without writing
npm run check        # fast default: Biome, typecheck, test:scripts, repository and Vite guards; stops at the first failure
npm run build        # production build
npm run db:generate  # generate SQL migrations in drizzle/ from src/db/tables/
npm run db:migrate   # apply migrations to the database at DATABASE_URL
```

[Biome](https://biomejs.dev) lints and formats the code; its settings are split across two files: the root `biome.jsonc` holds the policy for the whole repo, and `apps/web/biome.jsonc` extends it with the site's scoped overrides, whose globs are relative to `apps/web/`. `npx biome check` gives the same result at the root or in `apps/web/`. Tailwind class order is checked by the lint rule `useSortedClasses`, not by the formatter, so `npm run format` does not sort classes. To apply the sort, run `npx biome lint --write --unsafe --only=nursery/useSortedClasses`. The editor extension is listed in `.vscode/extensions.json`. Run `npm run check` before committing.

### Database

The app uses local PostgreSQL through the native `pg` driver, or hosted Neon through its HTTP driver, with [Drizzle ORM](https://orm.drizzle.team). Each feature defines its tables in `src/db/tables/`, which `drizzle.config.ts` names as the schema, and server code gets the client from `getDb()` in `src/db/client.ts`. Both the app and drizzle-kit read `DATABASE_URL`; see `.env.example`. Put it in `apps/web/.env.local`, which git ignores, or run `vercel env pull .env.local` in `apps/web/` once the Vercel project is linked with `npm run ops:link`. To look at production, use the `ops:*` scripts in [Reaching Vercel and production](docs/Site-Operations.md#reaching-vercel-and-production) instead. `.env.test`, which the e2e and server tests read, lives in `apps/web/` too: the orchestrator provides it with the database and site port pinned to the lane, or a developer runs `npm run test-env:init` (or copies `.env.test.example` by hand) for a manual run. `npm run db:generate` works without `DATABASE_URL`; `npm run db:migrate` needs it.

For a persistent local development database, `mise setup` handles startup, the worktree's database and migrations. To start it manually, run this command from `apps/web/`:

```bash
docker compose --file compose.dev-db.yml up --detach --wait
```

Then run `npm run dev:database` with this worktree's `DATABASE_URL`, which `mise setup` writes to `.env.local`, in the environment. Restart the development app after changing its database connection. A new worktree's database starts with only the developer account. The server's Docker volume preserves accounts and quests across container restarts. `docker compose --file compose.dev-db.yml down` stops it while keeping data. It is separate from the disposable test database and the hosted database.


### Branches and deploys

To release production, merge a release PR from `integration` into `main` after the integration checks and preview pass. Reconcile any changes unique to `main` into `integration` first, preserving both branches' work. Never force-push either branch.

1. A push to `integration` builds a Vercel preview and runs signed-out smoke checks. It never migrates the shared production database. Code that needs a pending migration may fail on pages that read it. Check the Integration preview, Check and Full suite workflows for the integration commit before releasing.
2. Inspect pending migrations for compatibility with the live build, as [project practices](docs/project-practices.md#site-data) requires. Then merge the release PR into `main` after its required checks pass.
3. Each push to `main` automatically starts `.github/workflows/release.yml` for that push's exact commit. It builds without going live (`vercel deploy --prod --skip-domain`), migrates while the previous build is live, promotes through Vercel's REST API, and runs signed-out smoke checks against `https://project-buddy-rust.vercel.app`.

Releases share a concurrency group and never cancel a running release. GitHub keeps at most one pending run, replacing an older pending run with a newer one. Vercel Git deployments remain disabled for every branch (`apps/web/vercel.json`), and builds never migrate. The release needs secrets `VERCEL_TOKEN` and `PRODUCTION_DATABASE_URL` and variables `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID`. Previews also need `VERCEL_AUTOMATION_BYPASS_SECRET`.

A failed or cancelled release opens or updates an `ops` issue titled `Production release failed: <short sha>`, naming the step, commit, deployment and run. A preview failure opens or updates `Integration preview failed: <short sha>`. Fix failures through a PR, or rerun the failed workflow after an external cause is resolved. A failed build leaves production unchanged; a failed migration leaves the old build live but may have partially changed the schema. A promotion or smoke failure needs investigation because the schema has migrated and the new build may be live. A Vercel rollback restores code but never the schema.

### Local construct engine

The app makes no requests to AI model companies. Constructs use deterministic commands inspired by multi-user dungeons (MUDs): `help`, `look`, `exp` and `cast <spell id>`. The conversation UI, streamed replies, tool parts, storage and access checks use the existing harness. See [local construct behavior and limits](docs/local-constructs.md).

### Quests and conversations

Quests at `/quests` is the signed-in landing page. Start a quest offers Dailies, Learn a thing, Make a thing and Do a thing. Each quest has one continuing conversation, a Tasks, Ideas, Quick Notes and a Progress timeline, which its owner, or anyone already in it, can share by inviting people as [members](docs/multi-user-quests.md). Dailies continues the same quest each day. See [quests and conversations](docs/chats.md), [premade quests](docs/premade-quests.md) and [Progress](docs/progress-timeline.md).

Each starting point assigns the construct for its quest's conversation. Spellbook at `/spellbook` lists built-in and own spells with search and source filters. Custom constructs are no longer editable; existing quest snapshots remain intact. Profile at `/profile` holds the user's name and experience; Settings at `/settings` holds appearance and security.

Conversation storage uses `quests`, `chats` and `messages` in `src/db/tables/quests-and-chats.ts`. `src/app/api/chat/route.ts` passes each new message to `replyToChat` in `src/replies/reply.ts`, which streams the construct's reply through the Vercel AI SDK and saves the exchange. `src/replies/model.ts` selects the local command engine, and `src/env.ts` reads its configuration. `src/replies/system-prompt.ts` assembles the global prompt, the construct, and the quest's Tasks and recent milestones. Constructs always run the local command engine; there is no model mode setting. Tests exercise local commands and tool handlers directly.

### Errors

`src/errors/app-error.ts` sorts every failure of a call to Anthropic or Neon into an `AppErrorCase`, such as `out-of-credits` or `database-unreachable`. The stores, the rate limits run their queries through `withAppErrors`. The conversation route passes model errors, including those that arrive mid-stream, to `toAppError`. `toAppError` logs the original error with its case, status, upstream message and request id, and this log line is what appears in the Vercel logs as `[app-error] <case> in <operation>`. The browser receives only the case and shows that case's fixed message, never the upstream text.

### Sign-up and login

Anyone can sign up from `/login` or `/signup` by requesting an emailed link. For an address without an account, the site stores a hashed verification token in `signup_links`, without making an account. The link expires after 30 minutes; another request replaces it. Opening `/login/link` is read-only. Choosing Continue atomically consumes the verification link and creates an ordinary account. A new account enters a required Name first; the account and name are saved together only after validation. Confirmation signs the browser in for 30 days. Concurrent confirmations cannot create duplicate accounts. A storage failure preserves verification for retry.

Existing accounts receive reusable 30-minute sign-in links (`src/accounts/sign-in-links.ts`), including when they use Sign up. Confirmation sets an HTTP-only `session` cookie signed with `SESSION_SECRET`. The proxy admits `/login`, `/signup`, `/login/link`, `/credits`, `/timer` and every timer link without a session. Other pages redirect to `/login`, and protected API routes answer 401. Authorization also checks the stored session epoch. Signing out everywhere revokes both login and pending verification links for the account.

`src/accounts/rate-limits.ts` holds the limits, counted in the `rate_limits` table under the HMAC of each address, never the address itself. One connection (its first `x-forwarded-for` address) may ask for 3 links to one address in 15 minutes, and 20 links in an hour in all; one address gets at most 10 links in 15 minutes from every connection together. The page's answer is the same within or past a limit. Set `SESSION_SECRET`, `RESEND_API_KEY` and `EMAIL_FROM_ADDRESS` (the bare sender address, on a domain verified in Resend; email shows it under Vellum's name) in `.env.local` and in the Vercel project; see `.env.example`. Sign-up and login need `DATABASE_URL` too.

### Tests

Tests live in `test/<level>/`, under the path their subject has: `component/` for isolated components, `component-integration/` for components with real dependencies, and `system/` for the built program with fake external services. Shared kits live in `test/support/`. `npm test` selects both Node projects: `repository` for filesystem guards in `**/*.test.{ts,mts}`, and `vite-integration` for the six in-process Vite guards. Server, browser and e2e tests remain excluded from the default. `npm run test:vite` selects just the six Vite guards; a focused run took 1.62 seconds together, so they stay in the fast default despite the integration label. Browser integrations, `test/component-integration/**/*.browser.test.tsx`, run with Vitest in headless Chromium and WebKit through Playwright, explicitly selected by `npm run test:browser`. Browser-mode component integrations and feature-entrypoint tests are valid without a whole application flow. End-to-end tests live in `test/system/` as `*.spec.ts` and run with Playwright. Each runner ignores the other's directory. End-to-end tests cover only the auth workflows (`e2e-auth-only`), which `apps/web/test/component-integration/use-cases/use-cases.test.ts` enforces against the auth cases in `apps/web/use-cases/auth-cases.ts`. Every other use case is tested in Vitest: by a server test against the test database if it needs a real server or database, and otherwise by a browser integration or feature-entrypoint test. Server tests are `test/component-integration/**/*.server.test.ts`, run with Vitest in Node by `npm run test:server`, which needs Docker. It resets and migrates the local database configured in the supplied `.env.test` first and keeps the reusable database afterwards; `npm run test:e2e` runs them before Playwright, and `npm test` never does. They make their users, data and sessions with the kit in `test/support/test-database/`, described in `apps/web/AGENTS.md`.

Every test browser runs on the host; no test command starts Docker for browsers. `npm run test:browser` and `test:integration` first install the Playwright version's browsers if they are missing (`npm run browsers:install`), and the e2e tests use the same browsers. The fast default needs neither browsers nor `.env.test`. `npm run test:e2e` builds the site, checks the built font URLs and starts it on the configured `E2E_PORT`; it never reuses a server already running there.

The fast default keeps costly stages off by default, not deleted or skipped. `npm run check` keeps lint, types, deterministic shell safety checks and all repository guards, including the use-case guard, plus all six cheap Vite guards. A fast pass would not establish browser behavior, database isolation, build/font correctness or auth e2e behavior.

| Test selection | Cost and prerequisite |
| --- | --- |
| `npm test` / `npm run test:watch` | Default: repository plus Vite guards. The six Vite guards took 1.62 seconds together; no database, `.env.test` or browser binary. |
| `npm run test:vite` | Focused subset of the default, not a costly opt-in: those same six in-process Vite guards. |
| `npm run test:browser` (opt-in) | Chromium/WebKit on the host, with each zone and touch project; installs the browsers if they are missing. |
| `npm run test:integration` (opt-in) | Broad Vitest suite: guards, Vite and all browser instances; not server/e2e. |
| `npm run test:server` (opt-in) | Resets/migrates the supplied isolated database before testing. |
| `npm run test:e2e` (opt-in) | Server tests, production build/font check and Playwright; database, site port and Docker required. |

Keep timeout, concurrency, isolation, local database fences and assertions unchanged. Optimize retained slow-stage timing separately, or schedule these tasks in an explicitly authorized integration stage. Keep cheap guards in the default gate; do not mark unrun stages passed. The instruction counter's cheap fake-pi subprocess checks remain in its default gate; they make no real-model calls.

### Orchestrator-owned local tests

The orchestrator provides `apps/web/.env.test`, with `DATABASE_URL` and `E2E_PORT` pinned to its assigned lane. `apps/web/scripts/test-env/setup.sh` validates `ISSUE_PIPELINE_LANE_SLOT=K` (1–399), starts the shared Docker test server, provisions/reuses database `pb_lane_K` on `127.0.0.1:5433`, and atomically publishes the file from the committed example with site port `20000+10K`. Existing lane data is not reset by setup. Without a slot, setup touches no container, database or `.env.test`.

Test commands only consume the supplied file. A missing `.env.test` is an error: no automatic copying, allocation or fallback to another database/port. Lane resources are reusable and are not torn down on a test command's exit. Separate active lanes have separate databases and site ports; the orchestrator must not assign the same lane to independent concurrent runs. Build artifacts in one checkout are not isolated.

For a **manual run**, `npm run test-env:init` in `apps/web` writes `apps/web/.env.test` from the example with a database and site port derived from the worktree's path, one database per worktree, and keeps any `.env.test` already there. Or copy the example by hand and configure a local test database and an unused site port. From `apps/web`, run `npm run test-db:up` to start the local server, then `npm run test-db:reset` to create/migrate that configured database. Never share a manual database or port between simultaneous runs. Safety guards require localhost/127.0.0.1, safe database names (including `pb_lane_K`, never the server's own databases), the file email outbox.

The shared server publishes native PostgreSQL on `127.0.0.1:5433`. App queries reuse a bounded connection pool. A locally installed PostgreSQL also works: set `DATABASE_URL` to its `localhost` or `127.0.0.1` address and port. The app also recognizes IPv6 loopback (`[::1]`); destructive test commands still require localhost or 127.0.0.1.

Changes to the installed issue pipeline belong in the ecosystem repository.

- `npm run test:server` resets/migrates the supplied database, then runs Vitest server tests.
- `npm run test:playwright -- <file>` runs one e2e file **without server tests**, using that database and site port. For example: `npm run test:playwright -- test/system/sign-in.spec.ts`. Its database must already be migrated.
- `npm run test:e2e` runs `test:server` followed by `test:playwright` only on success, both with the same configured environment.
- `npm run test:scripts` includes deterministic lane tests using `fake-docker.sh` on PATH; no real Docker or database is used.

Explicit maintenance `scripts/test-env/prune.sh` requires `ISSUE_PIPELINE_LANE_SLOTS=N` (nonnegative whole count; zero prunes all identifiable lanes). It inventories the shared server before any removal and refuses uncertain inspection. Only canonical lane databases above N may be removed; retained issue resources and other namespaces are untouched. Names, shared container/network and port formulas live in `lanes.sh`. Do not run shared-server `test-db:down` while another checkout needs it.

**Keep one full web suite scheduled at a time until this change is accepted and operator setup is separately made compatible.** Merging repository scripts does not configure or install the pipeline's laneSlots, setup/prune/teardown wiring, nor authorize removal of retained resources. Operator setup remains separate. See [Project practices](docs/project-practices.md). Fix failures before rerunning; a flake is a failure.

### Phone and theme checks

A new page gets an entry in `PHONE_PAGES` in `apps/web/test/component-integration/app/phone-pages-test-kit.tsx`. The browser tests check every page at 320 and 390 px wide, with touch, in every theme, for sideways scrolling and touch targets smaller than 24 px (`npm run test:browser`).

The site offers three fixed textured appearances: Ivory Vellum, Soot & Brass, and Espresso Leather. Texture swatches in the site panel and Settings apply the choice immediately and remember it in this browser. There is no system-following appearance. See [Appearance](docs/appearance.md). Theme contract and contrast tests check the token definitions and WCAG AA color pairs. The signed-in page checks cover long project names beside the Tasks link.

### Review accounts

Three accounts in your worktree's development database show the site at different levels of use, for design reviews and screenshots:

- **Empty**, `review+empty@project-buddy.test`: a name and nothing else, for the empty states.
- **Typical**, `review+typical@project-buddy.test`: three quests, one of them completed, with construct replies, command replies, tasks, ideas, Quick Notes, milestones and a cast spell; three spells with reply lists; and about 45 experience, circle 4.
- **Crowded**, `review+crowded@project-buddy.test`: sixteen quests and fourteen spells, with every name and text at its length limit, words too long to wrap, long messages, a construct reply in rich Markdown with a table and code, and long Tasks, Ideas, Quick Notes and Progress lists.

To make the accounts, start the site with `mise //apps/web:dev`, then run this command from the repository root:

```sh
mise run review-data
```

The command deletes the three accounts, makes them again and prints a 30-minute sign-in link for each. To use other addresses, pass a base address, such as `mise run review-data me@example.test`, which gives `me+empty@example.test` and so on. The base address itself is never changed. If the site runs on another port, set `PROJECT_BUDDY_URL`, such as `PROJECT_BUDDY_URL=http://localhost:3210`.

The command refuses any database but your worktree's own development database, and any site address but `localhost`. It starts quests and sends messages through the running site's API, so the construct's replies are the local engine's own. It makes everything else with the site's own stores. Two kinds of message go straight into the database, because the local construct engine never writes them: replies that record a milestone, and replies in Markdown. The content is in `apps/web/scripts/development/review-content.ts`.

## Installed app

Project Buddy installs on a phone's Home Screen from the browser: Chrome on Android offers **Install app**, and Safari on an iPhone offers **Add to Home Screen** in the Share menu. The web app manifest is `apps/web/src/app/manifest.ts`, with icons in `apps/web/public/icons/`.

See [installed app](docs/notifications.md) for Home Screen installation.

## Saved images

The composer accepts text only. Images already saved in a conversation stay readable by the quest's owner. See [saved images](docs/images.md) and [image storage](docs/Site-Operations.md#saved-conversation-images).

## Export copy for a writer

From `apps/web/`, run `npm run copy:export -- copy.csv`. Import the resulting
UTF-8 CSV into Google Sheets. The same command writes `copy-definitions.csv` beside
it. Import this second CSV as a separate sheet for the writer. An optional first
path selects the copy file; an optional second path selects the definitions file:
`npm run copy:export -- copy.csv copy-definitions.csv`.

The script reads all `*_COPY` objects in `src/ui/copy/` without starting the app
and exports only fields with more than three words.
Each text field gets an Identifier, Needed Word Count (Approx), Description and empty
Copy cell. Nested identifiers use dots; array entries use numbers starting at 1.
Functions and lookups with multiple wordings get separate `.variant1`, `.variant2`
rows in source order. Shared text appears under each field that uses it.

Descriptions explain where each piece of text appears, what has happened, what it
needs to say and what the person can do next, using everyday language,
without showing the original wording. Templates also list the `{{placeholders}}` to
preserve. Maintain these writer briefs in `apps/web/scripts/copy-briefs.ts`; the export
stops if an included field has no brief. Source wording is omitted even for templates
so the writer can create new copy without seeing it.
Counts split text on whitespace, counting each interpolation as one word, including
interpolations containing expressions or shared copy. Page titles include their page
text, separator and a one-word site-name placeholder. The command prints total fields
and approximate words for the exported fields. These totals cover the Copy objects,
including their nested values, rather than text elsewhere in the app. Unsupported
expressions stop the export instead of silently skipping a field.

The definitions sheet has Term and Definition columns. It explains glossary terms
found in the copy identifiers and descriptions, including plural forms and screen
names. It also includes terms used in those explanations, so a writer does not need
the repository docs. Definitions describe the site's purpose and how its features
fit together, and distinguish older saved content from features available today.
Maintain the plain-language explanations in `apps/web/scripts/copy-glossary.ts`
when `GLOSSARY.md` changes. A new glossary section without an explanation stops
the export. Copy descriptions never include the original sentences. Copy fields
that can only appear in existing saved conversations remain part of the export.
