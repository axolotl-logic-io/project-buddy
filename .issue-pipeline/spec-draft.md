## Behaviour

All paths are under `apps/issue-pipeline/`. "The role" is the implementor role (`src/roles/implementor/`); "data" is its `ImplData`.

### Entry and registration

1. `IMPLEMENTOR_STAGES` is `["implement", "checks"]`, so `roleOf("checks")` is the implementor role and a stage job at `checks` (`job.mjs --stage checks`) runs it; the lanes' `workflow/stages/checks*.ts` stay as they are.
2. `locate` takes the entry from `saved.stage`: `"checks"` gives `entry: "checks"`, any other stage gives `"implement"`. The `start` check answers with the entry, and `start` → `checks` goes to `checks-work?`.
3. `locate` reads back `verifiedSha`, `verifySummary`, `testsOnly`, `reviewedSha`, `reviewedPatchId`, `stackedOn`, `headSha`, `flows` and `pr`; `maxCiFixes` comes from `cfg.maxCiFixes`. `testsOnly` reads `false` when the saved state lacks it. `ciFixRounds` is the checkpoint's, else today's `saved.ciFixes`, else 0; `ciFixContinuations` is the checkpoint's, else `continuationsOf(saved, "ciFix")`, else 0.
4. `implementorMachine.handoff` adds `verifiedSha`, `verifySummary`, `testsOnly`, `reviewedSha`, `reviewedPatchId`, `stackedOn` and `pr`; `checkpoints` adds `ciFixContinuations`. `LIMITS` is `{ maxContinuations: 1, maxCiFixes: 2 }` and `limitsOf(cfg)` is `{ maxContinuations: cfg.maxContinuations, maxCiFixes: cfg.maxCiFixes }`.
5. The table's entries stay `["start"]`, `checkTable(TABLE, LIMITS, data)` finds no faults, and the only session states are `implementer`, `ci-fixer`, `check-fix-correctness` and `check-fix-scope`. No state sends `open-pr`, `start-pr` or `close-pr`.

### The `checks` entry's edges (the table in `test/implementor-checks-edge-fixtures.mjs`)

6. `checks-work?` (check payload `headSha`, `verifiedSha`, `flows`) answers `verified` when the head is a non-empty string equal to `verifiedSha` and `flows.code` is not `false`; it goes to `ci-status`, so a verified head waiting on CI is not verified again and never ends at accept before CI is green. Otherwise it answers `work` and goes to `wiki-check`.
7. `wiki-check` (check payload `flows`, `headSha`) answers `pass` → `verify`; `wiki-only` → `checked`, setting `verifiedSha` to the head, `verifySummary` to `"wiki-check: passed; no code changed"`, `rebasedOnly` to the old `testsOnly` and `testsOnly` to false; `fail` with `{ failure }` → `ci-fixer`.
8. `verify` (check payload `headSha`, `testsOnly`, `pr`, and `stackedOn` only when the issue is stacked) answers `pass` with `{ headSha, summary }` → `ci-status`, setting `verifiedSha` and `verifySummary`; `fail` with `{ failure }` → `ci-fixer`; `moved` → `verify-moved`, which stops `branch-changed` with reason "the branch changed during verification".
9. `ci-status` (check payload `pr`, `expectedSha` = the head, `minutes` = `cfg.ciWaitMinutes + 10`) answers `green` → `checked`, which sets `rebasedOnly` to `testsOnly` and `testsOnly` to false and ends saved at `merge` when `rebasedOnly`, else at `accept`; `pending` → `ci-pending`, which ends `held`; `fail` with `{ failure }` → `ci-fixer`; `moved` → `ci-moved` (stop `branch-changed`, "the branch changed outside the pipeline while CI ran"); `no-checks` → `no-ci` (stop `no-ci`, "the PR has no required CI checks, and this repo's config requires them").
10. Every `fail` and every `blocking` edge into `ci-fixer` is guarded by `ciFixRounds` against `maxCiFixes`: below the limit it adds 1 to `ciFixRounds`, sets `failure` and clears `fix`; at the limit it goes to `fix-limit`, which stops `check-fixes` with reason "checks still fail after N CI-fix attempts" (N = `maxCiFixes`) and the failure as detail.
11. `ci-fixer` runs session `cifix-<ciFixRounds>` (a continuation: `cifix-<ciFixRounds>-c<ciFixContinuations>`), agent `issue-pipeline-writer`, model `models.fixer`, schema `CIFIX_SCHEMA`, budget role `ciFixer` with `sessionBudget(budgets, "ciFixer")`, attempt `ciFixRounds`. Its task holds the practices, "These checks failed:" and the failure, the commit rules with trailer `Pipeline-Agent: check fixer`, `cannot-fix`, the load rule and the handoff rule; a continuation's task leads with `handoffLead(handoffFile)`. `replied` → `ci-fixer-reply`, setting `fix` to `fixOf(reply)`, which is `null` for a reply that doesn't read as a fix.
12. `ci-fixer-reply` (check payload `fix`) answers `fixed` → `fix-push`; `handoff` → `ci-fixer`, guarded by `ciFixContinuations` against `maxContinuations`, over → `fix-out-of-room` (stop `too-large`, `outOfRoomReason("CI fixer", maxContinuations)`, detail "Latest handoff: <handoffFile>\n\n<summary>"); `cannot-fix` → `cannot-fix` (stop `checks-unrelated`, "the check fixer can't fix the failing checks from the repo", detail the summary); `bad` → `bad-fix-reply` (stop `error`, "the CI fixer's reply could not be read").
13. `fix-push` is op `push` with payload `{ number, comments }`, the comment being the fixer's summary on the PR (the issue when there is no PR). `ok` → `prepare-fix-review`, setting `headSha`, `flows` (`flowsOf` of the reply's `codeChanged` and `wikiAhead`) and `testsOnly` false.
14. `prepare-fix-review` is op `prepare-review` with payload `{ number, sinceSha: reviewedSha, tag: "cifix<ciFixRounds>" }` plus the stack fields when stacked. `ok` → `check-fix-correctness`, setting `diffPath`, `patchId` and `reviews: []`.
15. `check-fix-correctness`, then `check-fix-scope`, are sessions `cifix-review-<lens>-<ciFixRounds>`, agent `issue-pipeline-reader`, model `models[lens]`, schema `REVIEW_SCHEMA`, budget role `rereviewer`; their task holds `Concern: <LENSES[lens]>` and the diff path. Each `replied` appends `{ lens, reply }` to `reviews`; correctness goes to `check-fix-scope`, scope to `check-fix-review`.
16. `check-fix-review` (check payload `reviews`, `headSha`, `pr`) answers `clean` → `wiki-check`, setting `reviewedSha` to the head, `reviewedPatchId` to `patchId` and `testsOnly` false; `blocking` with `{ failure }` → `ci-fixer`, guarded as in 10 (this departs from today's stop, see Design); `bad` → `bad-review` (stop `error`, "a check-fix reviewer failed").
17. Every op and check names the issue (`number: 7` in the tests).

### The checks the job runs (`implementorChecks`)

18. `checks-work?` answers as in 6 from its payload alone.
19. `wiki-check` runs no op and answers `pass` when `flows.wiki` is not true. Otherwise it runs op `wiki-check` `{ number }`: a pass answers `wiki-only` when `flows.code` is false and `pass` otherwise; a fail answers `fail` with `failure` the failed checks' lines (`failureLine`).
20. `verify` runs op `verify` with payload `{ number, testsOnly }` (plus `stackedOn` when the check payload has it) and `minutes: 120`, then posts the checks' table on the PR through op `post` (a comment on `pr` whose body starts "Ran the repo's commands on <head, 12 chars>." and lists `- ✅ id: detail` / `- ❌ id: detail`). It answers `moved` when the reply's head isn't the payload's, `fail` with the failed checks' lines, or `pass` with `{ headSha, summary }`, `summary` being `clip("id: detail; …", 1500)`.
21. `ci-status` runs op `ci-status` `{ number, pr, expectedSha }` with the payload's `minutes`, and answers `green`, `pending`, `no-checks` or `moved` for those statuses; for `fail` it posts "Required checks failed on <head, 12 chars>: <names>." on the PR and answers `fail` with `failure` "CI checks failed: <names>\nFailed-job logs: <logPath>".
22. An op that fails (`ok: false`) makes the check's outcome fail (`ok: false`), so the runner ends it (held on a network or transient error, stopped `error` otherwise).
23. `ci-fixer-reply` answers the fix's status, or `bad` for a null fix. `check-fix-review` posts one comment per lens on the PR ("Review of the check fix in <head>." with "No blocking findings." or the blocking findings), then answers `blocking` with `failure` listing the blocking findings when either lens found one, `bad` when a review doesn't read, and `clean` otherwise.
24. The role's op effect carries an optional `minutes`, and `role-run.ts` passes it to the op launch, so verify and the CI wait get their timeouts instead of `OPS_MINUTES`.

### A stage job at `checks`

25. Passing wiki check, verify and green CI end saved at `accept` with `verifiedSha` and `verifySummary` saved, with no session and no `sync-base`.
26. With `testsOnly` saved, green CI ends saved at `merge` with `testsOnly` false.
27. Pending CI ends held: the job saves the issue at `checks` with `verifiedSha` = the head, and runs no session.
28. A failed verify runs the fixer, pushes, prepares the fix's diff since `reviewedSha` with tag `cifix1`, runs both reviewers, verifies the new head and, with green CI, ends at `accept` with `ciFixRounds` 1 and `reviewedSha` the new head.
29. With `maxCiFixes` 1, a second failure stops `check-fixes` ("checks still fail after 1 CI-fix attempts").
30. A fixer's `cannot-fix` stops `checks-unrelated`.
31. A state saved by today's checks stage (`phase: "ci"`, `ciFixes`, `continuations.ciFix`, `verifiedSha` = head) resumes: with green CI it ends at `accept` with no verify op; with failing CI and `ciFixes` at `maxCiFixes` it stops `check-fixes` with no session.

## Out of scope

- The lanes' checks stage (`src/workflow/stages/checks.ts`, `checks-round.ts`, `ci-fix.ts`, `ci-fixer.ts`): unchanged, still run by the sweep.
- Closing or reopening the PR when a CI fix changes the issue's flows (today's `flow-step.ts`): the role sends no PR ops (`no-pr-ops`); a fix that empties the code flow is recorded in `flows` and the next `wiki-check` takes the wiki-only path.
- Retest findings (none exist on the base: `grep -rn retest src` finds nothing), the spec-test rerun at `specTestsSha`, and one job running fix → checks (#424).
- The start sync (#419): a held job resumes with no sync.

## Design

**Approach (design A, chosen over B).** The wiki's checks table (Pipeline-Roles-Implementor, "Entry `checks`") has `wiki-check`, `verify` and `ci-status` as states. Design A makes them *check* states whose bodies, in `roles/implementor/checks.ts`, run the op through `effects.op` (with `minutes`), read it with `verifyReplyOf`/`ciReplyOf` (`src/workflow/stages/checks-reply.ts:150-175`), post the verify and CI comments through op `post`, and answer clean result names. Design B made each an op state plus a router check that reads the reply; it doubles the states, puts the comments on a later op, and shows the op's raw reply to the pure machine. A keeps the table 1:1 with the wiki and the I/O on the job side, as `pushed()` already does (`src/roles/implementor/checks.ts:94-110`). `push` and `prepare-review` stay plain op states, whose replies the edges read with zod, as `implement.ts:16-19` does.

**Files.**
- `src/roles/implementor/checks-entry.ts` (new, states only, built with `check()` from `states.ts:33-47`): `CHECKS_STATES`, joined by one line in `machine.ts:21-24` (`...CHECKS_STATES`). Guards as `implement.ts:21-25` (`Guard` in `src/roles/machine.ts:76-80`: at the limit the edge goes `over`, else it adds 1).
- `src/roles/implementor/ci-fix-task.ts` (new): `ciFixerSession(data)` and `fixReviewSession(lens)(data)`, built as `task.ts` builds `implementerSession`, with the task lines of `src/workflow/stages/ci-fixer.ts:56-102` (`fixerLaunch`) and `src/workflow/stages/ci-fix.ts:105-131` (`lensLaunch`), `CIFIX_SCHEMA` (`src/workflow/schemas.ts:85`), `REVIEW_SCHEMA` (`src/workflow/review-schemas.ts:40`), `LENSES` (`src/workflow/lenses.ts:29`).
- `src/roles/implementor/ends.ts`: end states `checked`, `ci-pending`, `fix-limit`, `fix-out-of-room`, `cannot-fix`, `bad-fix-reply`, `bad-review`, `verify-moved`, `ci-moved`, `no-ci`, using `end()`/`stopped()` (`ends.ts:20-36`). Stop codes from `src/stops.ts`: `check-fixes`, `checks-unrelated`, `no-ci`, `branch-changed`, `too-large`, `error`. The reasons are today's (`checks.ts` `ci()`, `verified()`; `ci-fixer.ts:137-158`).
- `src/roles/implementor/locate.ts`: `ImplState` and `ImplEntry` (`locate.ts:25-41`) gain the states and `"checks"`; `ImplHandoff`/`ImplCounts`/`ImplData` gain `testsOnly`, `verifySummary`, `reviewedSha`, `reviewedPatchId`, `stackedOn`, `ciFixContinuations`, `maxCiFixes`, `failure`, `fix`, `diffPath`, `patchId`, `reviews`, `rebasedOnly`; `countsOf` (`locate.ts:146-155`) reads `ciFixRounds` from the checkpoint, then `saved.ciFixes`; `entry` (`locate.ts:204`) comes from `saved.stage`.
- `src/roles/implementor/states.ts:11-22`: `ImplResult` gains `checks`, `verified`, `pass`, `wiki-only`, `fail`, `green`, `pending`, `moved`, `no-checks`, `fixed`, `cannot-fix`, `clean`, `blocking`. No result is named `failed`: `walk.ts:120-121` would then route op failures into it.
- `src/roles/implementor/start.ts:10-12`: `checks: { to: "checks-work?" }`; `checks.ts:22`: `START` accepts `"checks"`.
- `src/roles/implementor/implementor.ts:14-25`: the stage, handoff, checkpoints and limits of Behaviour 1 and 4; `src/roles/registry.ts:127` already registers each listed stage.
- `src/roles/machine.ts:62`: the op effect gains `minutes?: number` (committed, type only); `src/job/role-run.ts:187-194` `opLaunchOf` and its caller (`role-run.ts:244-247`) pass it on, since today every role op gets `OPS_MINUTES` (`src/workflow/launches.ts:133-140`) while verify needs 120 (`checks-round.ts:26`) and the CI wait `ciWaitMinutes + 10` (`checks-round.ts:30,51`).

**Comments.** The check bodies post on the PR through op `post` (`ROUTINE_OPS` answers it; `src/ops.ts:135-157` posts a request's `comments`, each `{ number, by, body }`), signed with `data.by` (passed in the check payload) with its `role` set to `local checks`, `CI` or `check-fix reviewer (<lens>)`. `fix-push` carries the fixer's comment on the push request itself. `ridingComments` (`launches.ts:87-100`) adds nothing for a role op, so the payload's `comments` reach ops.

**Departures from today's code and the wiki.**
- A blocking check-fix finding goes to `ci-fixer`, counted in `ciFixRounds`, as the wiki's Lifecycle table and the triage say; today's `ci-fix.ts:188-228` `reviewed()` stops the issue, and Pipeline-Roles-Reviewer said so. That page is updated.
- A check-fix reviewer's transient error holds the job through the runner (`runner.ts:75-82`); today it defers the issue to `review`.
- `checks-work?` with head == `verifiedSha` goes to `ci-status`, not to saved(accept) as the wiki table said: a verified head may still wait on CI (`checks-round.ts:58-67`). The table is updated.
- The verify summary is clipped to 1500 in the check body (`checks.ts` `verified()`, `SUMMARY_LIMIT`), with `clip` from `src/workflow/clip.ts`.

**Practices** (Coding-Practices-Digest; AGENTS.md): deep modules with one job each (states pure, I/O in `checks.ts`), design it twice (A vs B above), files under 300 lines and functions under 50 (split `checks.ts`'s new bodies into `checks-ops.ts` if needed), no `as` casts, zod (or the hand checks of `checks-reply.ts`) at every reply boundary, comments that say why, tests that pin stop codes, payloads and the saved state rather than internals. Nothing is imported from `src/roles/reviewer/**` (`role-isolation`).

## Test interfaces

- `TABLE`, `transition`, `LIMITS` (`src/roles/implementor/machine.ts`): changed. `transition({ at, data }, { name, reply }) → { state, effect }`.
- `implementorMachine`, `IMPLEMENTOR_STAGES` (`src/roles/implementor/implementor.ts`): changed.
- `locate` (`src/roles/implementor/locate.ts`): changed. `locate(saved, context) → { at, data }`.
- `implementorChecks` (`src/roles/implementor/checks.ts`): changed. `implementorChecks(entry, effects, cfg)[name](payload) → Promise<Outcome>`.
- `Effect` (`src/roles/machine.ts`): changed, the op effect's `minutes?`.
- `roleOf` (`src/roles/registry.ts`): existing.
- The stage job `node job.mjs --stage checks`: existing CLI, new stage.

## Tests

Helpers (no tests of their own):
- `test/implementor-checks-test-kit.mjs`: data located at stage `checks` (`checksLocated`, `checksData`), `checksStep`, the fixer's and reviewers' replies, the stop reasons.
- `test/implementor-checks-edge-fixtures.mjs` (`CHECKS_EDGES`, `AT_LIMIT`, `OUT_OF_ROOM`) and `test/implementor-checks-fix-edge-fixtures.mjs` (`FIX_EDGES`): every edge of Behaviour 6-16, each with its state, result, data, next state, effect and data changes.
- `test/implementor-checks-ops-kit.mjs`: fake `JobEffects` (`checksWith`) that record ops and answer them in turn; `commentsOf`, `opNamed`.
- `test/implementor-job-test-kit.mjs`: now exports `claimed`. `test/fake-rpc-pi.mjs`: a fake op reply `{ sequence: [...] }` answers each entry in turn.

Tests (each fails today for missing behaviour, not on an import or type error; each file was run once):
- `test/roles-implementor-checks-machine.test.mjs`, driving `transition`, `TABLE`, `LIMITS`:
  - "every edge of the checks entry gives its next state, effect and data": Behaviour 6-16. Fails: `transition` throws for the unknown states (`checks-work?` etc.).
  - "the start names the checks entry, and every op and check of the entry names the issue": 2, 17. Fails: `start` has no `checks` edge.
  - "checks-work? is given …", "verify is given …", "ci-status is given …", "the fix's push posts … tagged by round", "the fixer's reply check gets the fix …": the payloads of 6, 8, 9, 12, 13, 14, 16. Fail: the states don't exist.
  - "the table runs four sessions, sends no PR op and has no faults under limits with maxCiFixes": 5. Fails: only `implementer` exists.
- `test/roles-implementor-checks-sessions.test.mjs`, driving `transition`, `implementorMachine`, `IMPLEMENTOR_STAGES`, `roleOf`:
  - the CI fixer session, its continuation, and the reviewer sessions: 11, 15. Fail: no such session states.
  - "the stops carry the failure, the fixer's summary or its handoff as detail": 10, 12. Fails: no such end states.
  - "the limits are the config's maxContinuations and maxCiFixes, and the machine writes the checks entry's fields": 4. Fails: `limitsOf` and `handoff` lack the fields.
  - "a stage job at checks runs the implementor role": 1. Fails: `roleOf("checks")` is undefined.
- `test/roles-implementor-checks-locate.test.mjs`, driving `locate`: 2, 3 (entry from the stage, the hand-off fields, `testsOnly` false by default, `ciFixes` and `continuations.ciFix` carry over, checkpoints win). Fails: `locate` always gives `implement` and reads none of the fields.
- `test/roles-implementor-checks-ops.test.mjs`, driving `implementorChecks(entry, effects, cfg)` with fake effects: 18-22, and the op `minutes` (120 for verify, the payload's for CI) of 24. Fails: the checks don't exist, so the call finds no `checks-work?`/`wiki-check`/`verify`/`ci-status` body.
- `test/roles-implementor-checks-replies.test.mjs`, driving `implementorChecks`: 23 (`ci-fixer-reply`, and `check-fix-review`'s comments, `clean`, `blocking`, `bad`). Fails: no such checks.
- `test/roles-implementor-checks-job.test.mjs`, driving `node job.mjs --stage checks` with the fake pi and ops: 25-31, one test each, with two for 31. Fails: no role is registered for `checks`, so the job runs none.
- `test/roles-implementor-machine.test.mjs`: updated in place where #420 changes what it pins (the session states, `LIMITS`, `limitsOf`, the handoff and checkpoint sets, edges listed in either fixture file): 4, 5.

## Wiki updates

- Pipeline-Roles-Implementor: the `checks` entry marked "Built (#420)", its table with the real states, `checks-work?` → `ci-status` for a verified head, a blocking check-fix finding → `ci-fixer`, and the op `minutes`.
- Pipeline-Roles-Reviewer: the check-fix review runs in the implementor's `checks` entry; a blocking finding goes back to the fixer, counted.
- Issue-Pipeline: the `verification` section describes the `checks` entry.

## Assumptions and risks

- "Nothing moved" in the triage's `checks-work?` means the head: the role has no other record of a move. Retest findings don't exist yet.
- A job killed after `fix-push` and before `check-fix-review` resumes at `checks-work?` with a head that isn't `verifiedSha`, so it verifies the fix without its review. Today's lanes have the same gap after a crash; recording an unreviewed head is left to a follow-up.
- `ciFixContinuations` counts across rounds, as today's `continuationsOf(st, "ciFix")` does.
- The job tests depend on the fake ops' `sequence` replies and the fake pi's `launches`.
- The fake ops don't log an op's timeout, so Behaviour 24's pass-through in `role-run.ts` is tested only up to the effect: the ops tests check `minutes` on the op `implementorChecks` sends through `effects.op`. The implementer must still wire `role-run.ts`; review should check it.

## Sources

- Issue #420 and its triage notes.
- Wiki: Pipeline-Roles-Implementor ("Lifecycle", "Entry `checks`"), Pipeline-Roles-Reviewer, Pipeline-Roles-Shared, Issue-Pipeline, Coding-Practices-Digest, Decisions-Code-and-tooling.
- Code: `src/roles/implementor/{machine,implementor,locate,states,start,ends,checks,implement,task}.ts`, `src/roles/machine.ts`, `src/roles/walk.ts`, `src/roles/registry.ts`, `src/job/runner.ts`, `src/job/role-run.ts`, `src/job/run-step.ts`, `src/workflow/launches.ts`, `src/workflow/stages/{checks,checks-round,checks-reply,ci-fix,ci-fixer,stacked}.ts`, `src/stops.ts`, `src/ops.ts`.
- Tests: `test/implementor-role-test-kit.mjs`, `test/implementor-edge-fixtures.mjs`, `test/implementor-job-test-kit.mjs`, `test/job-test-kit.mjs`, `test/fake-rpc-pi.mjs`, `test/role-context-fixtures.mjs`.

<!-- end of spec -->
