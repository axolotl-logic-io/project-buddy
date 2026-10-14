# Agent rules

Read `CONTRIBUTING.md` (the rules for code, tests and production) and the wiki's [Decisions](https://github.com/axolotl-logic/project-buddy/wiki/Decisions) pages (the design decisions and what they rejected) before changing anything, and follow them. The README says how to run the app and the tests. Work is tracked in GitHub issues.

- `npm run check` runs Biome, the type check and the unit tests; `npm run test:e2e` runs the end-to-end and screenshot tests against the local test database named in `.env.test`. Both must pass, and a flaky test is a failure (`flakes-are-failures`).
- Every use case in `use-cases/` has an e2e test titled exactly its slug. A change in behaviour updates the use case and its test.
- A change that alters a page updates its screenshot baselines (`npm run test:visual:update`); look at every changed image before committing it.
- Never connect to the production database (`.env.local`'s `DATABASE_URL`), never print a `.env*` file, and never run Claude for real: tests use the mock model.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
