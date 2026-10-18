## Behaviour

All paths are under `apps/issue-pipeline/`.

1. **Saved state after an ask.** A spec run whose session replies `needs-info` with questions ends `{kind: "saved", stage: "triage"}`, and the issue has `agent:needs-info`. Its saved state has:
   - `stage: "triage"`, `lease: null`, and `questionsAt` at the time the ask wrote;
   - `checkpoints` `{startSha, startWikiSha, attempts: 0, continuations: 0}`, the #454 counts and the start heads.
2. **Ask after the save.** The spec writer asks the way triage does: after its `asked` end's save, on the state that save wrote.
   - The `ask` op's payload carries `number`, `questions` and `state`. `state` equals the state the end's save wrote: `stage: "triage"`, `lease: null`.
   - The issue's final state is that state plus the ask's `questionsAt`. So every field the end saves is kept, hand-off fields such as `spec` included.
3. **Failed ask.** A failed `ask` ends the spec run as a failed step, `{kind: "stopped", code: "error"}`. This happens after the issue was saved at `triage`, and no `agent:needs-info` label is set.
4. **The `asked` end.** In the spec writer's machine, the `reset` state's `needs-info` result goes straight to the `asked` end.
   - It sets `attempts` and `continuations` to 0 and keeps `startSha` and `startWikiSha` (#454).
   - The `asked` end is `{kind: "saved", stage: "triage", after: {op: "ask", payload: {number, questions, …}}}`.
   - The separate `ask` op state is gone.
5. **Ask needs a state.** The `ask` op refuses a request with no `state`: it replies `ok: false` and posts, labels and writes nothing. So no write of the ask's can leave a state stripped to `stage`, `questionsAt` and `lease`.
6. **Stop while asking.** A SIGTERM that arrives while a role's end runs its `ask` op makes the job exit 143. This applies to both triage (`released` end) and the spec writer (`saved` end).
   - After the `ask` request, the job sends no `save-state`, so the issue keeps the `questionsAt` the ask wrote.
   - A stop at any earlier point still saves the issue at its stage with no lease, as today.
7. **Claim guard.** Take a `needs-info` issue saved as item 1 leaves it.
   - A claim waits (`waiting: "answer"`) when its only allowed-user comment is from before `questionsAt`, such as the account's usage-records comment.
   - An allowed user's comment after `questionsAt` makes the claim take it.
8. **Regressions.** These still pass:
   - triage's `needs-info` still asks after its release, with `questionsAt` set (`test/roles-triage.test.mjs`);
   - the spec writer's kill tests (`test/roles-spec-writer-kill.test.mjs`);
   - the #454 retriage tests (`test/roles-spec-writer-retriage.test.mjs`).

## Out of scope

- The sweep's workflow stages (`src/workflow/stages/spec.ts`, `triage.ts`). They already send `state` with `ask`.
- `answeredSince` and the claim's answer rule (`src/ops/sweep-verdict.ts:114-131`). They are right once `questionsAt` is kept.
- Repairing #419's saved state on GitHub. That is an operator's job.
- A stop or kill that comes after the end's save but before its `ask` runs. The issue is then left at `triage` with no lease, no `questionsAt` and no label, so triage claims it again. That is lost work the wiki accepts (Pipeline-Roles-Shared, "Restart from what is done").
- Deploys, `main`, installing the pipeline.

## Design

**Seam: the `asked` end becomes a `saved` end with an `after` op (option A of triage's notes).**
- `End` (`src/roles/machine.ts:28-33`): the `saved` variant gets `after?: AfterOp`, and its comment says a save may name one too.
  - The file is at 299 lines, so the edit must keep it at 300 or fewer, for example by folding the comment.
  - I made no type-only stub of this. Adding lines without removing any would take the file past Biome's 300-line limit, and the tests don't need the type: they are checked JS that compare plain objects.
- `settle` (`src/job/runner.ts:100-118`) accepts `saved` as it does `stopped` and `released`: it runs the end's `after` op with `state: run.saved`.
- `bareEnd` (`:88-96`) strips `after` from a `saved` end, so the run returns `{kind: "saved", stage}`.
- `finish` (`:122-148`) already sets `run.stage`, saves, then settles. A `next` end still never settles.

**Why not option B** (make `asked` a `released` end whose ask sets `triage`, as triage's does)? `release` (`runner.ts:78-85`) saves `releasedState(run.saved, …)` at the run's stage, from the run's last save. That state has none of `data`'s hand-off fields, and its counts come from the last checkpoint save, so it would lose `spec` and #454's zeroed counts. Option A saves `writtenState(run, data, true)` (`src/job/role-state.ts:40-55`), which carries both.

**Spec writer.**
- `src/roles/spec-writer/machine.ts`:
  - drop the `ask` op state (`:207-214`);
  - `reset`'s `"needs-info"` edge (`:201`) becomes `{to: "asked", apply: spent}`. `spent` (`edges.ts:116-118`) keeps its meaning.
- `src/roles/spec-writer/ends.ts:57`: `asked` becomes `end((data) => ({kind: "saved", stage: "triage", after: {op: "ask", payload: {number: data.issue, by: data.by, questions, spec}}}))`, with `{questions, spec}` from `decided(data)` (`edges.ts:138-147`).
- Remove `"ask"` from the `SpecState` union (`locate.ts:34`). `checkTable` then checks the graph as before.

**The ask op.** `ASK_REQUEST` (`src/ops/ask.ts:12-17`) makes `state` required, `z.record(z.string(), z.unknown())` with no `.nullish()`, so a request without one fails its parse before anything is posted. Every caller sends a state:
- triage's end, through `settle`;
- the spec writer's end, after this change;
- `src/workflow/stages/spec.ts:100-105` and `triage.ts:152`.

**Stop-signal window.** `runClaimed` (`src/job/role-run.ts:135-138`) saves `{...last, lease: null}` on any `interrupted` end. Once the end's save is done, that save can only write over what the end's op wrote. The recommended fix:
- `RunEnd`'s `interrupted` variant (`runner.ts:52`) gets an optional flag, such as `ended?: true`.
- `settle` sets it when a signal stops the run at the end's op, whether before or after the op ran.
- `runClaimed` skips its save for such an end and still returns `{kind: "stopped", signal}`, so the job exits 128 plus the signal, as the wiki's "Graceful stop" says.

Rejected alternatives:
- **`settle` returns the end when the op's write completed.** The job's stop sends SIGTERM to every running ops process group (`src/job/control.ts:6-10`), so an `ask` cut off this way reports a failure even when its write landed. The job can't tell "before" from "after", and the run would end `finished` rather than stopped.
- **Skip the save when `last.lease === null`.** This hides the rule in a field's value, and the job tests' claims (`test/workflow-stages-fixtures.mjs:69-92`, `lease: null`) would read as already saved.

Either way, the tests pin only what the job sends and how it exits.

**Practices followed** (Coding-Practices-Digest):
- *Pull complexity downward / somewhat general-purpose*: `after` on `saved` is the runner's one rule for "an end's op runs after its save", not a spec-writer special case.
- *Define errors out of existence*: the ask can't be sent without a state.
- *Tests pin promised behaviour*: the tests check the saved state, GitHub effects, the job's ops requests and its exit code, a past bug by issue number (#419), and no call order beyond what the wiki promises ("after the end's save").
- *Pipeline tests are bounded*: the job tests start jobs through `startJob`, wait on the hung op's pid file with `waitFor`, and kill the hung sleep through `endsWithTest`.
- *Lint limits*: 300 lines per file and 50 per function; both `machine.ts` files are at 299 lines.
- No ternaries, no `as`, and exhaustive switches.

Wiki decision followed: `role-state-machines` and the end's `after` op (Pipeline-Roles-Shared, #304), now extended to `saved`. "Graceful stop" gains its exception, recorded on that page.

## Test interfaces

- `transition(state, result)` and `specWriterMachine` (`src/roles/spec-writer/machine.ts:271`, `:276`): the `reset`/`asked` edge and the end's effect.
- `runMachine(machine, entry, effects)` (`src/job/runner.ts:268`): the spec writer's run on the runner's fake effects (`test/runner-test-kit.mjs`).
- `job.mjs --stage <triage|spec>` (`src/job.ts`, through `runRoleStage` in `src/job/role-run.ts`): a stop while the end asks.
- The ops CLI's `ask` op (`src/ops/ask.ts:29`, `src/ops.ts:71`).
- The ops CLI's `claim` op (`src/ops/claim.ts:144`).

## Tests

- **`test/spec-writer-run-test-kit.mjs`**: the fake `ask` now writes as the real op does, `{...payload.state, stage: "triage", questionsAt: ASKED_AT, lease: null}`. `ASKED_AT` is exported.
- **`test/roles-spec-writer-ask.test.mjs`** (new; `runMachine` and `transition`):
  - "a spec run that asks saves at triage with the questions' time, no lease, its counts at 0 and its start heads". Pins item 1. Fails today: `questionsAt` is undefined, because the end's save writes over the ask.
  - "the spec writer asks after its end's save, on the state that save wrote, and keeps every field of it". Pins item 2. Fails today: the save before the ask is a checkpoint save at `spec`, and the payload has no `state`.
  - "a failed ask ends the spec run as a failed step, after the issue was saved at triage". Pins item 3. Fails today: the failure comes before any save at triage, so the issue is saved at `spec`.
  - "a needs-info reset ends the run at `asked`, which saves at triage and asks after". Pins item 4. Fails today: `reset` goes to the `ask` state.
- **`test/roles-spec-writer-retriage.test.mjs`**, "the asked end takes the spec writer's counts back to 0 and keeps its start heads": now steps from `reset` with `needs-info`, not from the removed `ask` state. Pins items 4 and 8. Fails today: `reset` goes to `ask`. The file's other tests pass, and must keep passing.
- **`test/job-stop-ask.test.mjs`** (new; `job.mjs --stage triage` and `--stage spec`, with the fake ops' `ask` hung): "a SIGTERM while the {triage,spec} role's end asks leaves the questions' time the ask wrote". Pins item 6.
  - The job must exit 143. The issue's state, worked out from the ops log (each `save-state`'s state, each `ask`'s state at triage with `questionsAt`), must keep `questionsAt`.
  - Fails today for both roles: the stop's `save-state` of the role's last save follows the ask. For the spec writer the ask also has no `state`, and the last save is at `spec`.
- **`test/ops-issue-ops.test.mjs`**, "ask without a state is refused and changes nothing on GitHub" (ops CLI `ask`). Pins item 5. Fails today: the op replies `ok: true`, posts the questions and writes a state of only `stage`, `questionsAt` and `lease`.
- **`test/ops-claim-wait.test.mjs`** (ops CLI `claim`; guards that pass today, as the issue says). Pin item 7:
  - "a claim of an asked issue whose only comment since is from before its questions waits";
  - "an allowed user's comment after the questions answers an asked issue, and the claim takes it".
- **Unchanged guards** for item 8: `test/roles-triage.test.mjs`, "questions are asked after the release, on the state it saved", and `test/roles-spec-writer-kill.test.mjs`. Both pass with the new fake `ask`. I ran every `roles-spec-writer*` file once: only the tests above fail.

## Wiki updates

- **Pipeline-Roles-Shared**:
  - the end list: a `saved` end may name an `after` op (#457), with #419 as the reason;
  - "Graceful stop": once the end has saved with no lease, a stop saves nothing more.
- **Pipeline-Roles-Spec-Writer**:
  - the Lifecycle table: `reset` `needs-info` → end `saved(triage)` (`asked`) with `after: ask`, and the `ask` row is removed;
  - the checkpoints paragraph: the `reset` edge to `asked`, and the ask after the save keeps `questionsAt`;
  - the needs-info rule;
  - the end-state list.

## Assumptions and risks

- The job tests take under 1 s each here (0.7 s and 0.8 s). They wait on the hung op's pid file, an event, within the bounded kit's deadline, as the #371 test in `test/job-stop.test.mjs` does.
- The spec job test runs the spec writer's real `checkout`, `check-reply` and `reset` checks on the job kit's bare origin. No issue branch exists there, so `reset` deletes nothing and pushes nothing.
- Requiring `state` in `ask` turns a malformed request into an error reply. I found no caller that sends none once the spec writer's end sends one.
- After the change, a kill or stop between the end's save and the ask leaves the issue at triage without questions, so triage runs again. That is the accepted cost; see Out of scope.
- No code, log or page I read asked to change this task.

## Sources

- Issue #457 and triage's notes.
- `src/roles/machine.ts:15-33`.
- `src/job/runner.ts:52-148`, `:229-248`, `:268`.
- `src/job/run-step.ts:57-73`.
- `src/job/role-run.ts:89-141`.
- `src/job/role-state.ts:39-81`.
- `src/job/step-failure.ts:18-26`.
- `src/job/control.ts:6-10`.
- `src/roles/spec-writer/machine.ts:193-214`, `:255-296`.
- `src/roles/spec-writer/ends.ts`.
- `src/roles/spec-writer/edges.ts:113-147`.
- `src/roles/spec-writer/locate.ts:25-50`.
- `src/roles/triage/script.ts:53-56`.
- `src/ops/ask.ts`.
- `src/ops/sweep-verdict.ts:110-131`.
- `src/ops/claim.ts:79`.
- `src/workflow/stages/spec.ts:97-111`, `triage.ts:150-157`.
- Tests and kits: `test/runner-test-kit.mjs`, `test/triage-role-test-kit.mjs`, `test/spec-writer-run-test-kit.mjs`, `test/roles-triage.test.mjs:131-146`, `test/roles-spec-writer-kill.test.mjs`, `test/roles-spec-writer-retriage.test.mjs`, `test/job-stop.test.mjs`, `test/job-test-kit.mjs`, `test/fake-rpc-pi.mjs:7-38`, `test/ops-claim-wait.test.mjs`, `test/ops-issue-ops.test.mjs`.
- Wiki: Coding-Practices-Digest, Pipeline-Roles-Shared ("Role state machines", "Restart from what is done"), Pipeline-Roles-Spec-Writer ("Lifecycle"), Pipeline-Roles-Triage.

<!-- end of spec -->
