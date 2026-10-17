Part 1 of #388. Only the orchestrator changes. All paths below are under `apps/issue-pipeline/`.

## Behaviour

Each item is one checkable statement. An issue's *stub files* are defined in B2; a *live implementation* is an issue past `implement` until it merges or stops, or an issue at `implement` whose job is live (`isLiveImplementation`).

- B1. An issue starting `implement` is held `files-overlap:#N` when one of its stub files is among the changed files of live implementation #N's branch, both on a first start (`schedule`) and on a restart (`startGate`).
- B2. An issue's stub files are the `where` of each `new` entry in its saved state's `interfaces`.
- B3. When several live implementations change one of an issue's stub files, the hold names the oldest of them.
- B4. An issue and its prerequisite or dependent (`stackPartners`) never hold each other on files.
- B5. The hold's reason string stays `files-overlap:#N`, as the log shows it today.
- B6. An issue starting `implement` is started when no live implementation's branch changes any of its stub files, whatever else those branches change.
- B7. An issue with no stub files (no saved `interfaces`, none `new`, or malformed ones) is never held `files-overlap`, where today such an issue claims the whole repo (`**`) and waits on every live implementation.
- B8. A live implementation whose branch wasn't read (`changed` null) holds no issue on files.
- B9. An implement started earlier in the same tick holds no other implement on files, since it has no changed files yet.
- B10. A `fix`, `sync` or `checks` start or restart is never held `files-overlap`, including a lifted issue and an issue ranked behind an older live branch.
- B11. A saved state's `files` and an issue body's `Files: …` line are ignored: an issue that has them is held or started by the stub rule alone, and neither makes it claim the whole repo.
- B12. `readQueue` gives every `SnapshotIssue` a field `stubs: readonly string[]` holding its stub files, which is `[]` when the saved `interfaces` is missing, has no `new` entry, or is malformed.
- B13. `readQueue` gives every `SnapshotIssue` a field `changed: readonly string[] | null`, which for a live implementation is the output of `git diff --name-only <merge base>..origin/agent/issue-N`, the merge base taken between `origin/agent/issue-N` and `measureFrom(stackedOn, cfg)`, so files the base gained since the branch was cut, or a stacked prerequisite's files, aren't counted.
- B14. `changed` is null when the issue isn't a live implementation, when no issue in the queue has stub files (then no branch is read), or when the branch can't be read (no branch on GitHub, no shared clone, or git fails), and the rest of the queue is still read.
- B15. `SnapshotIssue` has no `files` field.
- B16. The merge rank (`mergeRank`) counts a waiting issue as depending on a ranked candidate when the waiting issue's after mark names the candidate or one of its stub files is in the candidate's `changed`, and otherwise the waiting issue adds nothing to that candidate's rank.

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
- Overlap that shows up after `implement` starts: it is left to the start sync and the conflict resolver (`sync-at-edges`), unchanged.

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

- **`schedule(snapshot: Snapshot, settings: ScheduleSettings, now: Date): Decision[]`**, existing (`src/orchestrator/schedule.ts:261`). Its `held`/`started` decisions and their reasons check B1, B3, B4, B5, B6, B7, B8, B9, B10 and B11.
- **`startGate(snapshot, settings): StartGate`**, existing (`src/orchestrator/schedule.ts:283`). How it holds restarts checks B1 and B10.
- **`mergeRank(issues): number[]`**, existing (`src/orchestrator/queue.ts:232`). The merge order checks B16.
- **`readQueue(cfg, started, now): Queue`**, changed (`src/orchestrator/snapshot.ts:239`). Each issue now carries `stubs` and `changed`. It checks B2, B11, B12, B13, B14 and B15.
- **`SnapshotIssue`**, changed (`src/orchestrator/queue.ts:56`). `files` is replaced by `stubs: readonly string[]` and `changed: readonly string[] | null`. The recorded snapshots in `test/orchestrator-fixtures.mjs` and `test/orchestrator-stacked-fixtures.mjs` build it. It checks B12, B13, B15 and B16.

`branch-changes.ts` is internal, reached only through `readQueue`. No interface is new, so no stub was committed.

## Tests

All are committed on `agent/issue-390`.

**Current status:**
- Lint passes (`npx biome check --error-on-warnings apps/issue-pipeline`).
- Typecheck passes (`npm run typecheck -w apps/issue-pipeline`).
- Of the 131 orchestrator and helpers tests (`node --test test/orchestrator*.test.mjs test/helpers.test.mjs`), 23 fail, all of them the new and updated #390 cases below. The other 108 pass.
- Each fails because the behaviour is missing, never on an import or type error:
  - the snapshot tests read the new fields through zod's `safeParse`, so they type-check before the fields exist;
  - the fixtures' `IssueFields` type allows `stubs` and `changed`.
- A scratch implementation, never committed, made every orchestrator and helpers test pass.

Most `schedule` cases fail today for one reason: the fixtures no longer carry `files`, so today's gate treats every writer as claiming the whole repo (`**`) and holds it behind any older live implementation.

**`test/orchestrator-stubs.test.mjs` (new)**, through `schedule` and `startGate`:
- "an implement is held by the oldest of the live branches that change its stub", through `schedule`, pins B1, B3 and B5. It fails today: the whole-repo claim names a different holder.
- "an implement whose stubs no live branch changes starts, whatever else they change", through `schedule`, pins B6. It fails today: the implement is held.
- "an implement with no stub files starts beside live implementations", through `schedule`, pins B7. It fails today: it claims the whole repo and is held.
- "a live implementation whose branch wasn't read holds no implement", through `schedule`, pins B8. It fails today for the same reason.
- "an implement started in the same tick has no changed files yet, so it holds no other", through `schedule`, pins B9. It fails today: the first implement claims the whole repo and holds the second.
- "a fix start or restart is never held on files", "a sync start or restart is never held on files" and "a checks start or restart is never held on files", through `schedule` and `startGate`, pin B10. They fail today: writers are gated by age and queue rank.
- "an implement restart is held by the live branch that changes its stub", through `startGate`, pins B1. It fails today: the hold names the wrong holder.

**`test/orchestrator.test.mjs` (updated)**, fixtures moved to `stubs`/`changed`:
- "an implement whose stub a live branch changes waits; one whose stubs no branch changes starts", through `schedule`, pins B1 and B6.
- "a fix isn't held by an older live branch that changes its stub, so no chain deadlocks", through `schedule` and `mergeRank`, pins B10 and B16. It fails today: the fix is held.
- "an older merge doesn't hold the writer ranked ahead of it", through `schedule` and `mergeRank`, pins B10 and B16. It fails today: the rank counts the waiting issues' whole-repo claims, so #80 ranks ahead of #81.
- "the merge an issue's after mark waits for ranks first", through `mergeRank` and `schedule`, pins B16 (the after-mark half). It fails today: the waiting issues' whole-repo claims count against both candidates, so #41 ranks first.
- "the merge whose branch changes a waiting issue's stub ranks first", through `mergeRank`, pins B16 (the stub half). It fails today: the rank reads `files`, not `changed`.
- "once the last hour's tokens reach the rate limit, every start is held", through `schedule`, pins B6: implement #12, whose stubs no live branch changes, reaches the rate-limit hold rather than `files-overlap:#10`. It fails today with `#12 implement held files-overlap:#10`.

**`test/orchestrator-snapshot-stubs.test.mjs` (new, replacing `orchestrator-snapshot-files.test.mjs`)**, through `readQueue`, with real bare origins and the shared clone as `orchestrator-snapshot-behind.test.mjs` uses. Every case fails today because `readQueue` gives no `stubs` or `changed`.
- "an issue's stub files are the paths of the new interfaces its saved state names" pins B2 and B12: only `new` entries count, and the result is `[]` when `interfaces` is malformed or missing.
- "a live implementation's changed files are its branch's own, from the base or the prerequisite head it is stacked on" pins B13, and B14 for a non-live issue with a branch. The base moves on with `src/base-only.ts`, which must not be counted.
- "a live implementation with no branch on GitHub changes nothing, and the rest of the queue is still read" pins B14.
- "with no issue that has stub files, no branch is read and every changed is null" pins B14, the skip.
- "saved files and a files line are ignored: implements start or wait by their stubs alone", through `readQueue` and then `schedule`, pins B11.

**`test/orchestrator-snapshot.test.mjs` (updated):** "each open issue carries the sweep's verdict, its saved stage and PR, and its open after marks, but no saved files", through `readQueue`, pins B12, B14 and B15: the expected issue has `stubs: []`, `changed: null` and no `files`. It fails today: `files` is there and the new fields aren't.

**`test/orchestrator-lifted.test.mjs` (updated):**
- "a lifted checks isn't held by an older live branch ranked ahead of it that changes its stub", through `schedule`, pins B10. It fails today: the checks is held.
- "a lifted merge ranked first starts with the merge queue", through `schedule`, pins B10: the checks beside it starts `free`. It fails today: that checks is held.
- "a lifted issue past implement holds a younger implement whose stub its branch changes", through `schedule`, pins B1.

**`test/orchestrator-stacked-fixtures.mjs` and `test/orchestrator-stacked.test.mjs` (updated):**
- "a stacked issue's implement and fix aren't held by its prerequisite's branch changing their stub", through `schedule`, pins B4 and B10.
- "with no after mark and no stack, the decisions are as before and none stacks", through `schedule`, pins B10: the merge-over-chain fix now starts `free`. It fails today: the fix is held.

**`test/helpers.test.mjs` (updated):** the `globsOverlap`/`fileSetsOverlap` case is removed with the functions.

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
