# Site operations

The repo's `README.md` is the operating guide for setup, tests, indexing and releases. [Project practices](project-practices.md) holds the production and secrets rules. This page adds the production boundaries, the smoke checks and troubleshooting notes. The Vercel and troubleshooting notes are observations from earlier versions of the tools, not guaranteed current behaviour.

## Production boundaries

- Production is `https://project-buddy-rust.vercel.app`; the Vercel project is `project-buddy`. Team aliases were behind Vercel SSO.
- Production, Preview and Development share one Neon database. Agents must never connect to it or run real Claude. The one exception is a read-only query through `npm run ops:query`, when a person asks for it in the current task (see [Reaching Vercel and production](#reaching-vercel-and-production)). Tests use the separate test database and mock buddy.
- When `VERCEL_ENV=production`, the app refuses `BUDDY_MODEL=mock` with a configuration error, just as it refuses `EMAIL_TRANSPORT=outbox`. Leave `BUDDY_MODEL` unset or set it to `claude` in production. Preview, development and test environments can still select the mock.
- Never print a `.env*` file or copy secrets into docs, logs, issues or commits. Follow the repo's secrets rules.
- PRs target `integration`, whose pushes deploy previews. Every push to `main` automatically releases production after a release PR merges. The [project practices](project-practices.md) give the release order and migration compatibility.

## Reaching Vercel and production

The site is the Vercel project `project-buddy` in the team `modest-progress`. `apps/web/scripts/ops/project.sh` records both, so nobody has to look them up again. Every command below runs in `apps/web/` and needs a personal `vercel login`. When the CLI says its token isn't valid, run `vercel login` again.

| Command | What it does |
|---|---|
| `npm run ops:link` | Links `apps/web` to the project, writing the ignored `.vercel/project.json`. Then `vercel logs`, `vercel env ls` and `vercel promote` work without `--scope`. |
| `npm run ops:env -- production` | Pulls that environment's variables (`production`, `preview` or `development`) to `~/.config/project-buddy/production.env`, readable only by you, and prints the names, never the values. Refuses a directory inside any git checkout. Links first if needed. |
| `npm run ops:query -- production "<sql>"` | Runs one statement against that environment's database inside a read-only transaction, which is always rolled back, with a 15 s timeout. Prints the rows as JSON. |

For example, to count the unread marks after a release:

```bash
npm run ops:env -- production
npm run ops:query -- production "select count(*) from chat_unreads"
```

- **Pulled files stay outside the checkout.** `next build` loads `.env.production` and the test commands load `.env*` files, so a pulled file inside the repo could point a build or a test at production. `ops:env` refuses any directory inside the checkout. Set `PROJECT_BUDDY_OPS_DIR` to use another directory outside it.
- **Delete pulled files when you're done** (`rm ~/.config/project-buddy/*.env`). They hold every production secret.
- **Every environment reaches the same database**, because Production, Preview and Development share one Neon database.
- **`ops:query` can only read.** It sends one statement as a prepared statement, so Postgres refuses a string of several, such as `COMMIT; DELETE ...`, and refuses any write inside the read-only transaction. It can still call functions that don't write, such as `pg_terminate_backend`, so read a statement before you run it. Change production data only through a migration in a release, or by hand under the project practices' rules, never with this script.
- **Agents** may use `ops:env` and `ops:query` only when a person asks for it in the current task. They never print values from a pulled file, and they delete the file afterwards.

## Token spend boundaries

The repo's other development tooling spends no tokens. The CI workflows (`.github/workflows/integration.yml` and `release.yml`) smoke-test with signed-out requests only, and no script calls a model. The web app's tests refuse to run unless `BUDDY_MODEL` is `mock` (`apps/web/scripts/test-db/test-database.ts`, `apps/web/playwright.config.ts`).

At runtime, the web app spends tokens on users' buddy chats, charged per user to each user's gold balance. That spend isn't commit-driven, so this page doesn't cover it.

## Signed-out smoke checks

Both workflows run the same command from `apps/web/`, using Node 24 without a TypeScript loader or app alias resolver:

```bash
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/release/smoke.ts <base-url>
```

The integration workflow waits for the merge commit's preview to be READY, then supplies that preview URL and its automation bypass secret through the environment. The command sends these requests sequentially, without following redirects:

| Request | Healthy response |
| --- | --- |
| `GET /login` | HTTP 200 |
| `GET /signup` | HTTP 200, the admin-invitation explanation (`SIGNUP_COPY.intro`), and the `SIGNUP_COPY.signInLink` link to `/login` |
| `GET /setup` (no token) | HTTP 200, the unusable-invitation explanation (`SETUP_COPY.unusable`), and the `SETUP_COPY.signIn` link to `/login` |
| `GET /` | HTTP 307 with a Location pointing to `/login` |
| Signed-out `POST /api/chat` with `{}` | HTTP 401 |

Invitation expectations import shared UI copy; they do not maintain separate prose or require the retired invite-code field. Those imports (including their dependencies) must stay runnable by plain Node.

A wrong status, missing explanation, or missing/misdirected sign-in link reports the request and unmet expectation; any failure makes the command exit unsuccessfully. Copy or anchor markup appearing only in scripts, styles or HTML comments does not satisfy the page checks.

The setup check deliberately supplies **no invitation token**. This state rejects the empty token before an invitation database query. It needs no invitation fixture or email, never confirms an invitation, and creates no account or session. All smoke requests remain signed out: no database writes, email sends or model calls.

## Vercel observations

- `vercel link` writes `projectId` and the owning team's `orgId` to the ignored `.vercel/project.json`. Tools use `VERCEL_PROJECT_ID` and `VERCEL_ORG_ID`.
- `vercel env pull` returned sensitive variables as empty strings. A pulled file alone did not establish that those variables were configured locally.
- `vercel logs --follow` missed lines written in `after()`, such as `[buddy-steps]`. The recorded alternative was a bounded log query:

  ```bash
  vercel logs --deployment DEPLOYMENT_ID --since START --until END --json
  ```

  `DEPLOYMENT_ID` identifies the deployment; `START` and `END` bound the query's time range. Use timestamps with an explicit time zone.

## Local troubleshooting observations

- Turbopack builds failed when `node_modules` was a symlink. Replacing it with a real directory from `npm ci` resolved that case.
- Docker Desktop's credential helper could hang while pulling test-database images. A credential-free `DOCKER_CONFIG` was the recorded workaround.
- `npm run manual:reindex` once peaked at about 450–510 MB of memory and wrote about 8,974 sections. These are past measurements, not limits or an expected count.

## Validation

The release workflow checks signed-out requests, not real buddy behaviour.

### Production validation gap

The question `production-check-after-merge` is still open: should production get a cheap check after each merge, or only a maintainer-run real-Claude smoke test? Release PR merges into `main` automatically run signed-out production smoke checks. The release workflow's smoke test covers signed-out requests only; it doesn't check buddy replies or prompt caching.

Each release's smoke test should record `cacheRead` and `cacheWrite` for an edited buddy. [Issue #37](https://github.com/axolotl-logic-io/project-buddy/issues/37) records the proposed real-Claude and theme checks, including watching for short citing steps and uncited step-limit answers. It was closed as maintainer-only release work, not because the checks passed, and nothing records that they have.

## Image generation

Configure `OPENAI_API_KEY` using the hosting platform’s secret controls. Generation is unavailable when the key is missing; text chat still works. Do not test with paid model calls or the shared database. See [image operations](images.md) for pricing, conservative reservations on uncertain billing, interrupted generation, private delivery and deletion. No production deployment is part of enabling the code on integration.

## Chat image attachments

Users can select or paste up to four JPEG, PNG, GIF or WebP images per message, each at most 2 MiB. Text is optional. Phone users can use their image picker; HEIC images must first be exported as JPEG or PNG. The composer shows previews, removal controls, upload progress and errors. Failed uploads preserve the draft. A failed model reply keeps the sent images visible and offers Retry reply.

Image bytes are stored privately in Postgres, behind `src/images/store.ts` in the web app. No storage credentials or public bucket are needed. Apply migration 0019 before using uploads. This additive table migration works with the previous build. Every upload, read and model reference checks chat ownership. The authenticated delivery route sends `private, no-store` and never supplies a public URL to the model. Each reply loads image bytes from the conversation, including earlier messages, through the existing AI SDK model abstraction. Image input tokens use the existing gold check and provider-reported spend accounting; uploads make no model call.

Deleting a chat, project or account cascades to its image bytes. Unsent and removed draft uploads are retained privately until the chat is deleted; there is no separate expiry job. Database backups therefore contain images as well as messages. Upload requests carry one binary image each, below the hosting request-size limit; chat requests carry references only. The image store and display support later image-generation work without selecting a generation provider.

Use the worktree-local `.env.test` and mock buddy for tests. Image tests exercise real local storage and delivery, with a fake model that reports the image bytes it receives. Never run these tests against the shared database or a paid model.

## Check-ins

A Vercel cron in `apps/web/vercel.json` calls `/api/check-ins` once a day, at 15:00 UTC. The route starts the buddies' [check-ins](chats.md#check-ins) for every due project and answers with how many it started, skipped and failed. It runs at most 25 check-ins per call, 5 at a time; the rest are still due on the next call. A call that leaves due projects behind logs a `[check-in-backlog]` line, so a growing backlog shows in the Vercel logs before check-ins arrive late.

Check-ins are hidden until `CRON_SECRET` is set. Without it, the project page doesn't show the check-in setting, the setting's action refuses to save, and the route answers 401 to every request, so no request starts check-ins. Chats and unread marks that check-ins already made stay as they are.

To turn check-ins on, set `CRON_SECRET` in the Vercel project, using the hosting platform's secret controls, then redeploy, so the deployment gets it. Vercel Cron sends it as a bearer token, and the route answers 401 to any request without it. Crons run only on the production deployment.

Each check-in is a real model call charged to its owner's gold, and an email through Resend. Never call the route against the shared database from a test or a smoke check. Apply migration 0022 before the code: it adds `projects.check_in_frequency`, `projects.last_check_in_at` and `chats.unread`, with defaults, so it works with the previous build.

Migration 0028 is additive. It adds the `chat_unreads` table of per-user unread marks and copies each chat with `chats.unread` set to a mark for the chat's owner. The build reads and writes only `chat_unreads`. The release that added 0028 (#638) also kept writing `chats.unread` for the chat's owner; the code no longer writes it, so new chats keep its default, `false`. A rollback to a build before the `chat_unreads` release reads only `chats.unread`, so it shows stale marks: check-ins since then show as read, and chats opened since then can show Unread again. Step 2 of #637 drops the column once this build is live in production.

When 0028 was released, the previous build kept reading and writing only `chats.unread` in the minutes between the migration and the promotion. Two things can go out of step then:

- A check-in that the previous build started was marked only in `chats.unread`, so the new build showed it as read.
- A user who opened a check-in on the previous build cleared `chats.unread` but not their `chat_unreads` row. After the promotion the chat showed Unread again, and the project got no new check-in until the owner opened the chat once more.

Both could happen only in those few minutes, and neither needed action.

Migration 0030 is additive. It adds `gold_balances`, each user's [gold](../GLOSSARY.md#gold) in micro-USD, and `gold_ledger`, every grant and transfer of it, and gives every existing user the starting 100 gold once, whatever they spent before. The new build reads and writes only gold; `monthly_spend` stayed, unread, until migration 0034 dropped it. In the minutes between the migration and the promotion, the previous build keeps charging `monthly_spend`, so calls made then cost no gold, and an account it creates then has no balance: the new build grants that account its 100 gold the first time it reads its balance. A rollback to the previous build brings the monthly quota back, counting only what was spent before this release; spending under gold isn't in `monthly_spend`.

Migration 0034 drops `monthly_spend`, and makes `image_generations.month` nullable. The drop is destructive: it ran only once the gold release was live in production, and a rollback to a build before gold is no longer safe, because that build charges `monthly_spend`. Making the column nullable is additive. The build no longer writes `image_generations.month`, so new claims leave it empty; the build before it still writes it, and nothing reads it. A later release drops the column ([#655](https://github.com/axolotl-logic-io/project-buddy/issues/655)).
