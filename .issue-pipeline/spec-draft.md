## Behaviour

1. **B1 — the job records a failed claim.** A stage job whose claim fails (the claim op answers `ok: false` with an `error`) exits 0 and writes `job.json`'s outcome as `{ "kind": "finished", "claimError": "<the claim op's error>" }`. This holds for a stage that runs a role (such as triage or spec) and for a sweep-driven stage (such as accept). A job whose claim passes writes no `claimError`.
2. **B2 — the third failure in a row stops the issue.** When `claimFailureStreak` (default 3) of an issue's stage jobs end one after another with the same `claimError`, the tick that sees the last of them stops the issue through the stop op with code `error`. GitHub then shows:
   - `agent:stopped-error` on the issue (and on its PR, if it has one);
   - a coordinator stop comment that quotes the claim's error and says how to resume ("remove `agent:stopped-error`");
   - the saved state at `stage: "stopped"`, `stopCode: "error"`, with `stoppedStage` set to the stage the failing jobs ran.

   The tick logs `stopped` with reason `claim-failed` to `orchestrator.log` and starts no job for the issue that tick.
3. **B3 — fewer failures are retried as today.** Until the count reaches `claimFailureStreak`, the tick stops nothing for a failed claim, and the scheduler starts the issue's stage again as it does today.
4. **B4 — a different error, or a passing claim, resets the count.** A job that ends with a different `claimError` starts the count again at 1. A job that ends any other way (claim passed, no `claimError`) clears it. The stop names the error that repeated.
5. **B5 — lifting the stop resets the count.** While the issue carries a stop label, and right after this rule's own stop, the count is 0. The `job.json` that was there at the stop is not counted again. Once the label is removed, the scheduler starts the lifted issue at its stopped stage as today. A lifted issue (saved at `stopped`, no stop label) whose claims keep failing is counted from 0, and is stopped again only after `claimFailureStreak` more failures in a row. That stop again saves the failing jobs' stage as `stoppedStage`, not `stopped`.
6. **B6 — the threshold is a setting.** The config key `claimFailureStreak` (a positive integer, default 3) sets N.

## Out of scope

- Why a claim fails (such as #416's claim error itself), and making the claim op throw less.
- Lost claims (`lost`) and claims waiting for an answer (`waiting-for-answer`): they record no `claimError` and never count.
- The lane sweeps (`workflow.js`), which have no orchestrator. The rule lives in the orchestrator's tick only.
- Escalation: the resulting `agent:stopped-error` is escalated like any other unexpected stop label (`escalate.ts`). This issue doesn't change that.
- Fuzzy matching of errors. "Same error" means the exact same string.

## Design

Every path is under `apps/issue-pipeline/`. The work has two parts. First, carry the claim's error out of the job into `job.json`. Second, count repeats in the tick and stop the issue at N.

**Part 1: the job records `claimError` (B1).**
- `src/job/status.ts:28` `JOB_OUTCOME`'s `finished` variant gains `claimError: z.string().optional()`. **This stub is already committed**, so the tests type-check. Nothing writes it yet.
- Role stages: `src/job/role-run.ts:43` `RoleLine`'s unclaimed end becomes `{ kind: "unclaimed"; outcome: string; reason: string | null }`. At `src/job/role-run.ts:262-269`, `runRoleStage` fills `reason`:
  - from `claim.reason` for an `unclaimed` claim (`claimStep`, `src/workflow/stages/entry.ts:138`, already takes it from the reply's `error`);
  - for a claim that passed but whose state doesn't parse (`!parsed.success`), from a short fixed text naming that.

  The field is named `reason` because the sweep summary's items (`SummaryItem.reason`, `src/workflow/stages/types.ts:243`) and `ClaimStep` already use that name.
- `src/job.ts:202` `outcomeOf` sets `claimError` from the summary when it holds one, beside `rateLimited`. It uses a new helper, `claimErrorOf(summary: object): string | null`, placed next to `rateLimitedRun` (`src/workflow/stages/rate-limit.ts:109`) since it reads the same two summary shapes. The helper returns:
  - for a role line, the `reason` of an `end` with `kind: "unclaimed"` and `outcome: "claim-failed"`;
  - for a sweep summary, the `reason` of the item whose `outcome` is `"claim-failed"` (`summarySource`, `src/workflow/sweep-item.ts:274`, already copies it);
  - null otherwise, and null for an empty reason.

  `outcomeOf` leaves the key out when the helper gives null (`exactOptionalPropertyTypes`). A passing claim's outcome therefore stays as `job-rate-limit.test.mjs` pins it.

**Part 2: the tick counts and stops (B2–B6).**
- **Memory.** `src/orchestrator/watchdog-memory.ts:24` `MEMORY` gains `claimFailures: z.record(z.string(), z.object({ error: z.string(), count: z.number(), job: z.string() })).default({})`, keyed by issue number. `job` is the `startedAt` of the last job counted. Add `{}` to the empty memory at `:48`.
  - `watch` (`src/orchestrator/watchdog.ts:272`) and `pruned` (`:256`) build the memory field by field, so they must carry `claimFailures` through unchanged. If they don't, the count is lost every tick.
  - The memory is saved where the tick already saves it: `escalateOpenIssues` → `saveWatchMemory` (`src/orchestrator/escalation-agent.ts:279`). So pass it the memory after this rule.
- **The rule.** A new pure module, `src/orchestrator/claim-failures.ts`, in the style of `watchdog-budget.ts`. Its call shape is `claimFailureActions(jobs: readonly WatchedJob[], stopLabelled: ReadonlySet<number>, memory: WatchMemory, run: { claimFailureStreak: number; now: Date }): { actions: WatchAction[]; memory: WatchMemory }`. For each watched job that is not live and has an outcome:
  - If the issue has a stop label, set the entry's count to 0, keeping this job's `startedAt` as `job`.
  - If `job` equals the entry's `job`, skip it: already counted.
  - A `finished` outcome with a non-empty `claimError` equal to the stored error counts +1. A different error sets the count to 1. Either way, record `job`.
  - Any other ended job deletes the entry.
  - At count ≥ `claimFailureStreak`, emit a stop action and set the count to 0, keeping `job`. Keeping `job` stops the same `job.json` from being counted again after a lift (B5).
  - Entries of issues with no watched job are dropped.
- **Stop labels, not saved `stopped`.** The rule must use the stop label (`SnapshotIssue.stopped`, `src/orchestrator/snapshot.ts:144`), not `WatchedJob.stopped`. The latter is also true for a state saved at `stopped` (`snapshot.ts:152`), so it would never count a lifted issue's failed claims. That is the case B5 needs. The tick builds `stopLabelled` from `issues`.
- **Ticks.** A job that is still live is skipped, and `job` dedupes a `job.json` seen across several ticks.
- **The action.** `WatchAction` (`src/orchestrator/watchdog.ts:50`) gains `(ActionBase & { action: "stopped"; reason: "claim-failed"; detail: string })`, where `stage` is the job's `status.stage`. `stopOf` (`src/orchestrator/tick.ts:84`) maps it to `{ code: "error", reason: action.detail }`. The detail is `claim failed ${N} times in a row: ${error}`. Code `error` picks `agent:stopped-error`, and its comment holds the reason and the default resume text (`src/ops/stop.ts:60-92`).
- **The stopped stage.** `act` (`tick.ts:107`) passes `state: { ...issue.state }` to `stop`. For this action, pass `{ ...issue.state, stage: action.stage }` instead. Otherwise a lifted issue saved at `stopped` would be stopped with `stoppedStage: "stopped"` (`src/ops/stop.ts:98-102`), which no restart resumes (`resumesAfterStop`, `src/resume-stage.ts:59`). A brand-new issue with no state gets the job's stage, too.
- **Order in the tick.** In `tick` (`tick.ts:228-250`), run the rule right after `watch`, on `watchdog.memory`. Carry out its actions in the same loop as the watchdog's, through `act`, and push them to `done` and `restarted`. `act` sets `row.stopped = true`, so the scheduler skips the issue that tick, and the logged line is `stopped claim-failed`. Pass the rule's memory to `escalateOpenIssues`.
- **The setting.** `claimFailureStreak` joins `WATCH_SETTINGS` (`tick.ts:46`) with `DEFAULT_CLAIM_FAILURE_STREAK = 3`, as `failureStreak` is. Add `"claimFailureStreak": 3` to `repos/example.json` beside `failureStreak` (`:36`).
- **Docs in code.** Extend the `error` row's `explain` in `src/stops.ts:247` to mention a claim that keeps failing; the header asks to keep Agent-Labels in step. Update `tick.ts`'s header and `README.md`'s orchestrator row.

**Design it twice** (CONTRIBUTING, Design). Three alternatives were considered:
- (a) Add the rule to `watch` in `watchdog.ts`. It is 289 lines, near the 300-line limit, and every rule there leaves alone an issue saved at `stopped`, which this rule must count.
- (b) A separate pure module whose actions are `WatchAction`s that the tick carries out through the existing `act`/`stopOf`. **Chosen**: it reuses the stop, the logging and the scheduler skip, and keeps the knowledge of claim streaks in one module.
- (c) Counting in the issue's saved state. Rejected: a failing claim is exactly the case where nothing can write the state.

**Practices followed.**
- CONTRIBUTING Design: a deep pure module; one place knows the streak rule; errors defined away, since a missing or malformed memory reads as empty.
- Types: exhaustive switches with a `never` check in `stopOf` and `act`; zod at the `job.json` and `watchdog.json` boundaries; no casts.
- Lint: 300 lines per file and 50 per function (`tick.ts` is 273 lines, so keep the additions small).
- Wiki decisions: `tests-pin-promised-behaviour`, since tests check gh writes, the stop comment's promised facts, the saved state and log lines; `pipeline-tests-bounded`, since the tests use the existing kits; `practices-cover-all-code`.
- This **departs** from the watchdog's "leaves alone an issue … saved at `stopped`, a lifted one included" (Running-the-Issue-Pipeline, watchdog). The departure is for this one rule, for the reason above, and is recorded on the wiki pages listed below.

## Test interfaces

- `tick(cfg, deps)` (`src/orchestrator/tick.ts`, existing): driven over recorded `job.json` files with the fake gh, through `tickOver` (`test/orchestrator-watchdog-test-kit.mjs`).
- `job.mjs --config … --issue N --stage S` and its `job.json` outcome (`src/job.ts`, `src/job/status.ts:28`, changed: `claimError`): driven through `runJob` (`test/job-test-kit.mjs`) with a fake ops whose claim answers `{ ok: false, error }`.
- The config key `claimFailureStreak` (`WATCH_SETTINGS`, `src/orchestrator/tick.ts:46`, changed).

## Tests

Committed on `agent/issue-430`. Each test fails today on its assertion, not on an import or type error. I ran each file once: 5/5 and 2/2 failed as described.

`test/orchestrator-claim-failures.test.mjs` (drives `tick`). Each tick follows one more ended job, written with its own `startedAt`. The world kit's `writeJob` gained a `startedAt` option for this.
- *a claim failing with the same error is retried twice, and the third failure stops the issue with agent:stopped-error, the error and how to resume.* Pins B2 and B3: after failures 1 and 2 there is no stop label and the spec stage is spawned; at failure 3 there is the label, a comment holding the error and "remove `agent:stopped-error`", the state saved at `stopped` with `stoppedStage: "spec"` and `stopCode: "error"`, no spawn, and a `stopped claim-failed` log line. Fails today at the third tick: no stop label is written.
- *a different claim error starts the count again, and the stop names the error that repeated.* Pins B4. The errors A, A, B, B give no stop, then B stops, and the comment names B and not A. Fails today: the fifth tick writes no stop.
- *a claim that passes starts the count again.* Pins B4. The sequence A, A, pass, A, A gives no stop, then A stops. Fails today: no stop.
- *lifting the stop starts the count again: …* Pins B5. It stops at 3. A labelled tick follows, then the lifted tick spawns spec and stops nothing. Two more failures don't stop; the third does, saving `stoppedStage: "spec"`. Fails today: the first stop never comes.
- *claimFailureStreak sets how many failures in a row stop the issue.* Pins B6. With the setting at 2, the second failure stops the issue. Fails today: no stop.

`test/job-claim-error.test.mjs` (drives `job.mjs` and `job.json`):
- *a role stage job whose claim fails records the claim's error in job.json's outcome* (triage). Pins B1. Fails today: `claimError` is undefined.
- *a sweep stage job whose claim fails records the claim's error in job.json's outcome* (accept). Pins B1. The item's outcome is already `claim-failed`. Fails today: `claimError` is undefined.

The existing `test/job-rate-limit.test.mjs` already pins that a passing claim's outcome holds no `claimError` (its `deepEqual` on the whole outcome).

## Wiki updates

- `Pipeline-Roles-Orchestrator`: the tick's watchdog step, `claimFailureStreak` among the inputs, and a "Failing claim" bullet in "Watchdog (today)".
- `Running-the-Issue-Pipeline`: `claimFailureStreak` among the config keys, and a "Failing claim" bullet in the watchdog section, including the `job.json` outcome shape and the exception for lifted issues.
- `Agent-Labels`: the `agent:stopped-error` row mentions this stop.
- `Issue-Pipeline`: a design paragraph after the budget rule covering the failing-claim rule, why it counts lifted issues, why it saves the job's stage, and what was rejected.

## Assumptions and risks

- **Matching is exact.** "Same error" compares the claim's error strings exactly. A claim error that embeds a changing value (a pid, a time, a temp path) would never repeat, and would be retried forever as today. The texts in #416's report repeated "the same way", so exact matching meets the issue. Normalising errors is left out.
- **Which claims count.** Only `claim-failed` with a non-empty error counts. A claim that passed but returned a state that doesn't parse gets a fixed reason, so it counts too, which seems right. Waiting-for-answer and lost claims record nothing and clear the count.
- **Jobs that end otherwise.** A job that ends any way other than a claim failure (a failed or signalled job included) clears the count. That is the simplest reading of "a claim that succeeds … resets".
- **Escalation.** The stop is escalated as an unexpected `agent:stopped-error`, and the escalation agent runs if it is configured. This is intended: the issue asks that the problem be visible.
- **Load.** The new orchestrator tests take about 1.5–4 s each. Under load, `deadPid()` and the fake gh are the slow parts, and the suite's `--test-timeout` is far above that.
- **What isn't covered.** Nothing in the code, wiki or logs asked to change this task.

## Sources

- Issue #430 and its triage notes.
- `repo/AGENTS.md`, `repo/CONTRIBUTING.md`, wiki `Decisions-Code-and-tooling` (`tests-pin-promised-behaviour`, `pipeline-tests-bounded`, `practices-cover-all-code`, `aposd-and-strict-typing`).
- Wiki: `Pipeline-Roles-Orchestrator`, `Running-the-Issue-Pipeline` (Orchestrator, watchdog, "What runs"), `Agent-Labels`, `Issue-Pipeline` (watchdog and budget-rule decisions, rate-limit outcome).
- Code:
  - `src/orchestrator/tick.ts:46,84,107,228-250`;
  - `src/orchestrator/watchdog.ts:50,256,272`;
  - `src/orchestrator/watchdog-memory.ts:24,48`;
  - `src/orchestrator/escalation-agent.ts:279`;
  - `src/orchestrator/snapshot.ts:144,152`;
  - `src/orchestrator/queue.ts:118`;
  - `src/resume-stage.ts:59`;
  - `src/job/role-run.ts:43,262-269`;
  - `src/job/status.ts:28`;
  - `src/job.ts:202`;
  - `src/workflow/stages/entry.ts:138`;
  - `src/workflow/stages/rate-limit.ts:109`;
  - `src/workflow/sweep-item.ts:274`;
  - `src/workflow/stages/types.ts:222-243`;
  - `src/workflow/launch-results.ts:28`;
  - `src/ops/stop.ts:60-131`;
  - `src/stops.ts:247`;
  - `repos/example.json:36`.
- Tests: `test/orchestrator-world-test-kit.mjs`, `test/orchestrator-watchdog-test-kit.mjs`, `test/orchestrator-watchdog.test.mjs`, `test/job-test-kit.mjs`, `test/job-rate-limit.test.mjs`, `test/gh-effects.mjs`, `test/fake-gh.mjs`.

<!-- end of spec -->
