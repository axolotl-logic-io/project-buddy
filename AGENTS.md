# Agent rules

The repo is a monorepo (`monorepo-layout`): npm workspaces under `apps/`, with one `package-lock.json` at the root, and mise tasks in each app's `mise.toml`.

- `apps/issue-pipeline/` is the issue pipeline. Read its `README.md` before changing it: a merge changes nothing that runs until the operator installs it.

Rules for the whole repo:

- A flaky test is a failure (`flakes-are-failures`).
