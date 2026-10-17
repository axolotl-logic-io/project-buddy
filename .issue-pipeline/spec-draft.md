## Behaviour

All paths are under `apps/issue-pipeline/`.

1. **Registered.** `roleOf("merge")` returns the finalizer role, a linear role named `finalizer` built from `finalizerScript` (`src/roles/finalizer/`); a stage job run with `--stage merge` runs it, not the sweep, and sends no `sweep` op.
2. **Gate.** When the issue has an open blocking finding (`openFindings`/`findingsStop`, `src/workflow/findings.ts`), the run ends `stopped` with the code `findingsStop` gives (for an acceptance finding, `acceptance`), sends a `stop` op with that code, and sends no `merge`, `finish-wiki` or wiki op.
3. **Clean merge.** Otherwise the run sends exactly one `merge` op with `expectedSha` equal to the saved `verifiedSha`, `mergeOrder: true`, and a `summary` built with `acceptanceSummary` that contains the acceptance verdict (for example "tests pass"); the payload has a `mergeQueue` key only when the job got `--merge-queue`, and then it holds that list (for example `[3, 5]`).
4. **Merged.** A merged reply ends the run `saved` at `done`, or `saved` at `publish` when the reply has `published: false`; the `merge` op itself writes the `done`/`publish` state and the `agent:merged` label as today (`src/ops/merge.ts`, unchanged), and the runner's end save keeps that stage.
5. **Queued.** A `queued` reply ends the run `held` at `merge`, and the note `merge waits for #N (older PR #M)` is logged once, not again on a second run held by the same PR.
6. **Behind or conflict.** A `behind` or `conflict` reply ends the run `saved` at `sync` with `passedSha` equal to `verifiedSha`, and logs `merge deferred: behind; rebasing now` or `merge deferred: conflict; will rebase next sweep`; there is no resync in the same run and no `resynced` flag.
7. **Refused or failed.** A refusal (an ok reply, not merged, for any other reason) ends `stopped` with code `merge-refused` and sends a `stop` op with the stop reason "GitHub refused the merge"; a merge op that fails on the network ends `held` at `merge`; any other failed merge op ends `stopped` with code `error`.
8. **Wiki.** When `paths.wiki` is set, `wiki-sync` and then `wiki-check` run before the merge, and neither runs without a wiki; a failing wiki check stops the issue with `wiki-check` before the merge.
9. **Wiki conflict.** A `wiki-sync` conflict runs the conflict resolver as a session with agent `issue-pipeline-writer` (with `writer` and `minutes` on its effect), then `finish-wiki-sync` with `abort: false`, then the merge, and `conflictFixes` goes up by one; today's rules from `sync-conflict.ts` still hold: at `maxConflictFixes` it stops `conflict` and runs no session, `cannot-fix` sends `finish-wiki-sync` with `abort: true` and ends held at `merge`, a rejected resolution ends held while attempts remain and stops `conflict` on the last attempt, and a handoff gets a continuation on the same rebase up to `maxContinuations` and with none left stops `too-large`.
10. **Wiki only.** A change that lives only in the wiki (`wikiOnly(st.flows)`) runs the `finish-wiki` op and no `merge` op.
11. **Restarts.** A run killed before or after any of its calls and started again ends as an uninterrupted run would, with the same stage and labels and one `gh pr merge` in all; a restart after the PR merged does only the bookkeeping, with no `gh pr merge`; an old `merge` state that the sweep saved with any `phase` (`begin`, `wiki-synced`, `resolved`, `wiki-checked`) resumes in the role, starts at the gate and reaches `done`.
12. **Isolation.** The finalizer's modules import nothing from other roles' modules, and nothing from `src/workflow/stages/merge.ts`, `merge-wiki.ts`, `sync-conflict.ts` or `publish.ts`.
13. **Boundary unchanged.** For a merge stage job, `--print-boundary` still declares role `merger` (network `api.github.com`, `repo` read, `docs` write), and `pipeline_commit` still refuses a `repo/` path.

## Out of scope

- Rebase and retest before the merge (#422); the ready check, `finalize` and `land`.
- The sweep's own merge stage: lanes keep running `src/workflow/stages/merge.ts` (and its same-sweep resync).
- `publish`, `close-parent` and `cleanup`, which stay the sweep's.
- `src/ops/merge.ts`, `merge-order.ts` and `finish.ts` (no change).
- The job role (`merger`, `src/job/roles.ts:67`) and its boundary.

## Design

**Shape.** Model on triage (`src/roles/triage/script.ts`, `locate.ts`): `src/roles/finalizer/locate.ts` (pure: `FinalizerData` from the saved state and `RoleContext`), `script.ts` (`finalizerScript: LinearScript<FinalizerData>`), plus reply parsing (zod at the boundary, as triage does) and the conflict-resolver task. Register with `registerRole("merge", linearRole("finalizer", finalizerScript))` beside triage at `src/roles/registry.ts:104`. `STAGE_ROLES` already maps merge to finalizer (`src/job/driven-run.ts:45`).

**Steps** (`LinearStep`, `src/roles/walk.ts:57`): `begin` gate → `wiki-sync` → [resolver session → `finish-wiki-sync`] → `wiki-check` → `merge` or `finish-wiki` → `end`. Today's rules to carry over: `begin()` (`src/workflow/stages/merge.ts:112`), `mergeLaunch` (`merge.ts:73`, `acceptanceSummary` at :80), `decide()` (`merge.ts:185`, notes at :148, :172, :181), `merge-wiki.ts:38-104`, and the conflict rules of `sync-conflict.ts:68-264` (`maxConflictFixes` :73/:157, cannot-fix :199, continuations :210). The resolver's launch follows `src/workflow/stages/conflict-resolver.ts` (`RESOLVER_MINUTES = 45`, :32).
The linear walk today runs every step once in order. The finalizer needs optional steps (wiki steps without a wiki, `merge` vs `finish-wiki`, the resolver only on a conflict) and a repeat (resolver continuations). Suggested: add `skip?: (data: D) => boolean` and `again?: (data: D) => boolean` to `LinearStep` (`walk.ts:57`), which keeps the role a flat list and pulls the control into the walk once (*pull complexity downward*). Alternative considered (*design it twice*): a machine role (`machineRole`, `registry.ts`) with a table; heavier for a mostly linear flow, and the issue asks for a linear role. The implementer may choose either, and says which in the PR.

**Ends.** A merged reply ends `saved("done")` / `saved("publish")`, not a new End kind: `finish()` (`src/job/runner.ts:120`) saves at the end's stage, which rewrites the stage the op already wrote, adds the usage and drops the lease. `behind`/`conflict` end `saved("sync")` with `passedSha = verifiedSha`. Stop codes follow today's `stop` op, `stopOf` (`src/ops/stop.ts:43`): the role passes the same code in its `End` and in the stop payload, from `stopFor(reason)` (`src/stops.ts:272`) or `error`.

**No `mergedPr` checkpoint** (a departure from the triage notes' suggestion). The runner saves checkpoints only before a non-end step (`checkpoint()`, `src/job/runner.ts:240`); a save at `merge` after the op wrote `done` would roll the stage back. A kill inside or after the merge op leaves the stage where the op left it, and on a restart at `merge` the op sees the PR `MERGED` and does the bookkeeping only (`src/ops/merge.ts:130-134`, pinned by `test/merge-op.test.mjs:97`). So `locate` always starts at the gate, and every step is safe to repeat (`every-role-resumes`, Agent-Labels; Finalizer page "Locate"). `conflictFixes` stays a top-level hand-off field, listed also as a checkpoint so it is saved before the resolver session.

**`resynced` goes away**: Pipeline-Roles-Shared "Hand-off" says today's cross-stage flags become hand-off fields or go away; a stage job runs one stage, so `behind` goes to the `sync` job.

**Runner plumbing.** `RoleContext.mergeQueue` (`src/roles/walk.ts:37`, optional in the stub) becomes required `readonly number[] | null`; add `mergeQueue` to `RoleJob` (`src/job/role-run.ts:50`), set it in `contextOf()` (`role-run.ts:181`) from `RunArgs.mergeQueue` (`src/job/args.ts:50`) through `runStage` (`src/job.ts:129`); add `mergeQueue: null` to `test/role-context-fixtures.mjs`. `SessionEffect` (`src/roles/machine.ts:37`) gains `minutes?` and `writer?`, which `childOf` (`role-run.ts:92`) passes on, so `WRITER_ACCEPTANCE` applies (`src/workflow/launches.ts:176`).

**Practices** (CONTRIBUTING.md, Decisions-Code-and-tooling): Ousterhout design (deep modules, information hiding: the merge's reply shapes are parsed in one finalizer module); strict types (no `any`, `!` or casts; zod at the op-reply boundary; exhaustive switches); Biome all-at-error with 300 lines per file and 50 per function; `practices-cover-all-code`; `tests-pin-promised-behaviour` (tests assert ops sent, the saved stage, labels and stop codes, not call order); `pipeline-tests-bounded`; `flakes-are-failures`. No departure from a wiki decision beyond the documented `resynced` removal.

## Test interfaces

- `roleOf("merge")` — `src/roles/registry.ts:100`, changed: `roleOf(stage: string): Role | undefined`, run as `role.run(entry, effects, cfg): Promise<RunEnd>`.
- `finalizerScript` — `src/roles/finalizer/script.ts`, new: `LinearScript<FinalizerData>`.
- `RoleContext.mergeQueue` — `src/roles/walk.ts:37`, changed: `mergeQueue: readonly number[] | null`.
- The stage job CLI — `src/job.ts`, changed: `job.mjs --issue N --stage merge [--merge-queue n1,n2]`.
- `--print-boundary` and `pipeline_commit` — existing, unchanged.

## Tests

All fail today with "no role is registered for merge" (the stub is not registered), except the isolation guard, which passes on the stub and guards the build.

- `test/finalizer-role-test-kit.mjs`: the kit. `finalize(setup)` / `killedFinalize(kill, setup)` run `roleOf("merge")` on the runner test kit's world with fake ops (merge, finish-wiki, wiki-sync, wiki-check, finish-wiki-sync, stop, post) and a fake `gh`.
- `test/roles-finalizer.test.mjs` (`roleOf("merge")`, `finalizerScript`, `RoleContext.mergeQueue`): Behaviour 2-7, 10, 12 — clean merge saves at done with expectedSha, mergeOrder, summary and no mergeQueue key; the queue `[3,5]` is passed; `published: false` saves at publish; queued ends held with the note once over two runs; behind and conflict save at sync with passedSha and the note; refusal stops `merge-refused`; network error held; other error stops `error`; an open acceptance finding stops `acceptance` with no merge; wiki-only runs finish-wiki; the isolation guard.
- `test/roles-finalizer-wiki.test.mjs` (`roleOf("merge")`): Behaviour 8, 9 — order wiki-sync, wiki-check, merge; none without a wiki; failed check stops `wiki-check`; conflict runs an `issue-pipeline-writer` session, finish-wiki-sync abort false, merge, conflictFixes 1; past max stops `conflict` with no session; cannot-fix aborts and holds; rejected holds, and stops on the last attempt; handoff then fixed gives 2 sessions and 1 finish; handoff with `maxContinuations: 0` stops `too-large`.
- `test/roles-finalizer-restart.test.mjs` (`roleOf("merge")`): Behaviour 4, 11 — killed before and after each of calls 1-12 in the clean and wiki-conflict runs, each ends as the uninterrupted run with one `gh pr merge` and the same stage and labels (`agent:merged`); an already-merged PR gets bookkeeping only; old sweep `merge` states at each `phase` reach done.
- `test/job-role-finalizer.test.mjs` (the stage job CLI, `RoleContext.mergeQueue`): Behaviour 1, 3, 4 — `--stage merge --merge-queue 3,5` prints `{issue: 7, stage: "merge", end: {kind: "saved", stage: "done"}}`, sends no `sweep` op, one `merge` op with expectedSha, mergeOrder true and mergeQueue `[3,5]`, and the last save-state is at done. Fails today because the sweep runs.
- Behaviour 13 is an existing guarantee, already pinned and kept green: `test/job-boundary.test.mjs` (merge → merger, `api.github.com`, repo read, docs write), `test/job-roles.test.mjs`, and `test/pipeline-commit.test.mjs:108` (a code path is refused without write access). The `agent:merged` label written by the op is pinned by `test/merge-op.test.mjs` and `test/finish-merged.test.mjs`. No new test is needed, since the change touches neither.

Run: `cd apps/issue-pipeline && node --test --test-timeout=120000 test/<file>`.

## Wiki updates

- Pipeline-Roles-Finalizer: "Scope today" gains "The finalizer role (#416)"; the Test plan gains the row "Merge as the finalizer role (#416)".
- Issue-Pipeline `merge-by-script`: in stage jobs, merge runs as the finalizer role, linking [Finalizer](Pipeline-Roles-Finalizer).

## Assumptions and risks

- The end save at `done`/`publish` rewrites the state the merge op wrote. The tests pin that the stage and labels survive. If the save drops op-written fields that matter, the implementer must keep them in the role's hand-off.
- Without a same-run resync, a `behind` merge waits for the next `sync` job, one tick later than in the sweep. The behind note text is kept as the issue asks, though "rebasing now" now happens in the next job.
- The linear walk's `skip`/`again` is a runner change that every linear role shares. Triage's tests must stay green.
- `test/finalizer-role-test-kit.mjs` is at 299 lines. A kit change may need a split.
- No text in the code or wiki asked to change the task.

## Sources

- Issue #416 (issue.md) and its triage notes.
- `AGENTS.md`, `CONTRIBUTING.md`; wiki Decisions-Code-and-tooling (`practices-cover-all-code`, `tests-pin-promised-behaviour`, `pipeline-tests-bounded`, `flakes-are-failures`).
- Wiki: Pipeline-Roles-Finalizer, Pipeline-Roles-Shared ("Hand-off", "Failures the runner owns"), Issue-Pipeline (`merge-by-script`), Agent-Labels (`every-role-resumes`).
- Code: `src/roles/registry.ts:81-111`, `src/roles/walk.ts:20-71`, `src/roles/machine.ts:37`, `src/roles/triage/`, `src/job/role-run.ts:50,92,181`, `src/job/runner.ts:120,240`, `src/job/args.ts:50`, `src/job.ts:129`, `src/job/driven-run.ts:45`, `src/job/roles.ts:67`, `src/workflow/stages/merge.ts:73-205`, `merge-wiki.ts`, `sync-conflict.ts`, `conflict-resolver.ts:32`, `src/workflow/findings.ts:70,121`, `src/workflow/flows.ts:29`, `src/workflow/launches.ts:176`, `src/ops/merge.ts:130`, `src/ops/stop.ts:43`, `src/stops.ts:256,272`.
- No web sources were needed.

<!-- end of spec -->
