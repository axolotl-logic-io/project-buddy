# Agent rules

Read `CONTRIBUTING.md` (the rules for code, tests and production) and the wiki's [Decisions](https://github.com/axolotl-logic/project-buddy/wiki/Decisions) pages (the design decisions and what they rejected) before changing anything, and follow them. The README says how to run the app and the tests. Work is tracked in GitHub issues.

The repo is a monorepo (`monorepo-layout`): npm workspaces under `apps/`, with one `package-lock.json` at the root, and mise tasks in each app's `mise.toml`.

- `apps/web/` is the site. Read `apps/web/AGENTS.md` before changing it.
- `apps/issue-pipeline/` is the issue pipeline. Read its `README.md` before changing it: a merge changes nothing that runs until the operator installs it.
- The root holds only the shared tooling (`package.json`, `mise.toml`, the Biome policy in `biome.jsonc`) and the top-level docs.

Rules for the whole repo:

- Never connect to the production database (`.env.local`'s `DATABASE_URL`), never print a `.env*` file, and never run Claude for real: tests use the mock model.
- A flaky test is a failure (`flakes-are-failures`).
