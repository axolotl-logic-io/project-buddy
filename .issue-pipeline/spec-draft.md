## Behaviour

1. On the role runner, a session that fails with a transient provider error (`isTransientSessionError`: a rate limit, an overload or a transport error) ends the run `{ kind: "held", rateLimited: true }`, even at a machine state that lists `failed` or a linear step with `recover`: the role's `failed` edge and `recover` never see the error, no retry session runs, and no end op (such as `stop`) runs.
2. A run that ends held as rate-limited saves the issue at its stage with no lease and the state it last saved, except that each count the run took (the field of a guarded edge's `count`, such as the spec writer's `attempts` and `continuations` or the toy machine's `tries`) is saved back at its value when the run began. Other checkpoints, such as the spec writer's start heads (`startSha`), keep the value last saved.
3. A spec writer session that fails on a 429 `rate_limit_error` or on a transport error such as `ECONNRESET` ends the run held as rate-limited at stage `spec`: no `retry` check, no `stop` op, no GitHub write and no stop label, with `attempts` and `continuations` as the run began. A continuation session (after a handoff) that hits a rate limit puts back the continuation it took as well.
4. A `job.mjs --stage spec` job whose session hits the rate limit prints the end `{ "kind": "held", "rateLimited": true }`, asks for no `stop` op, prompts pi once, saves the issue at `spec` with no lease and no attempt counted, and writes `job.json`'s outcome `{ "kind": "finished", "rateLimited": true }`, so the orchestrator starts its backoff.
5. Any other session failure still goes to the state's own `failed` edge: the spec writer uses its one retry, and a second failure stops the issue with "the spec writer failed twice" (`agent:stopped-error`).
6. A transient failure followed by a later run whose session replies leaves the retry unused: the later run goes on as a first attempt (the spec writer ends saved at `implement` with `attempts` 1 and no `retry` check in either run).

## Out of scope

- Ops and checks that fail with a transport error: they keep today's handling (a state that lists `failed` takes them; otherwise `failedEnd`, which already holds a transport error as rate-limited). Only session positions are intercepted, as triage decided, since a script state's own `failed` edge may need the error.
- The sweep's stages in `workflow.js` and `src/workflow/stages/` (the old spec stage included); the orchestrator's backoff (`src/orchestrator/rate-limit-backoff.ts`); `isTransientSessionError`'s classification.
- `job.json`'s `rateLimited`: it already comes from the run's end (`src/job.ts:204`, `rateLimitedRun` in `src/workflow/stages/rate-limit.ts:114-118`), so it needs no change (triage note 3, checked).

## Design

**Cause.** `advance` (`apps/issue-pipeline/src/job/runner.ts:205-237`) sends a failed step to `failedEnd` (`runner.ts:75-83`), which holds the run as rate-limited, only when `walk.takesFailure(position)` is false (`runner.ts:225`). The spec writer's `session` state lists `failed: { to: "retry", apply: failed }` (`src/roles/spec-writer/machine.ts:265`), so `machineWalk.takesFailure` (`src/roles/walk.ts:120-121`) is true and a 429 takes the retry; the second 429 ends at `failed-twice` (`src/roles/spec-writer/ends.ts:61`, reason `FAILED_TWICE`, `src/roles/spec-writer/task.ts:34`). `linearWalk` behaves the same for a step with `recover` (`walk.ts:150-158`).

**1. The runner owns a session's transient error.** In `advance`, after `stepOf` and before the `takesFailure` branch: when `!outcome.ok`, `position.kind === "session"` and `isTransientSessionError(outcome.error)` (already imported, `runner.ts:27`), `return await finish(run, walk, data, failedEnd(outcome.error))`. `finish` then calls `release` (`runner.ts:131-132`) and `settle` returns the bare `held` end with no op (`runner.ts:98-101`). This covers both walk kinds; `walk.ts` needs no behaviour change.

**2. Put back the counts the run took.** Triage's note 1 assumed `release` alone keeps the counts. It doesn't for the spec writer: `checkout` counts `attempts` on its way to `session` (`machine.ts:145`, `ATTEMPTS`), and `checkpoint` saves a changed checkpoint before the next effect runs (`runner.ts:240-258`, `checkpointsChanged` in `src/job/role-state.ts:28-37`). So `run.saved` already holds `attempts: 1` when the session fails, and `release` (`runner.ts:70-73`) would save it: three rate limits in a row would stop the issue at `failed-twice` on the third job's `checkout`. A handoff's `continuations` count (`machine.ts:157`) and the implementor's (`src/roles/implementor/implement.ts:78`) are taken the same way. The wiki promises the counts "stay as they were when the stage began" (`rate-limit-defers`).
- Keep the run's entry state (`entry.saved`, `runner.ts:269-271`) on `Run` as the state the run began with.
- On a rate-limited held end, `release` saves `run.saved` with no lease and with each count field the walk declares put back at its value in the begun state's `checkpoints`, a count missing there reading as 0, as every role's locate reads it (`countOf` in `src/roles/machine.ts:121-127`). A count whose value didn't move is left as saved, so the existing "saving the state it last saved" tests (`test/job-runner.test.mjs:86-101`) keep passing. Other checkpoints and hand-off fields stay as last saved. A prototype of 1 and 2 (not committed) passed all 13 new tests, `job-runner.test.mjs`, `job-rate-limit.test.mjs` and every `roles-*` and `job-role*` test.
- Which fields are counts. Design it twice: (a) put back every numeric checkpoint: smallest, but it leaks a guess ("a number is a count") into the runner, and a future numeric checkpoint that isn't a count would be reset; (b) the walk says which fields its counts are: `machineWalk` collects each edge's `count.field` over `machine.table.states` (`Guard` in `src/roles/machine.ts:76-88`), and `linearWalk` has none. **Choose (b)**: the knowledge stays in the table that declares the guards (information hiding), and `Walk` (`walk.ts:78-83`) gains one member, such as `counts: readonly string[]`. That member is internal to the runner and its walks, so it is not a test interface.
- Where it lives: `runner.ts` is at the 300-line limit now, so the put-back goes in `src/job/role-state.ts`, the module that decides what a run writes to the issue's state (for example a `releasedState(saved, begun, counts)` beside `writtenState`). `release` calls it.

**3. Comments.** Update the runner's header (`runner.ts:1-13`, which says the runner owns only "a failure the role doesn't list"), the `Walk.takesFailure` comment (`walk.ts:78-79`: the runner asks it only for failures that aren't a session's transient provider error), and `release`'s comment (`runner.ts:68-69`), so they say what the code now does.

**Practices followed** (Coding-Practices-Digest): deep modules and *pull complexity downward*: the runner handles the transient case once, so no role special-cases it in its table. *Information hiding*: the counts come from the table's guards, and the save shape stays in `role-state.ts`. *Define errors out of existence*: a missing count reads as 0. *Design it twice* (above). Lint limits: 300 lines per file (hence `role-state.ts`) and 50 per function. Strict types: no `as`, no `!`; read the record with destructuring or `Object.entries`, not bracket reads. Tests follow `tests-pin-promised-behaviour` (end kinds, stop ops, saved counts, the stop reason, job.json's outcome, past bugs #419 and #420), are deterministic with scripted session results, and use the bounded job kit. Wiki decisions: `rate-limit-defers` (counts kept, the orchestrator backs off), `role-state-machines` / "Failures the runner owns" (Pipeline-Roles-Shared), `every-role-resumes` (the runner reads only the saved state it is given). The issue doesn't depart from any of them; the wiki pages are updated to say how the runner meets them.

## Test interfaces

- `runMachine(machine, entry, effects): Promise<RunEnd>` and `runLinear(script, entry, effects): Promise<RunEnd>`: `apps/issue-pipeline/src/job/runner.ts:278` and `:287`, existing. The tests drive them through `test/runner-test-kit.mjs` (`uninterrupted`, `world`, `runToy`), with toys from `test/runner-toys.mjs` and the real `specWriterMachine`.
- `job.mjs --stage spec`: the stage job CLI, `apps/issue-pipeline/src/job.ts:204` (its printed end and `job.json`'s `outcome`), existing, driven through `test/job-test-kit.mjs` with the fake pi's `rejectPrompt`.

## Tests

All use the mock model (fake effects or the fake rpc pi) and scripted session results. "Fails today" was checked by running each file once on the base.

`apps/issue-pipeline/test/job-runner-transient.test.mjs` (new; `job-runner.test.mjs` is at 286 of 300 lines). It adds a toy machine whose `work` session state lists `failed` (back to `work`, guarded by `tries` with `maxTries` 1, over to a `gave-up` end with a `stop` op), and the toy linear script with `recover` on its session step:
- "a rate limit / a transport error / a connection reset in an api_error / an overload in a session state that lists failed ends held as rate-limited, with no retry and no stop": drives `runMachine`, pins Behaviour 1 and 2. Fails today: ends `stopped(limit)` after the failure takes the retry.
- "a rate limit in a linear session step that recovers ends held, and the step's recover never runs": `runLinear`, Behaviour 1. Fails today: `recover` runs and the run ends `saved(spec)`.
- "a rate-limited run saves the counts it took back at their values when it began": `runMachine` with the plain toy (verify fails once, so `tries: 1` is saved before the second session hits the rate limit). Behaviour 2. Fails today: `tries` is saved as 1.
- "any other session failure still takes the state's failed edge, and a second one stops": Behaviour 5, a regression guard that passes today.
- "a rate-limited run followed by a run whose session replies leaves the retry unused": two runs over one store, Behaviour 6. Fails today: the first run doesn't end held.

`apps/issue-pipeline/test/roles-spec-writer-rate-limit.test.mjs` (new): `runMachine(specWriterMachine, …)` on the runner's fakes, with the spec writer's `SPEC_OPS` and check fakes:
- "a spec writer session that fails on a rate limit / transport error ends held as rate-limited, with no retry, no stop and no attempt counted": Behaviour 3 and 2 (`startSha` kept as `s1`). Fails today: the retry runs and the scripted second session's ready reply ends the run `saved(implement)`.
- "a continuation session that hits a rate limit puts back the continuation it took": Behaviour 3 and 2. Fails today: the failure takes the retry.
- "any other session failure uses the one retry, and a second one stops the issue as failed twice": Behaviour 5 (end `stopped(error)`, two `retry` checks, one `stop` op, `stopReason` "the spec writer failed twice", label `agent:stopped-error`). A regression guard that passes today.
- "a rate-limited run, then a run whose session replies, leaves the retry unused": Behaviour 6. Fails today: the first run doesn't end held.

`apps/issue-pipeline/test/job-rate-limit.test.mjs` (changed): "a spec job whose session hits the rate limit ends held, saved at spec with no attempt counted" drives `job.mjs --stage spec` with every prompt rejected with the 429 text. Behaviour 4. Fails today: the end is `{ kind: "stopped", code: "error" }`.

Stubs: none. No new interface is added, and no type is extended.

## Wiki updates

- `Pipeline-Roles-Shared.md`, "Failures the runner owns": a session's transient provider error is always the runner's, even at a state with `failed` or a step with `recover`; the run ends held rate-limited with the counts it took put back, and other checkpoints kept.
- `Pipeline-Roles-Spec-Writer.md`: the `session` row's `failed → retry` gets its transient exception, and "Failure handling" says a transient failure isn't a failed spec session.
- `Running-the-Issue-Pipeline.md` (Network errors, `rate-limit-defers` paragraph) and `Issue-Pipeline.md` (`rate-limit-defers` decision): the role runner (triage, the spec writer, the implementor) puts back the counts the run took, even where the role takes the session's failure, citing #419, #420 and #446.

The digest is unchanged, since no practice changed.

## Assumptions and risks

- **The counts go back to the run's start, not to just before the failing session.** A run whose handoff session finished and whose continuation then hit a rate limit saves `continuations` and `attempts` as they were when the job began. This matches the wiki's "as they were when the stage began", and the next job resumes from the pushed commits and `handoff.md`. The cost is that an issue under persistent rate limits never stops; the orchestrator's backoff (up to 30 minutes) bounds what that costs.
- **The implementor changes too.** A continuation session that hits a rate limit no longer keeps its `continuations` count (`implement.ts:78`). The issue's last Behaviour item asks for this ("the same holds for any role state on the runner"), and the wiki promises it.
- **A count missing at the start is saved as 0** (only when it moved), since every locate reads a missing count as 0.
- Behaviour 5 already holds on the base. Its tests are regression guards and pass today; every other test fails on its first behavioural assertion.
- No instructions were found in code, logs or wiki text that tried to change this task.

## Sources

- Issue #446 and its triage notes (`runs/…/issue-446/issue.md`).
- `apps/issue-pipeline/src/job/runner.ts` (lines 1-13, 27, 68-83, 98-146, 205-275), `src/job/role-state.ts:1-57`, `src/roles/walk.ts:35-160`, `src/roles/machine.ts:66-148`, `src/roles/spec-writer/machine.ts:60-80, 135-195, 258-296`, `src/roles/spec-writer/ends.ts:61`, `src/roles/spec-writer/task.ts:34`, `src/roles/spec-writer/edges.ts:20-22`, `src/roles/implementor/implement.ts:78`, `src/roles/implementor/implementor.ts:24`, `src/job.ts:204-209`, `src/workflow/stages/rate-limit.ts:114-118`, `src/job/status.ts:30-37`.
- Tests and kits: `test/job-runner.test.mjs`, `test/runner-test-kit.mjs`, `test/runner-toys.mjs`, `test/roles-spec-writer-kill.test.mjs`, `test/spec-writer-run-test-kit.mjs`, `test/spec-writer-role-test-kit.mjs`, `test/job-rate-limit.test.mjs`, `test/job-test-kit.mjs`, `test/fake-rpc-pi.mjs:119-120`.
- Wiki: Coding-Practices-Digest; Issue-Pipeline (`rate-limit-defers`); Running-the-Issue-Pipeline (Network errors; Orchestrator, "Provider rate limit"); Pipeline-Roles-Shared ("Failures the runner owns", `role-state-machines`); Pipeline-Roles-Spec-Writer (Lifecycle, Failure handling).
- No web sources were needed.

<!-- end of spec -->
