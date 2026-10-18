## Behaviour

Paths are under `apps/issue-pipeline/`. "The start sync" is the states `sync-work?`, `rebase`, `resolver`, `resolver-reply`, `continue`, `finish-sync` and the four `abort-…` states, in `src/roles/implementor/sync.ts`.

1. **Every entry starts with the start sync.** The shared `start` check answers the run's entry (`implement` or `sync`), and both go to `sync-work?`. No entry reaches its first state (`implement-work?`, or the `sync` entry's end) without passing through the start sync.
2. **Nothing to do.** `sync-work?` answers `work` when the branch lacks the target's head. The target is the base, or the prerequisite's head while a stacked issue's prerequisite is open, as `syncTarget` in `src/stack.ts` decides. When the branch has the target's head, `sync-work?` answers the entry's name with the head, and the run goes on to the entry's first state. No `sync-base` runs and no comment (`post`) is made.
3. **Clean rebase.** `rebase` sends `sync-base` with `keepConflict: true` and the issue's `stackedOn`. A clean rebase is already pushed by `sync-base`, so `rebase` answers the entry's name and the run goes on to the entry's first state. That run saves the new `headSha`, its `flows`, and the `stackedOn` the op replied (null once the issue unstacks). An `implement` entry behind its base rebases and pushes before the implementer starts, and the implementer starts on the rebased head.
4. **Conflict.** A rebase that stops on conflicts adds 1 to `conflictFixes`, clears `testsOnly` and `passedSha`, and runs the conflict resolver.
   - The resolver is a `session` state named `conflicts`, run as `issue-pipeline-writer` with the fixer's model and budget (`budgetRole: "fixer"`, `sessionBudget(budgets, "fixer")`), `CIFIX_SCHEMA` and `attempt` = `conflictFixes`.
   - Its task names the conflicting files and the handoff file. It tells the resolver to commit with `pipeline_commit`, ending with the `Pipeline-Agent: conflict resolver` trailer, and includes `NO_ARTIFICIAL_LOAD_RULE`. It does not tell the resolver to run `GIT_EDITOR=true git rebase --continue`, because the role continues the rebase.
   - `fixed` → `continue`, which runs `GIT_EDITOR=true git rebase --continue` in the job's checkout. If the rebase finishes (`clean`), the run goes to `finish-sync`. If it stops again (`conflict`), the resolver runs again for the next commit, and that run counts toward `conflictFixes` too.
   - `finish-sync` sends the op with the rebase's `baseSha` (or the `stackedOn` payload for a stacked issue, as `finishRequest` builds it). A resolved finish answers the entry's name and saves the pushed head.
5. **Bounded resolutions.** `conflictFixes` is bounded by `maxConflictFixes`, which defaults to 2. A conflict from `rebase` or `continue` with `conflictFixes` already at the limit aborts the rebase through `finish-sync` with `abort: true`. The issue then stops with stop code `conflict` (`agent:stopped-conflict`) through the `stop` op. Nothing is pushed.
6. **Conflicts never stop otherwise (`conflicts-never-stop`).**
   - When the resolver returns `cannot-fix`, the run aborts the rebase (`finish-sync` with `abort: true`) and ends `released`. The issue stays at its stage, there is no stop, and the origin branch is unchanged.
   - When `finish-sync` rejects a resolution, the run ends `released`. On the last attempt (`conflictFixes` ≥ `maxConflictFixes`), it ends `stopped` with code `conflict` instead.
7. **Resolver out of room or failed.**
   - A resolver `handoff` gets a continuation (the `resolver` again) up to `maxContinuations`. A continuation counts as neither a conflict fix nor an implementer continuation: `continuations` is unchanged.
   - Past the limit, the rebase is aborted and the issue stops with `too-large`.
   - A failed resolver session (`failed`) or an unreadable reply (`bad`) aborts the rebase and stops with `error`.
8. **A start sync never touches `syncs`.** No edge of the start sync changes `syncs` in an `implement` entry.
9. **Entry `sync`.** Once the start sync is done, the run ends `saved(checks)`:
   - `testsOnly` is true exactly when `passedSha` equals the head before the sync.
   - `passedSha` is cleared, and `stackedOn` and `headSha` are saved.
   - A sync that changed the head (a clean rebase or a resolution) adds 1 to `syncs`, through a Guard on `maxSyncs` (default 3). Past the limit, the run stops with code `sync-limit`.
   - A sync with nothing to do (2) saves at `checks` without counting.
10. **Old states resume.**
    - `locate` gives entry `sync` for a state saved at `sync`, and `implement` otherwise.
    - It reads the top-level `conflictFixes`, `syncs`, `testsOnly`, `passedSha` and `stackedOn` that today's sync stage saved, whatever its `phase`. Any `checkpoints` record wins over those fields.
    - A leftover rebase in the checkout is reset by `sync-base` (`src/ops/sync.ts:233-235`).
11. **Registered for `sync` in stage jobs.**
    - `IMPLEMENTOR_STAGES` is `["implement", "sync"]`, so `job.mjs --stage sync` runs the role. The lanes' `workflow.js` keeps `stages/sync.ts`.
    - `implementorMachine.handoff` adds `stackedOn`, `syncs`, `testsOnly` and `passedSha` to `headSha`, `flows`, `implemented`, `reply` and `findings`.
    - `LIMITS` is `{ maxContinuations: 1, maxConflictFixes: 2, maxSyncs: 3 }`, and `limitsOf(cfg)` gives `cfg.maxContinuations`, `cfg.maxConflictFixes ?? 2` and `cfg.maxSyncs`. `checkTable(TABLE, LIMITS, …)` reports no faults.
12. **Module layout.** The start sync's states and the `sync` entry's state live in `src/roles/implementor/sync.ts` (or a sibling module that it imports). `machine.ts` imports `./sync.ts` and spreads its states into `TABLE`. The role still imports nothing from the triage, spec writer or reviewer roles.

## Out of scope

- The `fix` entry (#418) and the `checks` entry (#420). `ImplEntry` gains only `sync`. Once `fix` lands, it adds one edge per entry-named result: `start fix`, `sync-work? fix`, `rebase fix` and `finish-sync fix`.
- "A `checks` job that starts again after waiting on CI doesn't sync" belongs to the `checks` entry (#420). This issue adds no checks entry, so no checks job syncs.
- The finalizer's rebase at merge (#422), `restackToSync`, and the merger's behaviour (it still saves at `sync`).
- `src/workflow/stages/sync.ts`, `sync-conflict.ts`, `conflict-resolver.ts`, `conflict-target.ts`, `stacked.ts`, and the ops `sync-base` and `finish-sync`. The role imports their pure helpers and doesn't edit them.
- PR flow actions (close or reopen) after a sync. The implementor role sends no PR op (#414), and its `flows` are only saved.
- Today's sync stage's "Rebased onto …" PR comment and the resolver's PR comment. The role posts neither (assumption, see below).

## Design

**State table** (all script states are checks built with `check()` from `src/roles/implementor/states.ts:30-45`; ops run inside checks through `effects.op`, as `flows` does at `src/roles/implementor/checks.ts:88-107`):

| State | Kind | Payload / effect | Result → next |
|---|---|---|---|
| `start` | check | `{entry}` | `implement` → `sync-work?`; `sync` → `sync-work?` |
| `sync-work?` | check | `{entry, stackedOn}`: `syncTarget` with the job's checkout, then `git merge-base --is-ancestor <onto> HEAD` | `work` → `rebase`; `implement` → `implement-work?`; `sync` → end `synced` |
| `rebase` | check | `sync-base` with `{keepConflict: true, stackedOn}`, read with `syncReplyOf` | `implement` → `implement-work?`; `sync` → `sync-moved?`; `conflict` → `resolver`, Guard `conflictFixes`/`maxConflictFixes`, over → `abort-conflicts` |
| `resolver` | session | `conflicts` (see Behaviour 4) | `replied` → `resolver-reply`; `failed` → `abort-failed` |
| `resolver-reply` | check | the reply read with `fixOf` | `fixed` → `continue`; `cannot-fix` → `abort-cannot-fix`; `handoff` → `resolver`, Guard on the resolver's own continuation count/`maxContinuations`, over → `abort-out-of-room`; `bad` → `abort-failed` |
| `continue` | check | `GIT_EDITOR=true git rebase --continue`, then `unmergedFiles` | `clean` → `finish-sync`; `conflict` → `resolver`, Guard `conflictFixes`, over → `abort-conflicts` |
| `finish-sync` | check | `finish-sync` with `finishRequest`'s payload, read with `finishReplyOf` | `implement` → `implement-work?`; `sync` → `sync-moved?`; `rejected` → end `rejected` |
| `abort-cannot-fix`, `abort-conflicts`, `abort-out-of-room`, `abort-failed` | check `abort` | `finish-sync` with `{abort: true, reason}` | `aborted` → end `cannot-fix` (released), `conflicts` (stopped `conflict`), `resolver-out-of-room` (stopped `too-large`, `outOfRoomReason("conflict resolver", max)`), `resolver-failed` (stopped `error`) |
| `sync-moved?` | check | `{changed}`: whether the sync changed the head | `moved` → `synced`, Guard `syncs`/`maxSyncs`, over → `too-many-syncs`; `same` → `synced` |
| `synced` | end | `saved(checks)` | |
| `too-many-syncs` | end | stopped `sync-limit` | |
| `rejected` | end | released, or stopped `conflict` when `conflictFixes` ≥ `maxConflictFixes` | |

**Check reply shapes** (pinned by `test/implementor-sync-test-kit.mjs`):
- `sync-work?` with nothing to do, a clean `rebase`, and a resolved `finish-sync` reply `{headSha, flows, stackedOn}`, with `flows` from `flowsOf` (`src/workflow/flows.ts`).
- A conflicting `rebase` replies `{files, baseSha, stackedOn}`.
- `continue`'s `conflict` replies `{files}`.

**Edge data** (Behaviour 3, 4, 9):
- Every edge out of the start sync to an entry's first state does the same things: it sets `testsOnly = passedSha !== null && passedSha === data.headSha`, using the head before the reply's head replaces it. It then clears `passedSha` and saves `headSha`, `flows` and `stackedOn`.
- The `rebase conflict` edge sets `testsOnly: false` and `passedSha: null`, as `conflicted` does (`src/workflow/stages/conflict-resolver.ts:119-130`).
- Guard `apply` runs before the count (`src/roles/machine.ts:153-170`), so an over-limit edge still takes its `apply`.

**How it builds on #414.**
- `start` is the check at `src/roles/implementor/start.ts:9-13`. `TABLE` spreads each entry's states (`src/roles/implementor/machine.ts:20-23`), so `sync.ts` adds one import and one spread.
- `ImplEntry` (`src/roles/implementor/locate.ts:41`) gains `"sync"`, and `locate` (`locate.ts:202`) derives `entry` from `saved.stage`.
- `countsOf` (`locate.ts:165`) is the model for reading the old top-level `syncs`/`conflictFixes` with `checkpoints` winning.
- The `START` zod enum (`checks.ts:23`) takes `"sync"`, and `ImplResult` (`states.ts:10-21`) gains `sync`, `clean`, `conflict`, `fixed`, `cannot-fix`, `rejected`, `aborted`, `failed`, `moved` and `same`.
- Ends use `stopped()`/`end()` from `src/roles/implementor/ends.ts:19-34`. The Guard pattern is `CONTINUATIONS` at `src/roles/implementor/implement.ts:21-25`. `failed` reaches a state only if the state lists it (`src/roles/walk.ts:120-121`).
- The spec added the new `ImplData` fields as optional, type-only (`stackedOn`, `syncs`, `testsOnly`, `passedSha`, `maxConflictFixes`, `maxSyncs`). The implementer may make them required. They also add whatever private fields the rebase needs (its `baseSha`, its files, whether the head changed, the resolver's reading and its continuation count). The tests don't pin those names.

**Ops and checks.**
- `sync-work?` reuses `syncTarget` (`src/stack.ts:133-160`) with a config pointed at the job's checkout through `withCheckout`, as `src/roles/spec-writer/checks.ts:226` does.
- `rebase` uses `syncReplyOf` (`src/workflow/stages/checks-reply.ts:83-105`). `sync-base` already pushes a clean rebase (`src/ops/sync.ts:248-262`), so a clean `rebase` doesn't call `finish-sync`. This departs from the wiki's Lifecycle row "clean → `finish-sync`" (see Wiki updates).
- `finish-sync` uses `finishRequest` (`src/workflow/stages/conflict-target.ts:72-91`) and `finishReplyOf` (`checks-reply.ts:107-120`). With `abort: true`, `finish-sync` resets the checkout to the pushed branch (`src/ops/sync.ts:270-286`).
- `continue` runs git in the job's checkout with `ISSUE_PIPELINE_COMMIT=1`, so the checkout's pre-commit hook (`src/clone-setup.ts:23,57`) lets the rebase commit. It answers `clean` or `conflict` from `unmergedFiles`/`rebaseInProgress` (`src/rebase.ts:27,42`).
- A resolver's `pipeline_commit` during the rebase is deferred, not pushed (`src/job/commit-push.ts:116-121`, `rebasing`). The resolution reaches GitHub only through `finish-sync`. At stage `sync`, every push is deferred (`DEFERRING_STAGES`, `commit-push.ts:29-33`).

**Resolver task.**
- A new task builder beside `src/roles/implementor/task.ts` reuses `preamble`, `handoffRule`, `handoffLead`, `commitOftenRule`, `NO_ARTIFICIAL_LOAD_RULE` (`src/workflow/prompts.ts`) and `CIFIX_SCHEMA` (`src/workflow/schemas.ts`).
- It keeps a role-local copy of `codeTask`'s wording (`src/workflow/stages/conflict-target.ts:127-142`) that drops "`git add` the files and run `GIT_EDITOR=true git rebase --continue`; repeat if a later commit stops too". Instead it says: resolve the stopped commit, commit it with `pipeline_commit`, and don't continue or abort the rebase.
- `resolverTask` itself needs a `StageState`, which the role doesn't have (`conflict-target.ts:157-178`).
- The default of 2 matches `DEFAULT_CONFLICT_FIXES` (`conflict-resolver.ts:31`).

**Stop codes:** `conflict` (`src/stops.ts:205-212`) and `sync-limit` (`src/stops.ts:213-220`; its `test` regex matches "kept moving", so keep today's reason "`<base>` kept moving; rebased N times without merging" from `src/workflow/stages/sync.ts:83-88`).

**Registry:** `src/roles/registry.ts:127` registers every stage in `IMPLEMENTOR_STAGES` (`src/roles/implementor/implementor.ts:13`). Its comment there, and the "later parts add theirs" comment, get updated.

**Practices followed** (Coding-Practices-Digest; `AGENTS.md`; Decisions-Code-and-tooling):
- Deep modules and information hiding: every sync decision is in `sync.ts`/`checks.ts`, and the stage code's pure helpers are imported, not copied, except the one prompt paragraph that must differ.
- Define errors out of existence: a malformed old field reads as missing, as `countOr` does.
- Exhaustive unions, zod at the check boundaries (the existing `looseObject` pattern in `checks.ts`), no `as`, no ternaries, files ≤ 300 lines and functions ≤ 50.
- Tests pin promised behaviour: the wiki's state names, stop codes, limits, ops requests and GitHub-visible effects (pushed heads on the origin, `post`/`stop` requests). They don't pin prompt wording beyond the commit and continue rules, and they don't pin private data fields.
- `pipeline-tests-bounded`: the job tests use `runJob`'s bound and local bare repos only.

**Design it twice.**
- Option A, chosen: the entry-named results (`implement`/`sync`) from `sync-work?`, `rebase` and `finish-sync`, so #418 adds one edge per state.
- Option B: one `ok` result per state, with each entry looked up from `data.entry` in a dynamic `to`. The machine's `Edge.to` is static (`src/roles/machine.ts:84-88`), so B would need a change to the shared machine. A is used.
- Option A also has separate `abort-…` states instead of one `abort` state with a reason in data. A Guard's `over` must be a state, so the over-limit paths need their own states anyway.

## Test interfaces

- `TABLE`, `transition`, `LIMITS`: `src/roles/implementor/machine.ts:20-31` (changed). The edges and limits.
- `locate`: `src/roles/implementor/locate.ts` (changed, type-only `ImplData` fields). Entry and old-state reading.
- `IMPLEMENTOR_STAGES`, `implementorMachine`: `src/roles/implementor/implementor.ts:13-24` (changed). Stages, handoff, `limitsOf`.
- `job.mjs --stage sync|implement`: `src/job.ts` (changed). A stage job with fake ops, fake pi and local git.

## Tests

All tests fail today on assertions, not on syntax, import or type errors (`npm run typecheck` and `biome check` pass on the branch).

`test/roles-implementor-sync-machine.test.mjs` (new; drives `TABLE`/`transition` through `test/implementor-sync-test-kit.mjs`'s `syncStep`, which fails with "the implementor has no state X" while the state is missing):
1. "every edge of the start sync and the sync entry gives its next state, effect and data". Drives `transition` over `test/implementor-sync-edge-fixtures.mjs`, Behaviour 1–9. It fails today because `start implement` goes to `implement-work?` and no state `sync-work?` exists.
2. "the limits bound conflict fixes at 2 and the sync entry's rebases at 3 by default, from the config". Drives `LIMITS`, `limitsOf` and `checkTable`, Behaviour 11 and 5. It fails because `LIMITS` is `{maxContinuations: 1}`.
3. "the implementor runs the implement and sync stages, and hands off the sync's fields". Drives `IMPLEMENTOR_STAGES` and `handoff`, Behaviour 11. It fails because the stages are `["implement"]`.
4. "an issue saved at sync by today's stage resumes in the sync entry with its counts, the checkpoints winning". Drives `locate`, Behaviour 10. It fails because the entry is always `implement`.
5. "the start check names the sync entry, and the start sync's checks carry what the issue is stacked on". Drives `locate`, `TABLE` and `transition`, Behaviour 1–3 (stacked). It fails because the entry is `implement`.
6. "the resolver runs as today's writer with the fixer's model and budget, its schema, the files, the commit and load rules, and leaves the rebase to the role". Drives `transition`, Behaviour 4. It fails because there is no state `rebase`.
7. "a resolver that hands off gets one continuation, counted as neither a conflict fix nor an implementer continuation, then the rebase is aborted and the issue stops as too large". Drives `transition`, Behaviour 7. It fails because there is no state `resolver`.

`test/roles-implementor-sync-job.test.mjs` (new; drives `job.mjs` through `runJob`, with `test/implementor-sync-job-test-kit.mjs`'s `behindBase` and the fake ops' local-git `sync-base`/`finish-sync` in `test/fake-rpc-pi.mjs`, used when their reply sets `git`):
1. "a stage job at sync on a branch that has the base's head saves at checks with no rebase and no comment, a passed head re-running only the tests". Behaviour 2, 9 and 11. It fails because `--stage sync` runs today's stage code, which calls `sync-base` and ends with no role `end`.
2. "an implement entry on a branch behind its base rebases and pushes before the implementer starts". Behaviour 3 and 1. It fails because no `sync-base` is sent.
3. "a stage job at sync with a clean rebase of a passed head pushes it and saves at checks with testsOnly". Behaviour 3, 9 and 11. It fails because there is no role end, and `syncs`/`testsOnly` are not saved by the role.
4. "a conflicting rebase runs the resolver, then the role continues the rebase and pushes the resolution". Behaviour 4. It fails because today's stage leaves the rebase in progress, so `finish-sync` rejects and the issue stays at `sync`.
5. "a resolver's cannot-fix aborts the rebase and releases the issue at its stage for the next job". Behaviour 6. It fails because today's stage saves rather than releases, and sends no `abort`.
6. "past maxConflictFixes a conflict aborts the rebase and stops with agent:stopped-conflict, pushing nothing". Behaviour 5. It fails because there is no role end and no `finish-sync` abort.

Updated existing tests:
- `test/roles-implementor-machine.test.mjs`: the edge coverage includes the sync edges, and the `resolver` is the second session state. The `LIMITS` and `handoff` sets are extended (Behaviour 11). "the table has no faults under its limits" and the handoff test fail today.
- `test/implementor-edge-fixtures.mjs`: the `start` edge moved to the sync fixtures.
- `test/roles-implementor-isolation.test.mjs`: `IMPLEMENTOR_STAGES` is `["implement", "sync"]`, the role is registered for `sync`, and `sync.ts` exists and is joined by `machine.ts` (Behaviour 11 and 12). These fail today.

## Wiki updates

None from this stage. The spec writer's job for this issue had no wiki checkout (only `repo/`), so the wiki can't be edited here. The issue's Wiki section is still to be done (see risks):
- In Pipeline-Roles-Implementor, mark the start sync as built (#419), with the deviations above (clean rebase skips `finish-sync`; the `abort-…` states; `sync-moved?`; the resolver commits and the role continues).
- In Issue-Pipeline, make `conflicts-never-stop` describe the role's start sync.

## Assumptions and risks

- **Wiki edits not made.** This job had no wiki checkout, so the wiki changes listed above are still to be made. The implementor role writes no wiki (`implementor-reads-wiki`), so a maintainer or a later spec pass must make them.
- **One conflict fix per stopped commit.** Because the role, not the resolver, runs `rebase --continue` (the wiki's `continue` row), each conflicting commit of a multi-commit branch costs one `conflictFixes`. Today one resolver finishes the whole rebase. With the default of 2, a branch with three conflicting commits stops. project-buddy sets 100.
- **No rebase comments.** The role posts no "Rebased onto …" note and no resolver summary comment (the role has no comment op in #414). If maintainers want them, the implementer may add a `post` after the push, but never on the nothing-to-do path (job test 1 pins no `post`).
- **A resolver that disobeys.** If a resolver runs `rebase --continue` itself, `continue` finds no rebase in progress and answers `clean`. Its later commits at `implement` aren't deferred, but `finish-sync` then checks and pushes the head. A non-fast-forward push from `pipeline_commit` would fail harmlessly.
- **Failed session.** Listing `failed` on `resolver` means a transient provider error stops the issue (`error`) instead of today's rate-limit hold (`src/workflow/stages/sync-conflict.ts`, `isTransientSessionError`). The issue asks for "a failed session → abort and stop". The abort is needed so the job doesn't exit mid-rebase.
- **Lint baseline.** `biome check` on the whole app reports a pre-existing `noExcessiveLinesPerFile` error in `src/job/role-run.ts` on the base. This spec's files are clean.
- **Real ops.** The job tests' fake `sync-base`/`finish-sync` mimic `src/ops/sync.ts` with local git. They don't check markers or the base the way `finishProblem` does.

## Sources

- Issue #419 and its triage notes.
- Wiki (at `wiki-mirror.git` HEAD `d32f602`): Pipeline-Roles-Implementor ("Lifecycle", "Start sync", "Sync", "Stacked branches", the test table rows "Sync with nothing to do", "Sync at edges" and "Machine edges"), Pipeline-Roles#sync-at-edges, Issue-Pipeline#conflicts-never-stop, and Coding-Practices-Digest.
- Code: `src/roles/implementor/{machine,start,states,locate,checks,ends,implement,implementor,task}.ts`, `src/roles/{machine,walk,registry}.ts`, `src/workflow/stages/{sync,sync-conflict,conflict-resolver,conflict-target,checks-reply,stacked}.ts`, `src/ops/sync.ts`, `src/stack.ts`, `src/rebase.ts`, `src/job/commit-push.ts`, `src/clone-setup.ts`, `src/stops.ts`, `src/roles/spec-writer/checks.ts`, `src/config-schema.ts:40-44`, and `src/workflow/stages/types.ts:162-167`.
- Tests: `test/implementor-{edge-fixtures,role-test-kit,job-test-kit}.mjs`, `test/roles-implementor-{machine,job,isolation,resume}.test.mjs`, `test/{job-test-kit,job-git-test-kit,fake-rpc-pi,role-context-fixtures,workflow-stages-fixtures}.mjs`.

<!-- end of spec -->
