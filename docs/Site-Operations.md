# Site operations

The repo's `README.md` is the operating guide for setup, tests and releases. [Project practices](project-practices.md) holds the production and secrets rules. This page adds the production boundaries, the smoke checks and troubleshooting notes. The Vercel and troubleshooting notes are observations from earlier versions of the tools, not guaranteed current behaviour.

## Production boundaries

- Production is `https://project-buddy-rust.vercel.app`; the Vercel project is `project-buddy`. Team aliases were behind Vercel SSO.
- Production, Preview and Development share one Neon database. Agents must never connect to it. Manual checking uses an isolated local database. The one exception is a read-only query through `npm run ops:query`, when a person asks for it in the current task (see [Reaching Vercel and production](#reaching-vercel-and-production)). Tests use the separate local database and file email outbox.
- Every environment uses the local construct engine. There is no `CONSTRUCT_MODEL` setting. Production refuses `EMAIL_TRANSPORT=outbox`.
- Never print a `.env*` file or copy secrets into docs, logs, issues or commits. Follow the repo's secrets rules.
- Pushes to `integration`, the default branch, deploy previews. Every push to `main` automatically releases production after a release PR merges. The [project practices](project-practices.md) give the release order and migration compatibility.

## Reaching Vercel and production

The site is the Vercel project `project-buddy` in the team `modest-progress`. `apps/web/scripts/ops/project.sh` records both, so nobody has to look them up again. Every command below runs in `apps/web/` and needs a personal `vercel login`. When the CLI says its token isn't valid, run `vercel login` again.

| Command | What it does |
|---|---|
| `npm run ops:link` | Links `apps/web` to the project, writing the ignored `.vercel/project.json`. Then `vercel logs`, `vercel env ls` and `vercel promote` work without `--scope`. |
| `npm run ops:env -- production` | Pulls that environment's variables (`production`, `preview` or `development`) to `~/.config/project-buddy/production.env`, readable only by you, and prints the names, never the values. Refuses a directory inside any git checkout. Links first if needed. |
| `npm run ops:query -- production "<sql>"` | Runs one statement against that environment's database inside a read-only transaction, which is always rolled back, with a 15 s timeout. Prints the rows as JSON. |

For example, to count the quests after a release:

```bash
npm run ops:env -- production
npm run ops:query -- production "select count(*) from quests"
```

- **Pulled files stay outside the checkout.** `next build` loads `.env.production` and the test commands load `.env*` files, so a pulled file inside the repo could point a build or a test at production. `ops:env` refuses any directory inside the checkout. Set `PROJECT_BUDDY_OPS_DIR` to use another directory outside it.
- **Delete pulled files when you're done** (`rm ~/.config/project-buddy/*.env`). They hold every production secret.
- **Every environment reaches the same database**, because Production, Preview and Development share one Neon database.
- **`ops:query` can only read.** It sends one statement as a prepared statement, so Postgres refuses a string of several, such as `COMMIT; DELETE ...`, and refuses any write inside the read-only transaction. It can still call functions that don't write, such as `pg_terminate_backend`, so read a statement before you run it. Change production data only through a migration in a release, or by hand under the project practices' rules, never with this script.
- **Agents** may use `ops:env` and `ops:query` only when a person asks for it in the current task. They never print values from a pulled file, and they delete the file afterwards.

## Token spend boundaries

The repo's other development tooling spends no tokens. The CI workflows (`.github/workflows/integration.yml` and `release.yml`) smoke-test with signed-out requests only, the Full suite workflow (`full-suite.yml`) runs the tests with the local engine, and no script calls a model. The web app’s tests require an isolated local database and file email outbox.

At runtime, constructs use local commands and make no requests to AI model companies. Local replies have no token spend. See [local construct behavior and limits](local-constructs.md).

## Signed-out smoke checks

Both workflows run the same command from `apps/web/`, using Node 24 without a TypeScript loader or app alias resolver:

```bash
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/release/smoke.ts <base-url>
```

The integration workflow waits for the merge commit's preview to be READY, then supplies that preview URL and its automation bypass secret through the environment. The command sends these requests sequentially, without following redirects:

| Request | Healthy response |
| --- | --- |
| `GET /login` | HTTP 200 |
| `GET /textures/parchment.svg` | HTTP 200 with an SVG image content type, without a session |
| `GET /textures/ivory-vellum.webp`, `/textures/soot-brass.webp`, `/textures/espresso-leather.webp` | Each returns HTTP 200 with a WebP image content type, without a session |
| `GET /signup` | HTTP 200, the public sign-up form and introduction (`SIGNUP_COPY.intro`), and the `SIGNUP_COPY.signInLink` link to `/login` |
| `GET /` | HTTP 307 with a Location pointing to `/login` |
| Signed-out `POST /api/chat` with `{}` | HTTP 401 |

The page expectations import shared UI copy; they don't maintain separate prose. Those imports (including their dependencies) must stay runnable by plain Node.

A wrong status, missing explanation, or missing/misdirected sign-in link reports the request and unmet expectation; any failure makes the command exit unsuccessfully. Copy or anchor markup appearing only in scripts, styles or HTML comments does not satisfy the page checks.

All smoke requests remain signed out: no database writes, email sends or model calls. The sign-up check reads the public form without submitting it.

## Vercel observations

- `vercel link` writes `projectId` and the owning team's `orgId` to the ignored `.vercel/project.json`. Tools use `VERCEL_PROJECT_ID` and `VERCEL_ORG_ID`.
- `vercel env pull` returned sensitive variables as empty strings. A pulled file alone did not establish that those variables were configured locally.
- `vercel logs --follow` missed lines written in `after()`, such as `[construct-steps]`. The recorded alternative was a bounded log query:

  ```bash
  vercel logs --deployment DEPLOYMENT_ID --since START --until END --json
  ```

  `DEPLOYMENT_ID` identifies the deployment; `START` and `END` bound the query's time range. Use timestamps with an explicit time zone.

## Local troubleshooting observations

- Turbopack builds failed when `node_modules` was a symlink. Replacing it with a real directory from `npm ci` resolved that case.
- Docker Desktop's credential helper could hang while pulling test-database images. A credential-free `DOCKER_CONFIG` was the recorded workaround.

## Validation

The release workflow checks signed-out requests only. It doesn't check construct replies or any signed-in page.

## Saved conversation images

Image bytes are stored privately in Postgres, behind `src/images/store.ts` in the web app. No storage credentials or public bucket are needed. Every read checks conversation ownership. The authenticated delivery routes send `private, no-store`. Deleting a conversation, quest or account cascades to its image bytes, so database backups contain images as well as messages.

Use the worktree-local `.env.test` for tests. Image tests exercise real local storage and delivery. Never run these tests against the shared database.
