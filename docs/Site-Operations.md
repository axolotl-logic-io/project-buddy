# Site operations

The repo's `README.md` is the operating guide for setup, tests, indexing and releases. [Project practices](project-practices.md) holds the production and secrets rules. This page adds the production boundaries, the smoke checks and troubleshooting notes. The Vercel and troubleshooting notes are observations from earlier versions of the tools, not guaranteed current behaviour.

## Production boundaries

- Production is `https://project-buddy-rust.vercel.app`; the Vercel project is `project-buddy`. Team aliases were behind Vercel SSO.
- Production, Preview and Development share one Neon database. Agents must never connect to it or run real Claude. Tests use the separate test database and mock tutor.
- When `VERCEL_ENV=production`, the app refuses `TUTOR_MODEL=mock` with a configuration error, just as it refuses `EMAIL_TRANSPORT=outbox`. Leave `TUTOR_MODEL` unset or set it to `claude` in production. Preview, development and test environments can still select the mock.
- Never print a `.env*` file or copy secrets into docs, logs, issues or commits. Follow the repo's secrets rules.
- PRs target `integration`, whose pushes deploy previews. Production releases are manual. The [project practices](project-practices.md) give the release order and migration compatibility.

## Token spend boundaries

The repo's other development tooling spends no tokens. The CI workflows (`.github/workflows/integration.yml` and `release.yml`) smoke-test with signed-out requests only, and no script calls a model. The web app's tests refuse to run unless `TUTOR_MODEL` is `mock` (`apps/web/scripts/test-db/test-database.ts`, `apps/web/playwright.config.ts`).

At runtime, the web app spends tokens on users' buddy chats, metered per user against each user's monthly quota. That spend isn't commit-driven, so this page doesn't cover it.

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
- `vercel logs --follow` missed lines written in `after()`, such as `[tutor-steps]`. The recorded alternative was a bounded log query:

  ```bash
  vercel logs --deployment DEPLOYMENT_ID --since START --until END --json
  ```

  `DEPLOYMENT_ID` identifies the deployment; `START` and `END` bound the query's time range. Use timestamps with an explicit time zone.

## Local troubleshooting observations

- Turbopack builds failed when `node_modules` was a symlink. Replacing it with a real directory from `npm ci` resolved that case.
- Docker Desktop's credential helper could hang while pulling test-database images. A credential-free `DOCKER_CONFIG` was the recorded workaround.
- `npm run manual:reindex` once peaked at about 450–510 MB of memory and wrote about 8,974 sections. These are past measurements, not limits or an expected count.

## Validation

The release workflow checks signed-out requests, not real tutor behaviour. The remaining evidence gap and the maintainer-only checks are described under [Production validation gap](Blender-AI-Tutor.md#production-validation-gap).
