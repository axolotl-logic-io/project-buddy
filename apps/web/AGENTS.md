# Agent rules for the site

Read the root `AGENTS.md` first. Run these commands in this folder, `apps/web/`, or from anywhere with `mise //apps/web:<task>`.

- `npm run check` runs Biome, the type check and the unit and browser tests (`*.browser.test.tsx`, in Chromium and WebKit); `npm run test:e2e` runs the end-to-end and screenshot tests against the local test database named in `.env.test`. Both must pass, and a flaky test is a failure (`flakes-are-failures`).
- Every use case in `use-cases/` has a test or `describe` titled exactly its slug: a component or browser test in `src/`, unless the case needs a real server, database or navigation, in which case it is a Playwright e2e test. Keeping every case in Playwright was rejected as too slow (#131). A change in behaviour updates the use case and its test.
- A change that alters a page updates its screenshot baselines (`npm run test:visual:update`); look at every changed image before committing it.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
