# Agent rules for the site

Read the root `AGENTS.md` first. Run these commands in this folder, `apps/web/`, or from anywhere with `mise //apps/web:<task>`.

- `npm run check` runs Biome, the type check and the unit and browser tests (`*.browser.test.tsx`, in Chromium and WebKit); `npm run test:e2e` runs the end-to-end and screenshot tests against the local test database named in `.env.test`. Both must pass, and a flaky test is a failure (`flakes-are-failures`).
- Every use case in `use-cases/` has a test or `describe` titled exactly its slug, wherever that test lives. A change in behaviour updates the use case and its test.
- Playwright e2e tests cover only visual regressions (`e2e/visual/`) and the auth workflows (`e2e-visual-and-auth-only`). The auth workflows are sign-up, sign-in, sign-out, the sign-in limits, and the signed-out access gate, where a signed-out visitor, or one whose session has lapsed, is sent to log in. Every other case is tested in Vitest:
  - A case that needs a real server or database gets a server test against the test database in `.env.test`. It calls the Server Action, route handler or store with real users and sessions, not through a browser.
  - A case that needs only the UI gets a component or browser test in `src/`.
- Server tests have no harness yet: today's Vitest tests stub the database with `src/db/fake-neon-http.ts`, and only Playwright and `scripts/test-db/` load `.env.test`. #342 builds the harness (`src/**/*.server.test.ts`, run by `npm run test:server`). Until #342 merges, work that needs a server test comes after it, and no new e2e test goes outside `e2e/visual/` and the auth workflows.
- The e2e tests written before this rule move out in #341's parts. Until each part merges, its tests stay and must pass. Issues specced before the rule (#309, #316) keep the e2e tests their specs name.
- A change that alters a page updates its screenshot baselines (`npm run test:visual:update`); look at every changed image before committing it.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
