## Behaviour

All paths are under `apps/issue-pipeline/`.

1. **Layout.** `src/roles/reviewer/` holds the reviewer's machine: `machine.ts` joins the entries, each entry lives in its own module (`entries/review.ts` for `review`), and the role has its own `locate.ts`, `checks.ts` and edges, in the shape of `src/roles/spec-writer/`. `REVIEWER_STAGES` is `["review"]`, and `src/roles/registry.ts` registers every stage in it with one `registerRole` line, so #423 adds `accept` by adding it to the list.
2. **Registered for `review` stage jobs only.** `roleOf("review")` gives the reviewer's machine role. `roleOf("accept")` and `roleOf("security")` stay undefined, so those stages keep their stage code. The lane sweep's `review` stage code (`src/workflow/stages/review.ts`) stays as it is.
3. **The machine.** Its entry is `claim`. The edges are:
   - claim → checkout → prepare → lenses → post-lenses, and then either a clean save, or aggregate → store-findings → a save at fix.
   - claim `not-ours` → released.
   - prepare `empty` → stopped "nothing to review". prepare `failed` → stopped "could not prepare the review diff", with the error as the detail.
   - post-lenses `lens-failed` → stopped "a reviewer failed".
   - The aggregator's failure falls back to the raw findings, as the lane's stage does today.
   - `checkTable(TABLE, LIMITS)` gives no violations, and the machine's `handoff` lists the fields the role writes.
4. **Lenses run as one `sessions` effect.** The `lenses` state is a session-kind state whose effect is `{kind:"sessions", sessions:[…]}`. It holds the sessions `review-correctness`, `review-tests` and `review-scope`, in `LENS_NAMES` order, each on `ctx.models[lens]`: scope on Sonnet, correctness and tests on Opus. Each has agent `issue-pipeline-reader` and schema `REVIEW_SCHEMA`. Each task is built by `lensTaskShared` over the bundle from the `prepare-review` reply, so the three tasks share a prefix that holds the bundle text, and the lens's own part (`reviewer (<lens>)`) comes after it. The job's `job.json` steps record the state as `{at:"lenses", effect:"sessions"}`.
5. **Cache order.** Of the sessions on one model, the first starts at once. The next starts only after the first has printed its first `message_end` event, or has ended without one. Sessions on different models start together. With the default models, the Sonnet scope lens starts at once, beside the first Opus lens. The second Opus lens starts after the first Opus lens's first `message_end`.
6. **Every lens's reply survives.** The effect replies `replied` with a `SessionsReply`: each session's name and outcome, in the effect's order. A failed session drops no other session's reply. A transient or network failure of a session fails the whole effect, which the runner holds, as it holds a single session's failure.
7. **Comments.** `post-lenses` posts one signed comment per successful lens on the PR, by role `reviewer (<lens>)` and with the key `review-<lens>`, built with `lensComment`. If a lens failed, the issue stops ("a reviewer failed", with the detail `<lens> reviewer failed: <error>`) after the other lenses' comments are posted.
8. **Clean review.** With no blocking finding, the run ends `saved(checks)` with no `sync` op (#340). The saved state records `reviewedSha` (the reviewed head), `reviewedPatchId` (the prepare reply's patch id), `testsOnly: false` and `findings: []`. `reviewStands` accepts that state on a clean rebase with the same patch id (`review-keeps-on-clean-rebase`).
9. **Blocking review.** With blocking findings, the aggregator session (`aggregate`, on `ctx.models.aggregator`, schema `AGG_SCHEMA`, task `aggregateTask`) merges them. Its comment, from `findingIdsComment`, is posted after the lens comments. `store-findings` then numbers the findings with `addFinding`, counting on from the saved `nextFindingId`: a saved 2 gives `f2`, `f3`… and the next number. The run ends `saved(fix)` with the open findings. Every finding goes to the fixer.
10. **Empty diff.** A `prepare-review` reply with no changed files stops "nothing to review" before any session starts.
11. **Old states resume.** An issue saved at `review` by today's stage code is located by the role at `claim`. Its `reviewedSha`, `reviewedPatchId`, `nextFindingId` and `findings` are kept, so a clean rebase still keeps a review it passed.
12. **Role isolation.** No module under `src/roles/reviewer/**`, followed through its relative imports, imports another role's modules (`src/roles/<other-role>/…`). Imports from `src/workflow/`, `src/job/` and the shared `src/roles/*.ts` modules are allowed.
13. **Wiki.** Pipeline-Roles-Reviewer marks the machine, Locate and the `review` entry as built (#421). Pipeline-Roles-Shared describes the `sessions` effect.

## Out of scope

- The `accept` entry (#423). The `security` stage and the final security review (`roles-6-10-scope`).
- The re-review and the check-fix review, which run inside the implementor.
- Routing a finding about a spec test to the spec writer: deferred. Every finding goes to the fixer, as today.
- The lane sweep's `review` stage code, which stays for lanes. Its behaviour doesn't change.
- Releasing and deploying.

## Design

**Runner extension: the `sessions` effect** (the part the base lacks; Pipeline-Roles-Shared, "Effects").
- `src/roles/sessions.ts` (stub, committed) declares `SessionsEffect` and `SessionsReply`. They sit beside `machine.ts`, because adding them there would take it past Biome's 300-lines-per-file limit (CONTRIBUTING, Lint).
- The implementer adds `SessionsEffect` to `Effect` (`src/roles/machine.ts:51`) with an `import type` line and a union member. `kindViolation` (`src/roles/machine.ts:205`) then treats a `session` kind state as matching a `session` or a `sessions` effect, so `checkTable` (`src/roles/machine.ts:245`) passes the reviewer's table.
- `Effects` (`src/job/run-step.ts:20`) gets a `sessions` member that runs the effect and returns each session's outcome, launch usage and key. `execute` (`src/job/runner.ts:177`) gets an exhaustive `case "sessions"`. That case writes one usage entry per session through the same path as `session` (`src/job/runner.ts:163`, with `runUsage().session` in `src/job/run-usage.ts:71`). It gives `{ok:true, reply: SessionsReply}`, which the edges read as `replied`. Any transient or network failure fails the effect into `failedEnd` (`src/job/runner.ts:75`), so the job holds it. `nameOf` (`src/job/step-report.ts:27`) names the step `sessions`.
- `launcherOf` (`src/job/role-run.ts:133`) runs the sessions. It groups them by model. The first in each group launches at once. Each later one awaits a promise that resolves on the earlier session's first `message_end` record, or when that session's `runLaunch` settles. The launcher sees the record through the `record` hook that `tallied` wraps (`src/job/role-run.ts:119-124`, `src/job/launch.ts:56`, `launch.ts:179`). Groups run concurrently (`Promise.all`). The wait is an event, not a clock (`web-tests-under-load`, `flakes-are-failures`).
- *Design it twice* (CONTRIBUTING, Design). Two alternatives were weighed:
  - (a) Three `session` states in a row. Rejected: they lose the start-together rule across models, and the cache order would leak into the role's table.
  - (b) A `sessions` effect whose cache order lives in one module, the launcher. Chosen: the role only lists its sessions (information hiding, pull complexity downward), and the next role with parallel sessions reuses the effect.
  The wiki records both on Pipeline-Roles-Shared.

**Reviewer machine** (`src/roles/reviewer/`, shaped like `src/roles/spec-writer/`).
- The `machine.ts` stub is committed: `TABLE`, `LIMITS`, `transition`, `reviewerMachine`, `REVIEWER_STAGES`, `ReviewerResult`. The implementer fills in `TABLE`, which joins `entries/review.ts`, and adds `checks.ts` (exporting `reviewerChecks`), the edges, the ends and the tasks as the role needs them.
- `locate.ts` (stub) declares `ReviewerState`, `ReviewerHandoff` and `ReviewerData`.
- Registry: `for (const stage of REVIEWER_STAGES) registerRole(stage, machineRole("reviewer", reviewerMachine, reviewerChecks));` after `src/roles/registry.ts:104`.
- The tests pin these reply shapes, which the edges read:
  - `claim`: `ok` / `not-ours`, as the spec writer's claim does.
  - `checkout`: `ok` (both checks answer `ok`, as in `src/roles/spec-writer/checks.ts:239`).
  - `prepare`: runs the `prepare-review` op (`src/ops/sync.ts:138`). It answers `ok` with the reply plus `bundleText`, read from `bundlePath`; `empty` with `null` when `changedFiles` is empty; or `failed` with the error text.
  - `lenses`: `replied` with a `SessionsReply`.
  - `post-lenses`: `clean` with `null`; `blocking` with the raw findings; or `lens-failed` with the detail string.
  - `aggregate`: `replied` (the aggregator's reply) or `failed` (the error text). A failure falls back to the raw findings, as `src/workflow/stages/review.ts` does.
  - `store-findings`: `ok` with `{findings, nextFindingId}`.
- The ends:
  - `released`.
  - `prep-failed`: stopped error, after a stop op with the reason "could not prepare the review diff".
  - `nothing-to-review`: stopped error, reason "nothing to review".
  - `lens-failed`: stopped error, reason "a reviewer failed".
  - `clean`: `saved(checks)` with `reviewedSha`, `reviewedPatchId` and `testsOnly: false`, and no sync.
  - `findings-stored`: `saved(fix)`.
- Reuse from `src/workflow/` (allowed; Behaviour 12):
  - `lenses.ts` (`LENS_NAMES`) and `review-schemas.ts` (`REVIEW_SCHEMA`, `AGG_SCHEMA`).
  - `lensTaskShared` (`src/workflow/stages/review-prefix.ts:52`).
  - `lensComment`, `aggregateTask` and `findingIdsComment` (`src/workflow/stages/review-text.ts:98,108,124`).
  - The reply guards in `review-replies.ts`, and `addFinding` (`src/workflow/findings.ts:47`).
  `lensTaskShared` and `aggregateTask` take a `StageContext` and a `StageState`. The implementer may narrow their parameters with `Pick<>`, or build the minimal state they read, without changing their output for the lane stage.
- Comments go through the `post` op as `{comments:[{number: pr, by:{…, role:"reviewer (<lens>)"}, body, key:"review-<lens>"}]}`. The findings comment's role is `aggregator`, or `aggregator (fallback: raw findings)`.
- Locate: today's stage saves its review only at a stage boundary, never mid-review. Its phases (begin, prepared, reviewed, aggregated, saved) are never written (`src/workflow/sweep-item.ts:160-176`), so every old state starts at `claim`. The role's data must carry every handoff field, because the runner writes back only the declared keys (`src/job/role-state.ts:40`, `writtenState`). `reviewStands` (`src/resume-stage.ts:78`) is unchanged.

**Lint boundary.** `checks.ts` reads the bundle file, which needs `node:fs`. Two ways to meet `best-practice-over-lint` (Decisions-Code-and-tooling):
- (a) Add `src/roles/reviewer/checks.ts` to the `noNodejsModules` override in `apps/issue-pipeline/biome.jsonc` (near line 150), with a reason comment, as the spec writer's `checks-git.ts` has. Then add it to the pipeline's list in that wiki decision.
- (b) Read the bundle through a module that already has the override.
The implementer chooses. If they choose (a), they update the decision's wiki entry in the same PR.

**Practices followed** (CONTRIBUTING; Decisions-Code-and-tooling):
- Deep modules and information hiding: the cache order lives in the launcher alone.
- Exhaustive switches with `never` (Types). No `any`, `!` or casts.
- 300 lines per file and 50 per function (Lint): each entry gets its own module, and the session types got their own file.
- `tests-pin-promised-behaviour`: the tests check gh writes, stop reasons, the saved state and the sessions that ran.
- `pipeline-tests-bounded`: the fake pi's holds wait on marks under `runJob`'s bound, and the job kit kills every pi at the test's end.
- `flakes-are-failures`: the cache-order test orders events, not times.

## Test interfaces

- `TABLE`, `LIMITS`, `transition`, `reviewerMachine`, `REVIEWER_STAGES`, `ReviewerResult` (module, new): `src/roles/reviewer/machine.ts`.
- `locate` (function, new): `src/roles/reviewer/locate.ts`, `locate(saved: State, context: RoleContext): MachineState<ReviewerState, ReviewerData>`.
- `SessionsEffect`, `SessionsReply` (types, new): `src/roles/sessions.ts`.
- `roleOf` (function, existing): `src/roles/registry.ts:100`.
- `checkTable` (function, existing, changed through `kindViolation`): `src/roles/machine.ts:245`.
- `reviewStands` (function, existing): `src/resume-stage.ts:78`.
- The job CLI at `--stage review` (cli, existing): `src/job.ts`, driven through `test/job-test-kit.mjs` with the fake gh and the fake pi.

## Tests

Every new test fails today, run once on the branch: 16 of 16, in 3.0 s. The causes are the stubs' not-implemented throws, `roleOf("review")` being undefined, the missing `entries/review.ts`, or the lane stage's output where the role's is expected. No test fails on a syntax, import or type error.

`test/roles-reviewer-machine.test.mjs` (drives `locate`, `transition`, `TABLE`, `checkTable`, `reviewerMachine`, `roleOf`; kit `test/reviewer-role-test-kit.mjs`):

| Test | Behaviour pinned | Why it fails today |
|---|---|---|
| locate resumes a state today's review stage saved at claim, keeping its review fields | 11 | `locate` throws |
| claim, checkout and prepare route as the Lifecycle table says | 3, 10 | the table's states are unbuilt ends |
| a prepared review runs the three lenses as one sessions effect, each on its model over the bundle | 4 | no lenses effect |
| the posted lenses route to a clean save at checks, the aggregator or a stop | 3, 7, 8 | unbuilt |
| the aggregator's reply or failure stores the findings, which save at fix | 9 | unbuilt |
| the table is clean, enters at claim and hands off the review fields | 3 | `entries: []`, `handoff: []` |
| the reviewer runs review stage jobs; accept and security keep their stage code | 1, 2 | not registered |
| each entry has its own module, and the reviewer imports no other role's modules | 1, 12 | no `entries/review.ts` |

`test/roles-reviewer-stage.test.mjs` (drives the job CLI at `--stage review`, fake gh, fake pi; kit `test/reviewer-job-test-kit.mjs`):

| Test | Behaviour pinned | Why it fails today |
|---|---|---|
| each lens runs on its model, its task the shared prefix over the bundle | 4 | the lane stage runs instead, with no `sessions` step |
| a clean review posts one keyed comment per lens and saves at checks with no sync | 7, 8 | lane stage output: no keys, no `reviewer (<lens>)` role |
| the role's clean review stands on a clean rebase with the same patch id | 8 | the role's summary isn't produced |
| blocking findings are merged, numbered on from the saved number and saved at fix | 9 | lane stage output |
| a failed lens stops the issue after the other lenses' comments | 7 | lane stage output |
| an empty diff stops with nothing to review before any session | 10 | lane stage output |

`test/roles-reviewer-cache-order.test.mjs` (drives the job CLI with `test/fake-rpc-pi.mjs`'s per-launch `script.sessions`, `fakeMark` and `fakeHold`):

| Test | Behaviour pinned | Why it fails today |
|---|---|---|
| the second Opus lens starts after the first's first message_end, the Sonnet lens at once | 5, 6 | no `sessions` effect: the lane stage's order |
| a first Opus lens that ends with no message_end still lets the second start | 5 | same |

## Wiki updates

- **Pipeline-Roles-Reviewer:** marks Lifecycle, Locate and the Entry `review` rows as built (#421). It rewrites the `review` rows: saved(checks) with no sync, keyed comments, the lens-failed stop, routing to the spec writer deferred. It updates the Test interfaces and Test plan rows.
- **Pipeline-Roles-Shared:** adds a `sessions` effect bullet under Effects. It covers the cache-order rule, the outcome, the hold on a transient failure, one usage record per session and one `job.json` step, with the two rejected alternatives.

## Assumptions and risks

- **Size.** Triage estimated two implementer sessions. The runner extension and the role are separable along file lines if the first session runs short.
- **Pinned names.** The reply shapes and stop reasons the tests pin are this spec's choice. The wiki now records them: `a reviewer failed`, `nothing to review`, `could not prepare the review diff`.
- **`lensTaskShared` and `aggregateTask` take lane-stage types.** Narrowing them must not change the lane's tasks. The lane's review tests guard that.
- **Lint.** The bundle read needs `node:fs` (the Lint boundary above). Option (a) needs the `best-practice-over-lint` wiki list updated in the same PR.
- **An existing test to watch.** `test/job.test.mjs:96` uses `repliesAt("review")` with an accept-stage job. It shouldn't be affected.
- **The cache-order test's holds.** They poll a mark file every 20 ms. That is bounded by `runJob`'s bound, and the job kit kills every pi at the test's end. A correct implementation can't make it flaky, because the order is forced by marks.
- No text in the code, the wiki or the logs asked to change this task.

## Sources

- `apps/issue-pipeline/`:
  - `src/roles/machine.ts:37,51,205,245`
  - `src/job/run-step.ts:20`
  - `src/job/runner.ts:75,163,177`
  - `src/job/run-usage.ts:71`
  - `src/job/step-report.ts:27`
  - `src/job/role-run.ts:119-160`
  - `src/job/launch.ts:56,179`
  - `src/job/role-state.ts:40`
  - `src/roles/registry.ts:95-104`
  - `src/roles/spec-writer/`
  - `src/workflow/stages/review.ts`
  - `src/workflow/stages/review-prefix.ts:52`
  - `src/workflow/stages/review-text.ts:98-124`
  - `src/workflow/findings.ts:47`
  - `src/workflow/sweep-item.ts:160-176`
  - `src/resume-stage.ts:78`
  - `src/ops/sync.ts:138`
  - `biome.jsonc:150`
  - `mise.toml`
- `AGENTS.md`, `CONTRIBUTING.md`.
- Wiki pages: Pipeline-Roles-Reviewer, Pipeline-Roles-Shared, Pipeline-Roles-Spec-Writer, Decisions-Code-and-tooling (`best-practice-over-lint`, `tests-pin-promised-behaviour`, `pipeline-tests-bounded`, `flakes-are-failures`, `web-tests-under-load`).
- Issue #421, and triage's notes on it.

<!-- end of spec -->
