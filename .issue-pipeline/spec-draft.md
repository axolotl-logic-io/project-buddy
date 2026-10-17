## Behaviour

Paths are under `apps/issue-pipeline/`. "The role" is the implementor role machine (`src/roles/implementor/`).

1. **B1 Entry and registration.** `IMPLEMENTOR_STAGES` is `["implement", "fix"]`, so `job.mjs --stage fix` runs the implementor role (`roleOf("fix")` is the implementor; `open-pr` stays stage code). A run saved at `fix` starts at `start`, whose check answers `fix` and goes to `fix-work?`. The `fix` entry's states live in `src/roles/implementor/fix.ts` and `machine.ts` joins them with one spread. No implementor module imports from `src/roles/{triage,spec-writer,reviewer}/`. The lanes' `stages/fix.ts` and `stages/rereview.ts` are unchanged.
2. **B2 Every edge.** The `fix` entry takes exactly the edges in `test/implementor-fix-edge-fixtures.mjs` (`FIX_EDGES`) and `test/implementor-fix-lens-edges.mjs`, each giving its next state, effect and data change; each state accepts only its listed results; `checkTable(TABLE, LIMITS, …)` reports no fault. In summary:
   - `fix-work?` (check `fix-work?`): `open` → `fixer` (session `fix-rN`, `fixRounds`+1) while `fixRounds` < `maxFixRounds`, else → `findings-open`; `none` → end `saved(checks)`.
   - `fixer` → `replied` → `fixer-reply`, storing the reply read by `fixReplyOf` as `fixReply` (null when it doesn't read), setting `round` = `fixRounds`, and recording each dispute once on its finding (`disputed: true`, `dispute` evidence).
   - `fixer-reply` (check `fixer-reply`): `acceptance` → end `stopped(acceptance)` with `ACCEPTANCE_REASON` and the findings text, before any push; `done` → `fix-flows`; `handoff` → `fixer` (session `fix-rN-cM`) while `fixContinuations` < `maxContinuations`, else end `stopped(too-large)` with `outOfRoomReason("fixer", max)` and the handoff file; `bad` → end `stopped(error)`, "the fixer's reply could not be read".
   - `fix-flows` (check `fix-flows`, which pushes): saves `headSha` and `flows`; `go` → `prepare-rereview` (op `prepare-review`); `reopen` → end `saved(open-pr)`; `none` → end `stopped(not-doable)`, "the fix left the branch with no code change".
   - `prepare-rereview` → `ok` → `rereview-correctness?`, saving `diffPath` and `patchId`.
   - For each lens in `ALL_LENSES` order (correctness, tests, scope, security, acceptance): `rereview-<lens>?` (check `rereview?`, payload `{number, lens, open}`) `open` → `rereview-<lens>` (session `rereview-<lens>-rN`), `none` → the next lens's check; `rereview-<lens>` `replied` → the next lens's check, storing the raw reply in `rereviews[lens]`. After acceptance: `update-findings`.
   - `update-findings` (check `update-findings`): `resolved` → end `saved(checks)` with the settled findings and history, `reviewedSha` = `headSha`, `reviewedPatchId` = `patchId`, `testsOnly: false`; `open` → `fixer` (session `fix-r(N+1)`) with `reviewedSha` = `headSha` and `reviewedPatchId` unchanged while `fixRounds` < max, else end `stopped` with `findingsStopReason`/`findingsStopCode` (`review-rounds`, or the open security finding's category); `reintroduced` → end `stopped(fix-loop)`, "a fix reintroduced finding fN; fixes are undoing each other"; `bad` → end `stopped(error)`, "a re-reviewer failed".
3. **B3 Sessions as today's.** The fixer runs on `issue-pipeline-writer` with `models.fixer`, `FIX_SCHEMA`, budget role `fixer`, `attempt` = the round, and a task from `fixTask` (the open findings, the spec, the practices, "fixer, round N of max", the `Pipeline-Agent: fixer round N` trailer, the load rule and the handoff file). A continuation keeps its round's attempt and leads with the handoff. Each re-reviewer runs on `issue-pipeline-reader` with `models[lens]`, `REREVIEW_SEC_SCHEMA` for security and `REREVIEW_SCHEMA` otherwise, budget role `rereviewer`, a task from `rereviewTask` with only that lens's open findings, the diff path and the resolved history. `prepare-review`'s payload is `{number, sinceSha: reviewedSha, tag: "rN"}` (`"sS-rN"` after S security rounds), plus `stackedOn` when the issue is stacked.
4. **B4 Round and continuation counts.** `fixRounds` is a role checkpoint, limited by `maxFixRounds` (`LIMITS` default 2; `limitsOf(cfg)` gives `{maxContinuations, maxFixRounds}` from the config). A round counts when it begins, so a half-done round counts as used. The fixer's continuations are their own checkpoint, `fixContinuations`. The role's checkpoints are `continuations`, `fixContinuations`, `fixRounds`, `conflictFixes`, `ciFixRounds`; its hand-off fields add `round`, `reviewedSha`, `reviewedPatchId`, `nextFindingId`, `resolvedHistory` and `testsOnly` to today's.
5. **B5 Old states resume.** `locate` on a state saved by today's `fix` stage, in any phase (`fixed`, `pushed`, `prepared`, `rereviewed`, none), starts at `start` with entry `fix`; `fixRounds` = max(`checkpoints.fixRounds`, `round`) and `round` mirrors it; `fixContinuations` = max(`checkpoints.fixContinuations`, `continuations.fix`), apart from the implementer's count; `reviewedSha`, `reviewedPatchId`, `nextFindingId`, `resolvedHistory`, `securityRounds` and `stackedOn` are read back. So an old state at round 2 (default max) stops `review-rounds` at `fix-work?` with no session, and one with `continuations.fix: 1` stops `too-large` on its next handoff.
6. **B6 Stage job.** `job.mjs --stage fix` with F1 open (mock model, local git, fake ops):
   - fixer `done` then re-reviewer `resolved`: two sessions, one push, `prepare-review` since the reviewed head tagged `r1`, no PR op, end `{kind: "saved", stage: "checks"}`; the saved state has `reviewedSha` = the pushed head, `reviewedPatchId` from `prepare-review`, `testsOnly: false`, `round: 1`, `checkpoints.fixRounds: 1`, F1 resolved; the fixer's comment (`fixComment`) and the re-reviewer's comment ("Re-review of the fix in …") are posted on the PR through the `post` op.
   - with `maxFixRounds: 1` and the finding unresolved: end `stopped`, code `review-rounds`, reason "blocking findings remain after 1 fix rounds".
   - an acceptance finding the fixer disputes: end `stopped(acceptance)` after one session and no push.
   - a reintroduced finding: end `stopped(fix-loop)`.
   - an issue whose PR is closed (wiki-only) and whose fix adds code: end `saved(open-pr)`, no `prepare-review`, no PR op.
   - an old state `{round: 2, phase: "rereviewed"}`: end `stopped(review-rounds)` with no session.
7. **B7 A new review cycle zeroes both counts.** When the review starts (its `prepare-review` reply) and when the security review sends a finding to fix, `checkpoints.fixRounds` becomes 0 along with `round`; other checkpoints are kept.
8. **B8 Open-pr reopens a closed PR.** The `open-pr` stage's first `open-pr` op carries `reopen: pr` when `prClosed` is true, and its opened reply clears `prClosed` and goes to review with no second PR op.

## Out of scope

- The start sync before the fixer (#419), `retest`/`conflict` findings and `ci-fixer` (#420), `next(checks)` instead of `saved(checks)` (#424).
- Sending a finding about a wrong spec test to the spec writer (deferred).
- The lanes' `stages/fix.ts` and `stages/rereview.ts`, which stay as they are.
- Closing the PR from the role: a fix that leaves no code stops (see Design).

## Design

**Coding practices that bear on it** (`CONTRIBUTING.md`, `AGENTS.md` `practices-cover-all-code`): deep modules and information hiding (each decision in one module: the tasks and schemas stay in `stages/review-text.ts`, `stages/review-replies.ts` and `workflow/review-schemas.ts`, the finding rules in `workflow/findings.ts`, the flows in `workflow/flows.ts`, and the role reuses them rather than copying); the strictest TypeScript (no `any`, `!` or `as` beyond a validated boundary, exhaustive switches, `import type`, no ternaries); Biome's `all` preset, 300 lines per file and 50 per function, which is why the entry may need a second module (for example `fix-checks.ts` beside `checks.ts`) and the tests are split across kits; test-first, mock model, and a flake is a failure.

**The machine** (wiki Pipeline-Roles-Shared, "Role machines"; Pipeline-Roles-Implementor, "Built (#414)"):
- `src/roles/implementor/fix.ts` (stub committed) holds `FIX_STATES: ImplStates<FixState>`, in the style of `implement.ts`; `machine.ts:22-27` already spreads it into `TABLE` (`entries` stays `["start"]`). `start.ts:11` gains `fix: { to: "fix-work?" }`. Ends reuse `ends.ts` helpers (`stopped(code, reason, detail)`, `saved(stage)`).
- `ImplState`, `ImplEntry`, `ImplData` (`locate.ts:62` and around) and `ImplResult` (`states.ts:24`) already carry the stubs' type-only additions. The implementer must make `ImplData.fixContinuations` a required number, since the guard's count field takes only required numbers.
- **One session per state** (`roles/machine.ts` `SessionEffect`, `job/runner.ts`): the re-review is a chain of `rereview-<lens>?` checks and `rereview-<lens>` sessions in `ALL_LENSES` order. A single self-looping `rereview` state was rejected because `checkTable` rejects an unguarded cycle; one state launching every lens can't be expressed.
- **Guards:** `fixRounds` on the edges into `fixer` (`fix-work? open`, `update-findings open`), over → `findings-open`; `fixContinuations` on `fixer-reply handoff`, over → `fixer-out-of-room`. `LIMITS` (`machine.ts:20`) gains `maxFixRounds: 2`; `implementor.ts:19` `limitsOf` returns `cfg.maxFixRounds` too (`config-schema.ts:34`).
- `implementor.ts:14` `IMPLEMENTOR_STAGES = ["implement", "fix"]`; `registry.ts:121` loops it unchanged. `implementor.ts:23-24` gain the hand-off fields and the `fixContinuations` checkpoint of B4.

**Locate** (`locate.ts:231`): the entry comes from `saved.stage` (`"fix"` → fix, else implement; today `locate.ts:246` hard-codes `"implement"`). `fixRounds` = max of the checkpoint and `st.round`, because the implement entry already writes `checkpoints.fixRounds: 0` and the lanes write `round`; `fixContinuations` likewise from `continuationsOf(saved, "fix")` (`stages/continuation.ts`), as `oldContinuations` does for the implementer (`locate.ts:182-189`). Old phases need no mapping: every run starts at `start`, and a half-done round is a used one, as in today's `stages/fix.ts:119-134`, which counts the round when the fixer launches.

**Checks** (`checks.ts`, or a sibling module for the 300-line limit). Effects stay pure; the check functions do the I/O:
- `fix-work?`: `openFindings(item)` non-empty → `open`, else `none`.
- `fixer-reply`: posts the fixer's comment `fixComment(reply)` on the PR (`number` = `pr ?? issue`, signed `by` with role `fixer (round N)`) through the `post` op's `comments`, as `roles/spec-writer/checks.ts:131-154` does; answers `acceptance` when `acceptanceDisputeStop` (`findings.ts:135`) finds one, else the reply's status, `bad` for a null reply.
- `fix-flows`: the `push` op as the implement entry's `flows` check does, then `prFlowAction(flows, prClosed || pr == null)` (`flows.ts:33`): `go` → `go`, `reopen` → `reopen`, `stop` and `close` → `none`.
- `rereview?`: `{lens, open}` from the payload; `open` > 0 → `open`.
- `update-findings`: ports `stages/rereview.ts`: `rereviewReplyOf` each stored reply (a null → `bad`), `settle` (`rereview.ts:122`, `KEPT_RESOLVED` 30, `CLOSING` = resolved and dispute-accepted), `addFinding` for new findings, a `recursId` → `reintroduced` (`rereview.ts:227`), and posts each `rereviewComment` (`review-text.ts:263`) on the PR. Answers with `{findings, resolvedHistory, nextFindingId, stop}` and the result.
- Port `recordDisputes` (`stages/fix.ts:137`) into the fixer's `replied` apply (evidence clipped as today).

**Today's stage code** keeps running in lanes. The stage code's `review.ts:123` and `security.ts:213` zero `round` when a cycle starts; they now also zero `checkpoints.fixRounds` (B7), or the role's max() would carry the last cycle's count. `accept.ts:173` doesn't zero either, so acceptance rounds count toward the limit, as the wiki's `bounded-fix-loop` says.

**Reopen.** No implementor state sends a PR op (wiki Pipeline-Roles-Implementor, "Built (#414)"; asserted by `roles-implementor-machine.test.mjs`). A reopen ends `saved(open-pr)`, so `stages/open-pr.ts:25` `begin` must pass `reopen: pr` when `prClosed` (B8): today it doesn't, and `ops/pr.ts:185` `existingPr` would create a second PR. After the reopen, open-pr sends the issue to `review`, not straight to re-review: a full review of the reopened change, a small departure from the lanes' fix stage, which re-reviewed.

**Departure, recorded in the wiki:** `prFlowAction`'s `close` (the fix left only wiki changes on a PR that is open) ends `stopped(not-doable)` rather than closing the PR, because the role sends no PR op; a fix that removes every code change from a code issue is almost certainly wrong. Pipeline-Roles-Implementor's `fix-flows` row says so.

**Design it twice:** the per-lens chain was chosen over (a) a `rereview` state that re-enters itself with a `lenses` list in data, which `checkTable` rejects as an unguarded cycle and which hides the lens in data, and (b) one `rereview` state per lens with its own module, which repeats the session spec five times; the chain shares one `rereview?` check and one session builder keyed by lens.

## Test interfaces

Each entry's `behaviours` in the reply quote the Behaviour items it checks.

- `TABLE`, `transition`, `LIMITS` (`src/roles/implementor/machine.ts:20-38`, changed): B2 (all its items), B3, B4.
- `locate(saved, context)` (`src/roles/implementor/locate.ts:231`, changed): B4, B5.
- `implementorMachine`, `IMPLEMENTOR_STAGES` (`src/roles/implementor/implementor.ts:14-27`, changed): B1, B4.
- `FIX_STATES` (`src/roles/implementor/fix.ts`, new; stub committed): B1, B2, B3.
- `roleOf(stage)` (`src/roles/registry.ts:106`, existing): B1.
- `job.mjs --stage fix` (`src/job.ts`, cli, existing): B6 (all its items).
- `next(state, ctx, results)` of `stages/review.ts:276` and `stages/security.ts:241` (changed): B7.
- `next(state, ctx, results)` of `stages/open-pr.ts:70` (changed): B8.

## Tests

All fail today on missing behaviour (stub states throw "not built", `TABLE` lacks the edges, the old stage runs under `--stage fix`), not on imports or types. `npx tsc -p tsconfig.test.json` and `biome check --error-on-warnings` pass on them.

- `test/roles-implementor-fix-machine.test.mjs` (TABLE/transition, FIX_STATES): every edge of `FIX_EDGES` and `LENS_EDGES` (B2); only listed results (B2); start answers `fix` (B1); the fixer and continuation sessions (B3); each lens's re-reviewer session and its `rereview?` payload (B3); prepare-review's payload (B3). Fails: "start doesn't accept fix", "fix-work? doesn't accept open", stub effects throw.
- `test/roles-implementor-fix-resume.test.mjs` (locate, transition): old phases start at start with entry fix (B5); fixRounds and round (B4, B5); fixContinuations (B4, B5); hand-off read back (B5); old round 2 stops review-rounds; old continuations.fix 1 stops too-large (B5). Fails: locate's entry is "implement", no fixRounds or fixContinuations.
- `test/roles-implementor-machine.test.mjs` (updated; TABLE, LIMITS, implementorMachine): edges of both entries are covered and only the implementer, fixer and re-reviewers run a model with no PR op (B2); `LIMITS` and `limitsOf` give `maxFixRounds` (B4); checkpoints and hand-off fields (B4); no table faults (B2). Fails: LIMITS lacks maxFixRounds, the lists lack the new fields.
- `test/roles-implementor-isolation.test.mjs` (updated; IMPLEMENTOR_STAGES, roleOf): `["implement","fix"]`, `roleOf("fix")` is the implementor, fix.ts imports nothing from other roles (B1). Fails: the list is `["implement"]`.
- `test/roles-implementor-fix-job.test.mjs` (new; `job.ts --stage fix`): the six cases of B6. Fails: today's stage code runs, so the summary has no `end` and the state has no checkpoint.
- `test/workflow-stages-fix-rounds-reset.test.mjs` (new; review and security `next`): B7. Fails: `checkpoints.fixRounds` stays 2.
- `test/workflow-stages-openpr-next.test.mjs` (one new test; open-pr `next`): B8. Fails: the payload has no `reopen`.
- Kits: `implementor-fix-test-kit.mjs`, `implementor-fix-edge-fixtures.mjs`, `implementor-fix-lens-edges.mjs`; `implementor-job-test-kit.mjs` now exports `claimed`.

## Wiki updates

- Pipeline-Roles-Implementor: "Entry `fix`" table as built (#418), with `fixer-reply`, `fix-flows` and the per-lens chain; a "Built (#418)" note on the module, counts, resume and reopen; `IMPLEMENTOR_STAGES`.
- Issue-Pipeline, `bounded-fix-loop`: how the role runs the loop.
- Pipeline-Roles-Reviewer, "Re-review": the re-reviewers as sessions of the implementor's fix entry.

## Assumptions and risks

- `fix-work? none` and `update-findings resolved` end `saved(checks)` until #424, as the issue says.
- After a reopen the issue gets a full review, not a re-review (B8); acceptable, as the full review covers the fix.
- `fixRounds` = max(checkpoint, round) relies on B7 zeroing the checkpoint; a lane path that resets `round` elsewhere without the checkpoint would carry a count over. Only review and security reset it today (grep of `stage = "fix"`: `review.ts:262`, `security.ts:214`, `accept.ts:173`).
- The fixer's comment and each re-reviewer's comment are posted from checks, so a killed job may repost one comment on restart; the same holds for the implement entry.
- The job test's comments are matched by body text, so a change to `fixComment` or `rereviewComment` text moves with them.
- No load or timing flake was seen: each test file was run once; the job tests took 1.5–2.6 s each.

## Sources

- Issue #418; triage notes; the previous spec writer's handoff.
- `CONTRIBUTING.md`, `AGENTS.md`; wiki Decisions-Code-and-tooling (`practices-cover-all-code`).
- Wiki: Pipeline-Roles-Implementor ("Entry `fix`", "Fix (the fixer's half)", "Built (#414)"), Pipeline-Roles-Reviewer ("Re-review"), Pipeline-Roles-Shared ("Role machines"), Issue-Pipeline (`bounded-fix-loop`, `review-keeps-on-clean-rebase`).
- Code: `src/roles/implementor/{machine,locate,states,implementor,start,checks,ends,implement,fix}.ts`, `src/roles/registry.ts:121`, `src/roles/walk.ts:46,101`, `src/roles/spec-writer/checks.ts:131-154`, `src/workflow/stages/{fix,rereview,review,security,accept,open-pr,flow-step,review-text,review-replies,continuation}.ts`, `src/workflow/{findings,flows,review-schemas}.ts`, `src/ops/pr.ts:185-228`, `src/config-schema.ts:34`.

<!-- end of spec -->
