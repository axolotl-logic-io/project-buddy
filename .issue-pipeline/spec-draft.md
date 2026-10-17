## Behaviour

Paths are under `apps/issue-pipeline/` unless they start with `wiki/`.

1. **Patch id.** `patchIdOf(dir, from, head)` returns git's verbatim patch id (`git diff --binary <merge-base(from, head)> <head> | git patch-id --verbatim`, the first field) of the changes `head` makes against its merge base with `from`. It returns `null`, never throws, when there is no merge base, when the diff is empty, when `head` can't be resolved, or on any other git failure. A clean rebase onto a base that moved elsewhere keeps the id. An edit to the issue's changes, a whitespace-only edit included, or a conflict resolution that changes the issue's hunk changes it.
2. **prepare-review replies `patchId`.** The reply has a new field, `patchId: string | null`: the patch id of the branch's changes against its merge base with `measureFrom(stackedOn)`, that is `origin/<base>`, or the prerequisite's head when the issue is stacked. It is the same after a clean rebase onto a moved base, even though `headSha` and `headTree` differ. It changes after an edit to the issue's change. It is `null` for a branch with no changes. The other reply fields are unchanged.
3. **A passing review records `reviewedPatchId`.** Each pass takes the id from its own stage's `prepare-review` reply and saves it next to `reviewedSha`, or saves `null` when the reply had no id. The passes are: the lenses' review with no blocking finding (saved at `checks`); a fix round's re-review that leaves no finding open (saved at `checks`); and a CI fix's review with no blocking finding. A review, re-review or CI-fix review with a blocking finding leaves `reviewedPatchId` as it was.
4. **A restart keeps the review on an unchanged patch id.** `startState`'s review "stands" when the branch head equals `reviewedSha` (as today), or when the start's `patchId` is non-null and equals the saved `reviewedPatchId`. The existing conditions still apply: no blocking finding open, no answered questions, no kept unpushed commits. When the review stands, a stop at `sync` or `checks` resumes at that stage; a stop at `accept`, `security` or `merge` resumes at that stage when the head equals `verifiedSha`, and otherwise at `checks`, which verifies the new head and runs CI on it first; a stop at `review` or `fix` goes on to `sync`, as today; and a start with no stage to resume (a lost or finished state) on a branch with work goes to `sync`, as today. `findings`, `reviewedSha` (unchanged, so it stays the re-review's `sinceSha`), `reviewedPatchId`, `acceptedSha` and `acceptedPatchId` all carry over. When the review stands by patch id on a head that is not `reviewedSha`, the restart's log entry (the last line of `log`, which the state comment shows) contains `review kept: changes unchanged since <first 12 characters of reviewedSha>`. A head that didn't move gets no such note.
5. **Otherwise the restart goes back to review.** These cases all go to `review` as today: a different patch id, a `null` patch id, a saved `reviewedPatchId` that is missing or `null`, an open blocking finding, answered questions, or kept unpushed commits. A resumed stop that goes back to review clears `findings`, `reviewedSha`, `reviewedPatchId`, `acceptedSha` and `acceptedPatchId` (to `[]`/`null`).
6. **The claim computes the patch id.** On a restart, the claim op computes the patch id of the branch's remote head with `patchIdOf` (base `measureFrom(stackedOn)`, `null` when the branch has no remote head) and passes it to `startState` as `StartContext.patchId`. So an issue that stopped at `checks` and whose branch was then rebased cleanly and pushed restarts at `checks`, with the "review kept" note in its saved log. If it was edited, or rebased with a conflict resolution that changed its hunk, it restarts at `review`.
7. **Acceptance keeps its verdict on an unchanged patch id.** The accept stage still runs `prepare-review` first, and its checks still come first: a failed request stops or defers, and a head that moved since verification stops ("the branch changed after verification"). After that, when the reply's `patchId` is a non-empty string equal to the saved `acceptedPatchId`, the stage launches no session. It moves the issue to `security` and logs `acceptance kept: changes unchanged since <first 12 characters of acceptedSha>`. It posts one PR comment containing that text, and it ends without a stop, either at once or after one `save-state`. `acceptedSha` and `acceptedPatchId` are kept.
8. **Otherwise the verifier runs.** That covers a different id, no saved id, a `null` id, and a reply without an id. A `pass` records `acceptedSha` = `verifiedSha` and `acceptedPatchId` = the reply's `patchId` (or `null` when it named none) and moves to `security`. A `fail` sets both to `null` and goes to `fix`, as today.
9. **Security is unchanged.** After a kept acceptance, the security stage at a head whose tree differs from `securityTree` launches the security session (`security-skip-unchanged`). The `testsOnly` merge path (checks → merge after a clean rebase of a fully passed head) is unchanged.
10. **Docs.** The wiki has the decision `review-keeps-on-clean-rebase` (on Issue-Pipeline, after `security-skip-unchanged`), and the reviewer and finalizer role pages describe it (done by this spec). The README's `src/start-state.ts` row and the comments on `resumedStage`/`keptReview` (`src/resume-stage.ts`) and `reviewStands`/`startState` (`src/start-state.ts`) say a review stands on the head or on an equal patch id.

## Out of scope

- The security review's rule (`security-skip-unchanged`, #387, merged in 21d3428): unchanged. It still compares trees, so it runs again after any rebase onto a moved base.
- `sync-base`'s reply, `syncReplyOf` (`stages/checks-reply.ts`), `stages/sync.ts` `clean()` and `checks.passed`: unchanged. A sweep never sends a synced branch back to review (`sync-only-at-merge`). The in-sweep saving comes from acceptance's own check (Behaviour 7).
- `conflict-resolver.ts`, `adopt-push.ts`, `stacked.ts` `restackToSync`: unchanged. A resolution or adopted push that changes the changes changes the patch id, so they fall through to review or acceptance as today.
- The proposed finalizer role. Releasing or deploying anything.

## Design

**Patch id (one module owns it).** `patchIdOf` lives in `src/git-state.ts` (stub committed at `src/git-state.ts:110`). It runs `git merge-base <from> <head>` in `dir`, then `git diff --binary <mb> <head>` piped into `git patch-id --verbatim`. Pipe stdin through `run` or spawn, without a shell string. It returns the first whitespace-separated field, or null for empty output or any non-zero exit. "Define errors out of existence" (CONTRIBUTING Design): it has no error case. Callers never see git's commands.

**prepare-review** (`src/ops/sync.ts:141`, `ReviewReply` at `:25`): add `patchId: patchIdOf(wt, measureFrom(req.stackedOn, cfg), headSha)`. The patch id is always of the whole change from the merge base, even when `sinceSha` narrows the diff.

**State fields.** Add `reviewedPatchId?: string | null`, `acceptedSha?: string | null` and `acceptedPatchId?: string | null` to `IssueState` (`src/workflow/types.ts:122`, beside `reviewedSha`). `State` (`src/state.ts:26`) is a `looseObject`, so the fields need no schema entry, and an absent one reads as null. This follows #387's `securityTree` (`src/workflow/types.ts:131`), which is also not in `newState`. Adding the fields to `newState` (`src/state.ts:121`), as triage suggested, would change `NEW_STATE` in `test/ops-claim-test-kit.mjs` and `helpers.test.mjs` for no gain.

**Recording `reviewedPatchId`.** Each pass carries the id from its stage's `prepare-review` reply to the pass through the stage's `carry`, per `stage-carry`, not as a temporary state key:
- `src/workflow/stages/review.ts`: read the id in `prepared` (`:108`) and set it in `reviewed` (`:213`, raw findings empty) only. The aggregate path at `:220` replaces `carry` with the raw findings, which is fine, since it records no id.
- `src/workflow/stages/rereview.ts`: read it in `launchRereviews` (`:154`) and set it in `settle` (`:138`) only when `openFindings` is empty.
- `src/workflow/stages/ci-fix.ts`: read it in `prepared` (`:133`) and set it in `reviewed` (`:216`).
- Not in `accept.ts:144` or `security.ts:212`, which run on findings.

**Restart.**
- `src/start-state.ts`: add `patchId: string | null` to `StartContext` (`:18`).
- `reviewStands` (`:51`) adds `|| (start.patchId !== null && start.patchId === state.reviewedPatchId)` to the head comparison.
- Pass `start.remote` into `resumedStage` (`src/resume-stage.ts:63`), or the verified-head test. An `accept`/`security`/`merge` stop that stands, with `remote !== verifiedSha`, resumes at `checks`. `finalDiffOf` (`stages/final-diff.ts`) would otherwise stop at accept and security ("the branch changed after verification"), and merge's `expectedSha` is `verifiedSha` (`stages/merge.ts:84`).
- `keptReview` (`:93`) also nulls `reviewedPatchId`, `acceptedSha` and `acceptedPatchId`.
- `carriedReview` (`src/start-state.ts:108`) carries the three new fields.
- `resumedStop` (`:180`) and `branchStart` (`:269`) append `; review kept: changes unchanged since <reviewedSha 12>` to their entry when the review stands and `remote !== reviewedSha`.
- Update the comments on `reviewStands`, `startState` (`:213-225`), `resumedStage` (`src/resume-stage.ts:56-62`) and `AFTER_REVIEW` (`:16`).
- Update the README row for `src/start-state.ts` (`README.md:13`).

**Claim.** `src/ops/claim-state.ts:132-135` (`claimedState`): `branchWork` → `branchHasWork` already fetches the branch and base into the clone (`src/git-state.ts:88`). After it, compute `patchIdOf(paths.clone(cfg), measureFrom(stackedOn, cfg), remote)` when `remote !== null`, else null, and add it to `start`.

**Acceptance.** `src/workflow/stages/accept.ts`:
- In `review` (`:96`), after `finalDiffOf`: when the reply's `patchId` is a non-empty string `=== st.acceptedPatchId`, skip. Mirror security's `skipped()` (`stages/security.ts:138`): stage `security`, `noteEvent` with the text, a `where: "pr"` comment signed `byStep("acceptance verifier")`, then save and done. A plain `doneStep` also passes the tests.
- Otherwise launch with `carry: { patchId }`.
- `decide` (`:156`) on pass sets `acceptedSha = verifiedSha ?? null` and `acceptedPatchId` = the carried id.
- `failed` (`:126`) nulls both.
- The wiki's proposed `accept-work?` row (Pipeline-Roles-Reviewer) placed the check before the diff. It is moved after `prepare-accept`, since the id comes from that reply.

**Practices followed.**
- CONTRIBUTING Design: information hiding (the patch-id rule only in `git-state.ts`, the "stands" rule only in `start-state.ts`/`resume-stage.ts`), pull complexity downward, and errors defined out of existence (null, not a throw).
- Types: no `as` or `!`, `import type`, explicit types, and the new fields optional with `string | null`.
- Lint: 300 lines per file and 50 per function. The tests are new files beside the near-limit `-next` tests.
- Tests: test-first, git fixtures, no timing, and no real Claude (AGENTS.md).
- Wiki decisions: `stage-carry`, `every-role-resumes`, `sync-only-at-merge` and `merge-by-script` (kept), and `security-skip-unchanged` (kept, and the precedent for where the decision lives and how its skip reads).

**Departures from the issue or triage, each with its reason.**
- (a) `--verbatim`, not `--stable`. `--stable` ignores whitespace, so an indentation edit to Python or YAML would keep the review, against Behaviour 3 of the issue. `--verbatim` implies the stable algorithm and keeps whitespace (git `builtin/patch-id.c`, which says "verbatim implies stable"; git-patch-id(1)). I checked locally that a clean rebase keeps the `--verbatim` id.
- (b) The decision goes on `Issue-Pipeline.md`, not a `Decisions-*` page. `Decisions.md` doesn't index the pipeline's decisions, and `security-skip-unchanged` is there.
- (c) The patch id comes from `prepare-review`, not `sync-base`. Acceptance's own reply gives the id at the head it would judge, which a CI fix after the sync would leave stale.
- (d) The acceptance skip is in the accept stage, not `checks.passed`, mirroring `security-work?`.
- (e) Triage's "#387 is unmerged" is out of date: #387 merged in 21d3428, so security is left exactly as #387 made it.

Design-it-twice for `patchIdOf`. The first option, chosen, is `(dir, from, head) → string | null`, where the module finds the merge base. The second, `(dir, base, head)`, makes callers find the merge base, which leaks a git detail to two callers.

## Test interfaces

- `patchIdOf(dir: string, from: string, head: string): string | null`, in `src/git-state.ts` (new, stubbed).
- The `prepare-review` ops request: `{ op: "prepare-review", number, stackedOn?, sinceSha?, tag? }`. Its reply is `{ headSha, headTree, baseSha, patchId: string | null, diffPath, diffLines, changedFiles }` (changed).
- `startState(state: State | null, start: StartContext)`, where `StartContext` gains `patchId: string | null` (changed).
- The `claim` ops request `{ op: "claim", number, lane, sweepId }`: the state it saves on a restart (changed).
- Stage machines' `next(state, ctx, results): Step` for:
  - accept (`stages/accept.ts:182`, changed)
  - review (`stages/review.ts:272`, changed)
  - fix with re-review (`stages/fix.ts:255`, changed)
  - checks with the CI fix (`stages/checks.ts:249`, changed)
  - security (`stages/security.ts:241`, existing)

## Tests

All tests are `// @ts-check` `.mjs` with `node:test`. They pass `npm run typecheck` and `biome check --error-on-warnings`. Each new test fails today only because the behaviour is missing: the stub throws, a field is absent, or a stage launches the verifier. I checked the git-fixture tests against a throwaway implementation, which I did not commit.

- `test/git-state-patch-id.test.mjs` uses `patchIdOf` and pins Behaviour 1. It uses a real temp repo. It fails today because the stub throws. Cases:
  - the id equals git's CLI id
  - the id is the same after a clean rebase onto an unrelated base change
  - the id changes on an edit
  - the id changes on a whitespace-only edit
  - the id changes on a conflict resolution that changes the hunk
  - null on an empty diff
  - null for a bad ref or no merge base
- `test/sync-ops-prepare-review-patch-id.test.mjs` uses prepare-review through the ops CLI and pins Behaviour 2. It fails today because there is no `patchId`. Cases: same id after a clean rebase onto a moved base; new id after an edit; null for no changes.
- `test/sync-ops-prepare-review.test.mjs` (changed) uses prepare-review and pins Behaviour 2. The exact expected reply now includes `patchId`, which is git's `--verbatim` id of `baseSha..headSha`. It fails today because the field is missing.
- `test/start-state-patch-id.test.mjs` uses `startState` and pins Behaviours 4 and 5. Ten tests fail today, because the stage goes to review or the fields aren't cleared. Cases:
  - Stops at sync and checks resume in place, with the note.
  - Stops at accept, security and merge go to checks.
  - Accept with a verified rebased head stays at accept.
  - Review and fix go to sync.
  - A finished state goes to sync, carrying the fields.
  - An edited or null id goes to review, with the review fields cleared.

  Four guards pass today and must keep passing: an unsaved id; an open finding; an unmoved head with no note; answered questions.
- The existing `start-state*.test.mjs` contexts gain `patchId: null`, so `StartContext.patchId` can be required. They still pass.
- `test/ops-claim-patch-id.test.mjs` uses the claim op and pins Behaviour 6. It uses a local origin and the fake gh. The clean-rebase case fails today, because the restart goes to review. The edit case and the conflict-resolution case are guards that pass today.
- `test/workflow-stages-accept-keep.test.mjs` uses accept `next` and security `next`, and pins Behaviours 7, 8 and 9. It fails today because the verifier always runs and nothing is recorded. Cases:
  - a kept verdict: no session, stage security, the log and PR comment
  - a moved head still stops (a guard)
  - four "verifier runs and records" cases
  - a fail clears both fields
  - after the kept acceptance, security with a new tree launches its session
- `test/workflow-stages-review-patch-id.test.mjs` uses review, fix (re-review) and checks (CI fix) `next`, and pins Behaviour 3. It fails today because no `reviewedPatchId` is recorded. The three passes record the id. The three findings paths keep the earlier id, and those pass today as guards.
- `test/workflow-fix-test-kit.mjs` (kit): `round` takes an optional prep reply, and the kit exports `PREPARED`. Existing callers are unchanged.

Behaviour 10 (docs) is checked by reading: the wiki is done here, and the README and comments are the implementer's.

## Wiki updates

- `wiki/Issue-Pipeline.md`: the new `### review-keeps-on-clean-rebase` (after `security-skip-unchanged`), and a cross-reference in `merge-by-script`.
- `wiki/Pipeline-Roles-Reviewer.md`: the accept entry table (`prepare-accept` → `accept-work?` → `verifier`), Outputs (`reviewedPatchId`), Re-review (`reviewedSha` kept as `sinceSha`, and the patch id recorded), and Acceptance (the pass records, the kept verdict, and the fail clears).
- `wiki/Pipeline-Roles-Finalizer.md`: the ready check's "reviewed"/"approved" by patch id, and "A clean rebase keeps the verdicts" now built for review and acceptance.
- `wiki/Pipeline-Roles.md`: the `accept` work-check row.
- `wiki/Agent-Labels.md`, `wiki/Pipeline-Roles-Shared.md` and `wiki/Running-the-Issue-Pipeline.md`: a stage after review stands on the head or on an equal patch id.

## Assumptions and risks

- (a) The patch id is `git patch-id --verbatim` of `git diff --binary <merge-base(base or prerequisite, head)> <head>`. A missing merge base, an empty diff or a git failure counts as "can't compute", which never matches, so review runs.
- (b) The review stands on a restart only with no open blocking finding, no answered questions and no kept unpushed commits, as `reviewStands` already requires.
- (c) #387 has merged (21d3428). Security is left exactly as it is, and only tested not to be skipped by this rule.
- (d) Acceptance had no recorded passing sha, so this adds `acceptedSha` and `acceptedPatchId`. A restart that goes back to review resets them together with `reviewedPatchId`.
- (e) `--verbatim` needs git ≥ 2.39 (2022-12; git commit 2871f4d, https://github.com/git/git/commit/2871f4d447214874e13cf764ab3a170c9d844ca2). The pipeline's hosts run a current git. If the flag is missing, `patchIdOf` returns null, so the safe default is that review runs.
- (f) The issue says the restart "continues at the stage it was at (checks, accept, or merge's recheck)". When the head moved since verification, accept, security and merge resume at `checks`, because they can only run on the verified head. Acceptance is then kept there by Behaviour 7.
- Risk: existing tests that compare a whole saved state after a review, re-review, CI-fix or acceptance pass may now see `reviewedPatchId: null` or `acceptedSha`/`acceptedPatchId`. The implementer updates those expected states, without weakening them.
- Risk: the patch id ignores the wiki's diff. A wiki-only edit keeps the code review's verdict, and the wiki changes are re-read by acceptance only when its id changes. This is accepted: the wiki section isn't code, and security ignores it too (`security-skip-unchanged`).
- No text in the code, wiki or logs I read asked to change this task.

## Sources

- `AGENTS.md`, `CONTRIBUTING.md`, `apps/issue-pipeline/README.md:13`.
- `src/git-state.ts`, `src/ops/sync.ts:25,141`, `src/ops/claim-state.ts:103-138`, `src/stack.ts:209` (`measureFrom`).
- `src/start-state.ts:18,51,108,180,226,269`, `src/resume-stage.ts:16,63,93`, `src/state.ts:26,121`, `src/workflow/types.ts:122,131`.
- `src/workflow/stages/{review.ts:108,213,272, rereview.ts:138,154, ci-fix.ts:133,216, accept.ts:96,126,156,182, security.ts:138,157,241, final-diff.ts, checks.ts:159, merge.ts:84}`.
- Wiki: Issue-Pipeline (`security-review`, `security-skip-unchanged`, `merge-by-script`, `sync-only-at-merge`, `stage-carry`); Pipeline-Roles-Reviewer; Pipeline-Roles-Finalizer; Pipeline-Roles; Pipeline-Roles-Shared (`every-role-resumes`); Agent-Labels; Running-the-Issue-Pipeline; Decisions; Decisions-Code-and-tooling.
- git-patch-id(1): https://git-scm.com/docs/git-patch-id; git `builtin/patch-id.c`: https://raw.githubusercontent.com/git/git/master/builtin/patch-id.c ("verbatim implies stable").

<!-- end of spec -->
