## Behaviour

1. A spec run that ends by asking questions (`ask` → `asked`, saved at `triage`) saves `attempts` and `continuations` at 0 in the issue's checkpoints, whatever the run used. This includes #419's case: a handoff's continuation, a `ready` reply whose commit check (`spec-tests-check`) fails, and a retry that replies `needs-info`.
2. That save keeps `startSha` and `startWikiSha` as the run had them. The `reset` before `ask` has already put the code and wiki branches back at those heads.
3. A spec run that starts after triage passes the issue back to `spec` gets the full budget. Its `checkout` goes to `session`, its first session runs as attempt 1 with `continuations` at 0, and no `stop` op runs before that session. It does not end with `agent:stopped-error` or "the spec writer failed twice".
4. Within one spec stage, the counts still hold. A run resumed at `spec` with `attempts: 1` saved (a crash restart) runs its session as attempt 2. A second failure in that run still stops the issue with "the spec writer failed twice" and `agent:stopped-error`.
5. Nothing else about the counts changes. A lifted stop still resets them (`checkpointsReset`). A rate-limited run still puts back the counts it took (#446). A crash restart still keeps them. The `published` edge still saves `continuations` at 0 (#414).

## Out of scope

- The triage role (`src/roles/triage/`), its checkpoints and its save. This spec uses the issue's first seam, so triage does not change.
- `locate.ts`, `start-state.ts` (`checkpointsReset`, `resumedStop`, `noWorkStart`), `src/ops/claim-state.ts` and `src/job/role-state.ts`.
- The `ok` edges of `checkout` and `retry`, the `ATTEMPTS` and `CONTINUATIONS` guards, and `LIMITS`.
- The other ends: `split-opened`, `no-work`, `failed-twice`, `split-refused` and `out-of-room`. A split releases the issue, and a stop's lift already resets the counts.
- The legacy sweep spec stage (`src/workflow/stages/spec*`). The issue concerns the role runner only.
- Any issue already stopped by this bug, such as #419. Lifting its stop resets its counts already.

## Design

**The seam is the spec writer's own exit to triage.** This is the issue's first option, and triage chose it. The knowledge that the spec writer's counts belong to one spec stage stays in the spec writer (information hiding, `aposd-and-strict-typing`). Triage does not need to know the other role's checkpoint names. The other seam was to have a triage pass clear the counts. It was rejected for three reasons: triage declares no checkpoints (`src/roles/triage/script.ts:135`); clearing would leak the spec writer's field names into another role; and `job-role-stage`'s rule that a role saves only its declared fields would need an exception.

**The change** is one edge and one pure function:
- `apps/issue-pipeline/src/roles/spec-writer/edges.ts`: add `spent(data: SpecData): SpecData`, which returns `{ ...data, attempts: 0, continuations: 0 }`. It is pure, like `failed` (`edges.ts:20`) and `published` (`edges.ts:94`). `published` already zeroes `continuations` for the same kind of reason (#414). Export it beside the others. Its comment says what it promises: a return to triage starts the next spec run with a new budget, and the start heads stay.
- `apps/issue-pipeline/src/roles/spec-writer/machine.ts:208-215`: the `ask` state's edge becomes `{ to: "asked", apply: spent }`, and `spent` is imported from `./edges.ts`.
- `machine.ts:61-63`: the `LIMITS` comment ("counted across crash restarts (a lifted stop's restart resets the counts)") also says that a return to triage resets them.

**Why it works.** `transitionOf` (`src/roles/machine.ts:157`) runs `edge.apply` before `taken`, so when the `asked` end runs, its `data` already holds the zeroed counts. The end's save, `writtenState` (`src/job/role-state.ts:40-55`), merges `checkpointsOf(data)` over the saved checkpoints for every declared checkpoint (`machine.ts:296`). So it writes `attempts: 0` and `continuations: 0` and keeps `startSha` and `startWikiSha`. Triage's save then merges no checkpoints of its own and carries those zeros forward. Two more steps finish the path: `locate` (`locate.ts:124-136`) reads them back, and `checkout`'s `ATTEMPTS` guard (`machine.ts:72-76`, `:145`) counts the first session as attempt 1.

**Why not the `asked` end.** An end state has no `apply`. Its effect (`ends.ts:57`) can only name the `End`, and `writtenState` takes the counts from `data`. So the edge into `asked` is the only place in the role that can set them.

**Practices followed** (Coding-Practices-Digest):
- Deep modules and information hiding: the budget rule lives in the spec writer's edges.
- A pure transition (`role-state-machines`).
- Explicit parameter and return types, and no casts.
- Files under 300 lines: `edges.ts` is at 172 lines and `machine.ts` at 300.
- Tests pin promised behaviour (`tests-pin-promised-behaviour`): the saved checkpoints, the stop reason, the label and the session's attempt, plus #419 by its issue number.
- Pipeline tests are bounded (`pipeline-tests-bounded`): every runner test uses the in-process fake world, and the git tests use local bare origins.

`machine.ts` is at 300 lines, the lint limit. Adding `spent` to the existing `./edges.ts` import and `apply: spent` to the edge may push it over. If it does, the implementer keeps the file within the limit without loosening the rule, for example by putting the edge's object on one line. No other runtime code changes. The wiki decisions this follows are on Pipeline-Roles-Spec-Writer. None is departed from.

## Test interfaces

- `transition(state, result)`, `apps/issue-pipeline/src/roles/spec-writer/machine.ts:272` (existing): the role's pure transition, driven through `stepFrom` in `test/spec-writer-role-test-kit.mjs` and the table rows in `test/spec-writer-edge-fixtures.mjs`.
- `specWriterMachine`, `apps/issue-pipeline/src/roles/spec-writer/machine.ts:277` (existing): run with `runMachine(specWriterMachine, entry, effects)` on the runner's fake world (`test/runner-test-kit.mjs`) and fake checks.
- `roleOf("spec").run(entry, effects, cfg)` and `roleOf("triage").run(...)`, `apps/issue-pipeline/src/roles/registry.ts:115` (existing): the spec writer with its real checks on bare origins, through `specWriter` in `test/spec-writer-git-test-kit.mjs`, and triage as the registry runs it.

## Tests

All are in `apps/issue-pipeline/test/` and use the existing kits: the mock session, fake ops and checks, and local git. Each file was run once.

`roles-spec-writer-retriage.test.mjs` (new; the runner's fake world, over one store):
- "the asked end takes the spec writer's counts back to 0 and keeps its start heads". Drives `transition`. Pins Behaviour 1 and 2. **Fails today:** the step's data keeps `attempts: 2, continuations: 1`.
- "a spec run that asks after a failed check and a continuation saves at triage with its counts at 0 and its start heads kept". Drives `specWriterMachine` through `runMachine`, replaying #419: a handoff, then `ready` with `spec-tests-check` failing, then a retry that replies `needs-info`. Pins Behaviour 1 and 2. **Fails today:** the saved checkpoints hold `attempts: 2, continuations: 1`.
- "after an asked spec run and a triage that passes, the next spec run's first session is attempt 1 and nothing stops". Drives `specWriterMachine` and `roleOf("triage")` over one store: spec, then triage, then spec. Pins Behaviour 3. **Fails today:** the third run ends `{kind: "stopped", code: "error"}` at `failed-twice` with no session.
- "within one spec stage the counts hold: a restart with one attempt saved runs attempt 2, and its failure stops the issue as failed twice". Drives `specWriterMachine`. Pins Behaviour 4. A regression guard: it passes today and must keep passing.

`roles-spec-writer-reset.test.mjs` (extended; the real checks on bare origins):
- "a run that asks after a failed commit check saves at triage with its counts at 0 and its start heads kept". Drives `roleOf("spec").run` through `specWriter`: a reply with a coverage gap fails the real `spec-tests-check`, and the retry asks, on existing branches. Checks the end, both sessions, the `agent:needs-info` label, the checkpoints `{startSha, startWikiSha, attempts: 0, continuations: 0}`, and both branches back at their start heads. Pins Behaviour 1 and 2. **Fails today:** the saved `attempts` is 2.

`spec-writer-edge-fixtures.mjs` (the table rows `roles-spec-writer-machine.test.mjs` walks):
- The `ask` → `asked` row now starts from `attempts: 2, continuations: 1` and start heads, and expects `attempts: 0, continuations: 0` with the heads kept. Drives `transition`. Pins Behaviour 1 and 2. **Fails today:** "ask ok attempts".

Existing guards for Behaviour 5 stay as they are:
- `start-state-resume.test.mjs:205-230`: a lifted stop clears the counts.
- `roles-spec-writer-rate-limit.test.mjs`: a rate limit puts back the counts.
- `roles-spec-writer-resume.test.mjs`: a crash restart keeps `attempts: 2`, and `published` saves `continuations: 0`.

They must keep passing. With `apply: spent` applied locally, then reverted, every new test passed (4/4 in the retriage file).

## Wiki updates

`Pipeline-Roles-Spec-Writer.md` (wiki commit `de86983`):
- **Lifecycle:** the `data` line says the counts are per spec stage and back at 0 after a return to triage. The `ask` row says the end saves `attempts` and `continuations` at 0 and keeps the start heads.
- **Checkpoints paragraph:** says a return to triage starts a new budget, how (the `ask` edge, then the end's save), and why (#419). It also says the counts still hold within a stage.
- **End marker and failures:** the two failed sessions are counted within one spec stage, and asking resets them.
- **Needs info:** says the same.

The coding-practices digest is unchanged.

## Assumptions and risks

- The issue asked for a `job.mjs --stage spec` case, "if the bounded job kit supports it". It is not written, because it would pin nothing:
  - The kit's claim replies with a fixed state, so a job test can't chain an asked spec job, a triage job and a spec job over one store.
  - A job started at `spec` with the counts the fixed `asked` save writes (0) passes today.
  - The CLI runs the same registered role (`roleOf("spec").run`) as `specWriter`, and the claim passes the saved state through unchanged (`src/ops/claim-state.ts:140-165`).
  - So Behaviour 1-3 are pinned on the runner, with fake and with real checks.
- The tests drive `specWriterMachine` through `runMachine` with fake checks, not `roleOf("spec")`, because the registry's run carries out the real checks (`registry.ts:85-91`). This is the pattern `roles-spec-writer-rate-limit.test.mjs` uses. The real-check path is pinned by the `roles-spec-writer-reset.test.mjs` case.
- Assumption: questions that are never answered leave the issue at `triage` with zeroed counts, which is harmless. Any later spec run is a new stage after triage.
- Risk: `machine.ts` is at the 300-line lint limit (see Design).
- No instructions were found in code, wiki or logs that tried to change this task.

## Sources

- Issue #454 and its triage notes.
- `apps/issue-pipeline/src/roles/spec-writer/machine.ts:61-76, 140-146, 186-193, 208-215, 272-297`
- `apps/issue-pipeline/src/roles/spec-writer/edges.ts:20-23, 53-67, 89-113`
- `apps/issue-pipeline/src/roles/spec-writer/ends.ts:57`
- `apps/issue-pipeline/src/roles/spec-writer/locate.ts:124-136`
- `apps/issue-pipeline/src/roles/machine.ts:135-171`
- `apps/issue-pipeline/src/job/role-state.ts:40-55`
- `apps/issue-pipeline/src/roles/triage/script.ts:130-136`
- `apps/issue-pipeline/src/roles/registry.ts:85-122`
- `apps/issue-pipeline/src/start-state.ts:153-187`
- `apps/issue-pipeline/src/ops/claim-state.ts:140-165`
- Tests and kits: `test/spec-writer-role-test-kit.mjs`, `test/spec-writer-run-test-kit.mjs`, `test/spec-writer-git-test-kit.mjs`, `test/runner-test-kit.mjs`, `test/triage-role-test-kit.mjs`, `test/roles-spec-writer-rate-limit.test.mjs`, `test/roles-spec-writer-resume.test.mjs`, `test/start-state-resume.test.mjs`, `test/job-rate-limit.test.mjs`, `test/job-role-stage.test.mjs`.
- Wiki: Coding-Practices-Digest, Pipeline-Roles-Spec-Writer ("Lifecycle", "Checkpoints", "End marker and failures", "Needs info").

<!-- end of spec -->
