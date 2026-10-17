Part 1 of #388. Only the orchestrator changes. All paths below are under `apps/issue-pipeline/`.

## Behaviour

1. **B1, held on a stub.** An issue starting `implement` is held `files-overlap:#N` when one of its stub files is among the changed files of live implementation #N's branch. This holds for a first start (`schedule`) and for a restart (`startGate`).
   - Its stub files are the `where` of each `new` entry in its saved state's `interfaces`.
   - When several live implementations change one of its stub files, #N is the oldest of them.
   - An issue and its prerequisite or dependent (`stackPartners`) never hold each other.
   - The log keeps the reason string `files-overlap:#N`.
2. **B2, started otherwise.** An issue starting `implement` is started when no live implementation's branch changes any of its stub files, whatever else those branches change.
3. **B3, nothing to match.** These cases never hold anything on files:
   - An issue with no stub files (no saved `interfaces`, none `new`, or malformed ones) is never held `files-overlap`. Today such an issue claims the whole repo (`**`) and waits on every live implementation.
   - A live implementation whose branch wasn't read (`changed` null) holds no issue.
   - An implement started earlier in the same tick holds no other implement, since it has no changed files yet.
4. **B4, only implement is gated.** `fix`, `sync` and `checks` starts and restarts are never held `files-overlap`. This includes lifted issues and issues ranked behind an older live branch. Overlap that shows up after `implement` starts is left to the start sync and the conflict resolver (`sync-at-edges`).
5. **B5, file lists ignored.** A saved state's `files` and an issue body's `Files: …` line are ignored. An issue that has them is held or started by the stub rule alone. Neither one makes it claim the whole repo.
6. **B6, the snapshot.** `readQueue` gives every `SnapshotIssue` two fields:
   - `stubs: readonly string[]`, its stub files. This is `[]` when the saved `interfaces` is missing, has no `new` entry, or is malformed.
   - `changed: readonly string[] | null`.

   `changed` is set only for live implementations (`isLiveImplementation`), and only on a tick where some issue in the queue has stubs. Its value is `git diff --name-only <merge base>..origin/agent/issue-N`. The merge base is taken between `origin/agent/issue-N` and `measureFrom(stackedOn, cfg)`: the base branch, or the prerequisite head the branch is stacked on. So the files the base gained since the branch was cut aren't counted, nor are a stacked prerequisite's.

   `changed` is null in these cases, and the rest of the queue is still read:
   - the issue isn't a live implementation;
   - no issue has stubs;
   - the branch can't be read: no branch on GitHub, no shared clone, or git fails.

   `SnapshotIssue` has no `files` field.
7. **B7, the merge rank.** The merge rank (`mergeRank`) counts a waiting issue as depending on a ranked candidate when either holds:
   - the waiting issue's after mark names the candidate;
   - one of the waiting issue's stub files is in the candidate's `changed`.

   A waiting issue that meets neither adds nothing to that candidate's rank. Today the rank counts overlapping `files` globs instead.

## Out of scope

- Part 2 of #388, the spec side:
  - the spec writer's reply and its checks;
  - the saved `files` field itself, which stays in the state and is only no longer read;
  - `Files:` lines in split bodies;
  - `src/workflow/files-line.ts`, which stays unchanged and keeps its other callers;
  - the restart spec-files check;
  - the start-state carry-over.
- The other hold reasons, the caps, the stacking rules, the rate-limit backoff, and the merge order apart from its dependents count.
- Normalising stub paths. The match is exact (see Assumptions and risks).

## Design

**Snapshot fields.** In `src/orchestrator/queue.ts:64-65`, replace `files` with two fields, each with a one-line interface comment:
- `stubs: readonly string[]`;
- `changed: readonly string[] | null`.

**Removals in `queue.ts`.**
- Delete `WHOLE_REPO` (`queue.ts:99`) and `fileSet` (`queue.ts:147-152`).
- Drop `fileSet` from the exports (`queue.ts:286`).
- Drop the `fileSetsOverlap` import (`queue.ts:7`).

**The stub test, in one place.** Add one predicate in `queue.ts`, for example `changesStub(issue, other): boolean`, which is true when some `issue.stubs` entry is in `other.changed`, and false when `changed` is null. Export it for `schedule.ts`. The rule "a stub this branch changes" then lives in one module (information hiding), and both the gate and the rank use it.

**The rank.** `dependents` (`queue.ts:190-200`) counts `issue.after.includes(candidate.number) || changesStub(issue, candidate)`.

**The gate.** `overlapReason` (`src/orchestrator/schedule.ts:96-118`) changes as follows:
- It returns null unless `stage === "implement"`.
- Otherwise it picks the oldest (`byAge`) live implementation `other` where all of these hold:
  - `other.number !== issue.number`;
  - `!stackPartners(issue, other)` (`stacking.ts`);
  - `changesStub(issue, other)`.
- It returns `files-overlap:#${other.number}`.
- Remove the fix/sync/checks age-and-`queueRank` branch (`schedule.ts:106-109`) and its comment.
- Remove the `fileSetsOverlap` import (`schedule.ts:6`) and the `fileSet` import (`schedule.ts:16`). Also remove the `queueRank` import (`schedule.ts:22`), since `schedule.ts:108-109` is its only use there.

`schedule.ts` stays a pure function of the snapshot (`schedule.ts:4`).

**Stubs in the snapshot.** In `src/orchestrator/snapshot.ts`:
- Drop `filesOf` (the import at `:23` and the use at `:131`).
- In `issueOf` (`:115`), set `stubs` from `interfacesOf` (`src/roles/spec-writer/reply.ts:230`, already exported):
  - read the saved `interfaces` by destructuring (`const { interfaces } = state ?? {}`), because TS4111 forbids reading an index-signature key with a dot (CONTRIBUTING "keys from an index signature are read by destructuring");
  - keep the `new` entries and map them to `where`;
  - use `[]` when `interfacesOf` returns undefined.
- Set `changed: null` in `issueOf`.

**Changed files in the snapshot.** In `readQueue` (`snapshot.ts:239`), add a pass after the prereq pass:
- skip it when no issue has `stubs.length > 0`;
- otherwise set `changed` for each issue where `isLiveImplementation` holds, by calling the new module.

`snapshot.ts` is at 287 lines, so keep the pass to a few lines, or move it into the new module.

**The git read.** It goes in a new internal module, `src/orchestrator/branch-changes.ts`, for example `branchChanges(cfg, issue: number, stackedOn: StackedOn | null): string[] | null`. It is modelled on `prereqBehind` (`src/stack.ts:95-125`) and works in `paths.clone(cfg)`:
- `fetchIn` the base and `agent/issue-N`;
- run `git merge-base <measureFrom(stackedOn, cfg)> origin/agent/issue-N` (`stack.ts:209`);
- run `git diff --name-only <base>..origin/agent/issue-N`;
- split the output into lines and drop the empty ones.

All git goes through `run` (`src/process.ts`) and `fetchIn` (`src/git-state.ts`). Because of that, the module needs no new Node-API override in `apps/issue-pipeline/biome.jsonc` (`best-practice-over-lint`). It returns null on `OpsError`, `SyntaxError` and `ZodError`, and rethrows anything else, as `prereqBehind` does.

Design it twice:
- **Chosen:** the deep function above. It hides the refspecs, the merge base and the diff behind one call with no error case.
- **Rejected:** having `stack.ts` export a "merge base" helper that the snapshot composes with its own diff. That spreads the git knowledge and gives the snapshot error cases.

**`globs.ts`.** Remove `fileSetsOverlap` (`src/globs.ts:77-81`). After that, `globsOverlap`, and the `literalPrefix`/`WILDCARD` helpers that only it uses, have no callers in `src/`, so remove them too. Check with `grep -rn globsOverlap src`. Keep `globToRegExp` and `matchAny`, which other modules use. Their test case is already gone from `test/helpers.test.mjs`.

**Fixture leftover.** The fixtures' `BLANK` (`test/orchestrator-fixtures.mjs`) still sets `files: null`, so the tests type-check before the change. The implementer drops it once `SnapshotIssue` loses `files`. It type-checks either way, since it comes in through a spread.

**Practices followed:**
- CONTRIBUTING Design:
  - deep modules and information hiding: one git-read module, and one stub predicate;
  - define errors out of existence: an unreadable branch changes nothing (null), not an error;
  - pull complexity downward: the snapshot, not the scheduler, deals with git;
  - strategic, not tactical: the dead glob-overlap code is removed.
- CONTRIBUTING Types:
  - parse at the boundary: `interfacesOf` is the zod boundary for the saved `interfaces`;
  - no casts.
- CONTRIBUTING Lint:
  - 300 lines per file and 50 per function. `snapshot.ts` is at 287 lines, `queue.ts` at 298 and `schedule.ts` at 299; the deletions make room;
  - exports come last.
- Wiki decisions:
  - `stage-jobs-replace-lanes`: the scheduler is a pure function of a snapshot;
  - `stacked-branches`: stack partners don't hold each other, and the read reuses `measureFrom`;
  - `tests-pin-promised-behaviour`;
  - `pipeline-tests-bounded`;
  - `best-practice-over-lint`.
- This departs from `stage-jobs-replace-lanes`, which gated all four writers on `st.files` globs. Axlog's #388 decision replaces that rule. The new rule is recorded as `no-file-lists` in Issue-Pipeline, and `stage-jobs-replace-lanes` and `stacked-branches` now point to it.

## Test interfaces

- **`schedule(snapshot, settings, now): Decision[]`**, existing (`src/orchestrator/schedule.ts:261`). Its `held`/`started` decisions with their reasons check B1-B5.
- **`startGate(snapshot, settings): StartGate`**, existing (`src/orchestrator/schedule.ts:283`). It checks how restarts are held: B1 and B4.
- **`mergeRank(issues): number[]`**, existing (`src/orchestrator/queue.ts:232`). It checks the merge order (B7).
- **`readQueue(cfg, started, now): Queue`**, changed (`src/orchestrator/snapshot.ts:239`). Each issue now carries `stubs` and `changed`. It checks B5 and B6.
- **`SnapshotIssue`**, changed (`src/orchestrator/queue.ts:56`). `files` is replaced by `stubs: readonly string[]` and `changed: readonly string[] | null`. The recorded snapshots in `test/orchestrator-fixtures.mjs` and `test/orchestrator-stacked-fixtures.mjs` build it. It checks B6 and B7.

`branch-changes.ts` is internal, reached only through `readQueue`. No interface is new, so no stub was committed.

## Tests

All are committed on `agent/issue-390`.

**Current status:**
- Lint passes (`npx biome check --error-on-warnings apps/issue-pipeline`).
- Typecheck passes (`npm run typecheck -w apps/issue-pipeline`).
- Of the 131 orchestrator and helpers tests, 23 fail, all of them the new and updated #390 cases below.
- Each fails because the behaviour is missing, never on an import or type error:
  - the snapshot tests read the new fields through zod's `safeParse`, so they type-check before the fields exist;
  - the fixtures' `IssueFields` type allows `stubs` and `changed`.
- A scratch implementation, never committed, made every orchestrator and helpers test pass.

**`test/orchestrator-stubs.test.mjs` (new)**, through `schedule` and `startGate`:
- "an implement is held by the oldest of the live branches that change its stub" pins B1. It fails today because the fixture has no `files`, so the gate claims the whole repo and names a different holder.
- "an implement whose stubs no live branch changes starts, whatever else they change" pins B2. It fails today: no `files` means the whole repo, so the implement is held.
- "an implement with no stub files starts beside live implementations" pins B3. It fails today for the same reason.
- "a live implementation whose branch wasn't read holds no implement" pins B3. It fails today for the same reason.
- "an implement started in the same tick has no changed files yet, so it holds no other" pins B3. It fails today because the first implement claims the whole repo and holds the second.
- "a {fix, sync, checks} start or restart is never held on files" pins B4. It fails today because writers are gated by age and queue rank.
- "an implement restart is held by the live branch that changes its stub" pins B1 through `startGate`. It fails today because the hold names the wrong holder, or none.

**`test/orchestrator.test.mjs` (updated)**, with the fixtures moved to `stubs`/`changed`:
- "an implement whose stub a live branch changes waits; one whose stubs no branch changes starts", through `schedule`, pins B1 and B2.
- "a fix isn't held by an older live branch that changes its stub, so no chain deadlocks", through `schedule`, pins B4. It fails today because the fix is held.
- "the merge whose branch changes a waiting issue's stub ranks first", through `mergeRank`, pins B7.
- "a waiting issue whose stubs no ranked branch changes adds to no merge's rank", through `mergeRank`, pins B7. It fails today because the whole-repo claim counts it as a dependent.

**`test/orchestrator-snapshot-stubs.test.mjs` (new, replacing `orchestrator-snapshot-files.test.mjs`)**, through `readQueue`. It uses real bare origins and the shared clone, as `orchestrator-snapshot-behind.test.mjs` does. Every case fails today because `readQueue` gives no `stubs` or `changed`, and still reads `files`.
- "an issue's stub files are the paths of the new interfaces its saved state names" pins B6: only `new` entries count, and the result is `[]` when `interfaces` is malformed or missing.
- "a live implementation's changed files are its branch's own, from the base or the prerequisite head it is stacked on" pins B6. The base moves on with `src/base-only.ts`, which must not be counted. A non-live issue gets `changed` null.
- "a live implementation with no branch on GitHub changes nothing, and the rest of the queue is still read" pins B6.
- "with no issue that has stub files, no branch is read and every changed is null" pins B6, the skip.
- "saved files and a files line are ignored: implements start or wait by their stubs alone", through `readQueue` and then `schedule`, pins B5.

**Updated for the new fields:**
- `test/orchestrator-lifted.test.mjs`:
  - "a lifted checks isn't held by an older live branch ranked ahead of it that changes its stub" pins B4;
  - "a lifted issue past implement holds a younger implement whose stub its branch changes" pins B1.
- `test/orchestrator-stacked-fixtures.mjs` and `test/orchestrator-stacked.test.mjs`: "a stacked issue's implement and fix aren't held by its prerequisite's branch changing their stub" pins B1's stack-partner rule and B4. The merge-over-chain fix now starts.
- `test/orchestrator-snapshot.test.mjs`: the expected issue has `stubs: []`, `changed: null` and no `files` (B6).
- `test/helpers.test.mjs`: the `globsOverlap`/`fileSetsOverlap` case is removed with the functions.

## Wiki updates

- **Pipeline-Roles-Orchestrator:**
  - "Writers are gated on files" is now "Only an `implement` is gated on files" (`no-file-lists`, #390);
  - the merge order's dependents rule now reads "a stub its branch changes";
  - the hold reason keeps `files-overlap:#M`.
- **Running-the-Issue-Pipeline:**
  - the gate bullet is rewritten;
  - "Overlap is conservative" is deleted;
  - the merge-order dependents, the restart line and the file-sets note are updated;
  - the log line keeps `files-overlap:#M`.
- **Issue-Pipeline:**
  - new `### no-file-lists` at the end of Design. It records Axlog's #388 decision, the gate settled in #390, what was rejected, and the known limits;
  - `stage-jobs-replace-lanes` now says the writers' `st.files` gate and the glob overlap were replaced by `no-file-lists`;
  - `stacked-branches` now names the implement file-overlap gate.

## Assumptions and risks

- **Exact paths.** A stub's `where` must be relative to the repo root and carry no `:line` suffix, or it can't match `git diff --name-only` output. The issue defines stubs as the `where` of `new` entries, as written. Specs here sometimes write app-relative paths (this issue's own text does: `src/orchestrator/queue.ts`), and an app-relative `where` matches nothing in this monorepo, so it never holds anything. That fails open: the worst case is a merge conflict for the conflict resolver, not a deadlock. Part 2, which reworks the spec side, is the place to require repo-root paths. Normalising paths is left out of scope.
- **Same-tick starts.** Two implements with the same stub file that start in one tick both start, since neither has changed files yet. Their conflict goes to the sync and the conflict resolver.
- **Cost.** On a tick where any issue has stubs, the snapshot fetches the base and each live implementation's branch into the shared clone, as `prereqBehind` already does for stacking. The skip keeps ticks with no stubs at today's cost.
- **Unreadable branches fail open.** A branch that can't be read (a fetch fails, or there is no clone) holds nothing. A missed hold costs a later conflict, but a wrong hold would stall the queue.
- Nothing in the code, the wiki or the issue asked to change this task.

## Sources

- Issue #390 and parent #388 (Axlog's decision of 2026-10-17).
- `AGENTS.md`, `CONTRIBUTING.md` (Design, Types, Lint, Tests).
- Wiki pages:
  - Decisions-Code-and-tooling: `practices-cover-all-code`, `best-practice-over-lint`, `tests-pin-promised-behaviour`, `pipeline-tests-bounded`;
  - Issue-Pipeline: `stage-jobs-replace-lanes`, `stacked-branches`, `no-file-lists`;
  - Pipeline-Roles-Orchestrator;
  - Running-the-Issue-Pipeline.
- Code (under `apps/issue-pipeline/`):
  - `src/orchestrator/queue.ts:7,56-73,99,147-152,166,190-200,232,286`;
  - `src/orchestrator/schedule.ts:4,6,16,22,29,96-118,261,283`;
  - `src/orchestrator/snapshot.ts:23,115-137,239`;
  - `src/orchestrator/stacking.ts` (`stackPartners`);
  - `src/stack.ts:95-125,209`;
  - `src/roles/spec-writer/reply.ts:230,246`;
  - `src/globs.ts:77-84`;
  - `src/git-state.ts` (`fetchIn`) and `src/process.ts` (`run`).
- Tests:
  - `test/orchestrator-snapshot-behind.test.mjs` and `test/orchestrator-world-test-kit.mjs`, the models for the snapshot test;
  - the test files listed in Tests.

<!-- end of spec -->
