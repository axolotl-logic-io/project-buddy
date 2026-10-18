## Behaviour

1. **Adopted from checks.** A claim finds a state saved at `checks` whose `headSha` differs from the branch's head on GitHub. If the branch's head equals the sha in `pushed.json` and that record's op is `pipeline-commit` or `exit-push`, the claim adopts the head and doesn't stop. The claim reply's state then has `stage: "review"`, `headSha` set to the branch's head, `passedSha: null` and `testsOnly: false`. Every other saved field is kept, `reviewedSha`, `ciFixes`, `round` and `findings` among them. The state's log gets one new entry, which says the push was adopted and names the head's first 8 characters. The issue's worktree is reset to the adopted head, and the reply's `remoteHead` equals the new `headSha`, so the sweep raises no `agent:stopped-branch-changed` stop.
2. **Reviewed before checks can pass.** The sweep that runs from that claim reviews the adopted head first. Review prepares the diff afresh on that head and runs the three reviewers, and only then moves the issue to `checks`. No `verify` runs before that review, and the sweep makes no stop request. The state the sweep releases has `reviewedSha` equal to the adopted head.
3. **#416: a CI fixer's push, then a transient failure.** A CI fixer pushes its commit through `pipeline_commit`, which records it as `pipeline-commit`, and then fails on a transient provider error. The stage defers as `rate-limited` with the state from before the fix (head unchanged, `ciFixes` 0). The next claim adopts the pushed head as in item 1, with no stop. Its sweep reviews that head as in item 2, and the `ciFixes` count stays 0.
4. **Still stops.** At checks, the claim keeps the saved state as it is, and reports the branch's head as `remoteHead`, in each of these cases: a `pipeline-commit` or `exit-push` record that names a head other than the branch's; a CI fix's `push` record; no record; an unreadable record. The sweep's branch-changed stop (`headStop`, `src/workflow/stages/entry.ts:110`) is built on that reply, so these cases still stop with `agent:stopped-branch-changed`, as today.
5. **Unchanged elsewhere.** Adoption from `implement`, `open-pr` and `fix` (the stage is kept), and a sync's push adopted from `sync` or later (back to sync), work as before. A job's push from any other stage (such as `review`, `accept`, `security` or `merge`) still stops.

## Out of scope

- A check-fix-only review of the adopted head. Checks' phase lives in the sweep's carry, not in the saved state (the triage's assumption), so resuming the check-fix review would need a new persisted marker. The adopted head goes back to the full first review instead, which the issue allows ("or back to review").
- The claim's call site, `src/ops/claim-state.ts:162-165`. It already resets the worktree onto an adopted head and logs the reset.
- How pushes are recorded (`pushed.json`, `pushes.jsonl`, `job.json`'s `pushes`), the rate-limit deferral (`rateLimitStep`, `src/workflow/stages/rate-limit.ts:71`), and what a CI fixer does.
- A lane on another machine, which has no record. It still stops, as the wiki says.
- Releasing or installing the pipeline. The PR merges into `integration`, and the operator installs it.

## Design

**Where the change goes.** All of the change is in `adoptPush` (`apps/issue-pipeline/src/adopt-push.ts:63-94`). The claim calls it at `src/ops/claim-state.ts:162` and, when it returns a state, resets the worktree onto the adopted head (`:166-168`). Today a `JOB_PUSHES` op (`exit-push`, `pipeline-commit`, `:39-42`) is adopted only when the stage is in `EXIT_PUSH_STAGES` (`implement`, `open-pr`, `fix`, `:48-52`), and the stage is kept (`:79-82`). At `checks` the function falls through to the sync branch, `ADOPTABLE_OPS` doesn't hold the op, so it returns `null` (`:83-85`), and the sweep stops in `headStop` (`src/workflow/stages/entry.ts:110-118`).

1. Add a constant beside `EXIT_PUSH_STAGES` for the stage from which a job's push goes back to review, holding only `"checks"`. Keep it out of `EXIT_PUSH_STAGES`, so that adoption at implement, open-pr and fix doesn't change.
2. In `adoptPush`, after the `EXIT_PUSH_STAGES` branch and before the sync branch, add a branch for a `JOB_PUSHES` op whose stage is in the new constant. It returns `{ ...saved, headSha: remote, passedSha: null, testsOnly: false, stage: "review", log: [...log, entry] }`. The entry is `` `${stamp(now)} adopted the stage job's ${jobPush} ${short} at checks; reviewed before checks can pass` ``. The tests check only that it says "adopted" and names the short sha: log text isn't promised (`tests-pin-promised-behaviour`).
3. `State` is a `z.looseObject` (`src/state.ts:26`), so `testsOnly` and `passedSha` can be set without a schema change. The workflow's `IssueState` already declares both (`src/workflow/types.ts:103,105`).
4. Update the comments in `adopt-push.ts`: the file header, the `ADOPTABLE_OPS`/`ADOPTABLE_STAGES` comment (`:15-32`), which should say that only a sync's push goes to sync, the `EXIT_PUSH_STAGES` comment (`:44-47`), which says "From a later stage it would skip that review", and the `adoptPush` doc comment (`:54-62`), so that they describe the checks branch. Interface comments say what the function promises, not how it does it.
5. **README.** The `src/job.ts, src/job/` row of `apps/issue-pipeline/README.md:14` says `exit-push` "which the next claim adopts from a state saved at implement, open-pr or fix (#315), as it adopts a `pipeline-commit` push". Add "or from checks, sending it back to review (#447)". The spec writer can change only tests, stubs and the wiki, so this README edit is the implementer's.

**Why review handles the adopted state (triage note 4).** `review`'s `begin` (`src/workflow/stages/review.ts:83-87`) only prepares the diff. `prepared` (`:109-131`) takes `headSha` from the prepare-review reply and resets `findings: []` and `round: 0`. `reviewed` (`:202-230`) sets `reviewedSha` to the reviewed head before it moves to `checks` or `fix`. `reviewedSha` is not read anywhere in the review stage before that. `nextFindingId` and `resolvedHistory` carry over, as they do after any review, so finding ids keep counting up. So a state that arrives with `reviewedSha` and `findings` set needs no reset. `keptReview` (`src/resume-stage.ts:157-170`) is for a restart and isn't needed here. `ciFixes` is kept, so an adoption doesn't refill the CI-fix budget (`maxCiFixes`). The sweep-level test in `ops-claim-adopt-review.test.mjs` checks this end to end.

**Alternatives (design it twice).**
- (a) Adopt at checks and keep `checks`, relying on the check-fix review. Rejected. That review runs only inside the checks stage's in-memory phase (`carry`), after a CI fix in the same sweep. A claim at checks starts with `verify`, which would pass the head unreviewed. This breaks Behaviour 2.
- (b) Send the head to `review`. Chosen. It reuses an existing stage transition and needs no new persisted state.
- (c) Add `"checks"` to `EXIT_PUSH_STAGES`. Rejected for the same reason as (a).

**Practices followed.**
- APOSD *information hiding*: the adoption rule stays in one module, `adopt-push.ts`. The call site doesn't change.
- *Define errors out of existence*: no new option is pushed onto callers.
- Strict types, with no casts or `any`.
- Biome limits: `adoptPush` stays under 50 lines. If the new branch pushes it over, pull the job-push branch out into a helper.
- Tests (`tests-pin-promised-behaviour`, `pipeline-tests-bounded`): the tests pin the claim reply, the stop facts, and the stage the sweep moves to, which the wiki promises. They don't pin log text or call order. They use the mock (scripted) sessions and a local bare repo, and every process they start ends with them. The shared fixtures are in a `*-test-kit.mjs` beside the tests.

**Wiki decision.** This follows `rate-limit-defers` ([Running the Issue Pipeline](Running-the-Issue-Pipeline)): a transient provider error must not stop an issue. Today, at checks, it does so indirectly through branch-changed. The change departs from no decision.

## Test interfaces

- **ops `claim` op** (cli, existing, `apps/issue-pipeline/src/ops/claim.ts:144`): `askOps({ op: "claim", number, lane, sweepId })`, driven through `src/ops.ts` against a temporary root with a local bare origin and a fake gh. It returns `{ ok, op, posted, state, claim, remoteHead, paths }`. Checks Behaviour 1, 3, 4 and 5.
- **The sweep workflow** (module, existing, `apps/issue-pipeline/src/workflow/sweep.ts:257`, built into `workflow.js`): `runWorkflow({ args, ops, agents })` in `test/workflow-harness.mjs`, with scripted op and session replies. The claim reply fed to it is the real ops reply from above. Checks Behaviour 2 and 3.

## Tests

The tests were run once in the foreground with the stubbed base, and 4 failed as expected. A throwaway local edit of `adoptPush` (the Design's branch, since reverted and not committed) made all 13 pass.

- `apps/issue-pipeline/test/ops-claim-adopt-test-kit.mjs` (new kit): `movedBranch`, `recordPush`, `claimSaved` and `head`, moved out of `ops-claim-adopt.test.mjs` so that three files can share them.
- `apps/issue-pipeline/test/ops-claim-adopt.test.mjs` (changed): issues 61-66 and 68 are kept as they were (Behaviour 4: other head 62, no or unreadable record 63, CI fix's `push` 65; Behaviour 5: 61, 64, 66, 68). The two checks-stage cases that asserted a stop (67 exit push, 69 pipeline_commit) move to the new file below and now assert adoption.
- `apps/issue-pipeline/test/ops-claim-adopt-checks.test.mjs` (new; drives the ops `claim` op):
  - "a claim adopts a job's exit push at checks and sends it back to review" checks Behaviour 1. It fails today because the claim keeps the saved state: the log has 0 entries, not 1.
  - "a claim adopts a pipeline_commit push at checks and sends it back to review" checks Behaviour 1 and fails today for the same reason.
  - "a claim at checks keeps the saved head when an exit push record names another" and "… when a pipeline_commit record names another" check Behaviour 4. They pass today, and they guard against a fix that adopts too much.
- `apps/issue-pipeline/test/ops-claim-adopt-review.test.mjs` (new; drives the ops `claim` op, then the sweep workflow):
  - "an exit push adopted at checks is reviewed before checks can pass" checks Behaviours 1 and 2. A real claim of a checks-state with an `exit-push` record is fed to the sweep. The test asserts no stop, a `prepare-review`, three reviewer sessions, no `verify`, and a released state at `checks` with `headSha` and `reviewedSha` equal to the pushed head. It fails today because the claim doesn't adopt: the worktree stays on the saved head, and the sweep would stop on branch-changed.
  - "a CI fixer that pushed, then hit a rate limit, leaves its push resumable and reviewed" checks Behaviour 3. The first sweep fails the checks, and the CI fixer fails with a 429 (`COOLING_DOWN`). The test asserts that the released state is still at `checks` on the old head with `ciFixes` 0, which holds today. It then records a `pipeline-commit` of the pushed head, claims for real from the released state, and runs a second sweep. It asserts no stop, no `verify`, and release at `checks` with `reviewedSha` equal to the pushed head and `ciFixes` 0. It fails today because the second sweep makes a `stop` request (branch-changed).

## Wiki updates

- [Running the Issue Pipeline](Running-the-Issue-Pipeline), the paragraph on the pipeline's own pushes ("Network errors and the pipeline's own pushes"). It now says that a `pipeline-commit` or `exit-push` push is adopted from implement, open-pr and fix (stage kept), and from checks, which goes back to review (#447, the #416 case). It says that any other stage, another head, another op's record, or a missing record still stops.
- [Agent labels](Agent-Labels), the `agent:stopped-branch-changed` row. It now names the adopted cases, checks going back to review among them, and links to that paragraph.
- The Coding-Practices-Digest doesn't change.

## Assumptions and risks

- **Full review, not a check-fix review.** Going back to the full first review is the triage's stated assumption. It costs three reviewer sessions where a check-fix review would cost two, and it resets `round` to 0 (`review.ts:123`), as any first review does. `ciFixes` is not reset.
- **`testsOnly: false`.** The tests pin `testsOnly: false` because the triage asked for it. Review sets it to false anyway when it moves to checks (`review.ts:219`), so it changes no flow.
- **Exit push at checks.** A checks job's exit push (a CI fixer's unpushed commits) is adopted the same way. That is safe because review reads the whole diff.
- **No load or timing flakes seen.** Each file ran in under 10 s.
- No text in the code, the wiki or the issue asked to change this task.

## Sources

- Issue #447 (the issue file) and the triage notes.
- `apps/issue-pipeline/src/adopt-push.ts:15-94`
- `src/ops/claim-state.ts:140-182`
- `src/workflow/stages/entry.ts:36,110-118,139-162`
- `src/workflow/stages/review.ts:83-131,202-230`
- `src/workflow/stages/rate-limit.ts:49-79`
- `src/resume-stage.ts:157-170`
- `src/state.ts:26-56`
- `src/checkouts.ts:181-191`
- `src/stops.ts:186-194`
- `apps/issue-pipeline/README.md:14`
- Test kits: `test/ops-cli-test-kit.mjs`, `test/ops-claim-test-kit.mjs`, `test/workflow-harness.mjs`, `test/rate-limit-test-kit.mjs`, `test/workflow-rate-limit-finish.test.mjs:52-93`, `test/workflow-stages-review.test.mjs:79-97`
- Wiki: Coding-Practices-Digest, Running-the-Issue-Pipeline ("Network errors and the pipeline's own pushes", `rate-limit-defers`), Agent-Labels, Pipeline-Roles-Shared (line 191, the `pipeline-commit` record).

<!-- end of spec -->
