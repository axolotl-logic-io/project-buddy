## Behaviour

- A stacked spec whose prerequisite was squash-merged into the base branch, with the prerequisite's branch deleted, kept, or rebased before its merge, lists only its own commits as committed and passes the commit check with only its own files.
- A stacked spec that has changed nothing since the prerequisite head it started on is confirmed as no work after the prerequisite merged and its branch was deleted.
- A branch the spec stage creates saves null `startSha` and `startWikiSha` checkpoints, and a run that starts from those checkpoints with the state's `stackedOn.headSha` set measures from that head.
- A spec with no `startSha` and no `stackedOn` measures from `origin/<base branch>`, so it lists only its own commits after the base moved on.

## Out of scope

- Where a stacked issue's branch is created, or how `--stack-on` and the claim pick its start point (`src/stack.ts`, `src/checkouts.ts`).
- The null checkpoints that mark a branch the stage created: `startHeads` (`src/roles/spec-writer/checks-git.ts:86`), `edges.ts:52-64` and `locate.ts:124-136` stay as they are. Null `startSha` still means the reset deletes the branch.
- The sync, review, verify and merge stages' stacking (`stacked-branches`), and the orchestrator.
- A migration of saved states. A state saved before this change (null `startSha`, `stackedOn.headSha` set) needs none, since the checks read `stackedOn` from the state.

## Design

Cause: `baseOf` (`apps/issue-pipeline/src/roles/spec-writer/checks-git.ts:98-112`) falls back, for a null `startSha`, to `origin/agent/issue-<P>` only while that ref exists, and to `origin/<baseBranch>` otherwise. Once the prerequisite is squash-merged and its branch deleted, `base...HEAD` runs from the old merge base, and counts the prerequisite's commits as the spec writer's. A prerequisite branch that was rebased before its merge does the same while it still exists, because its merge base with the spec's branch is then the old base commit. `committedSince` (`:124`), `specTestsAtHead` (`:163`, through `check.ts:72`'s three-dot range), `noWorkConfirmed` (`:193`) and `resetBranches` (`:268`) all read `baseOf`.

Change:

1. `checks-git.ts:43-48`: `SpecJob.stackedOn` becomes `StackedOn | null`, using the type `src/stack.ts:28` exports (`{ issue: number; headSha: string }`). Don't declare a second copy of the shape. Update the interface comment.
2. `checks-git.ts:98-112`: `baseOf` returns `startSha` when it isn't null, otherwise `stackedOn.headSha` when stacked, otherwise `` `origin/${cfg.baseBranch}` ``. Drop the `refHead(origin/<prereq branch>)` lookup and the `paths.worktree` read it needed. Rewrite the comment above it to say the base is the start head, the prerequisite head the branch was started on, or the base branch, and that it never reads a ref that can move or vanish.
3. `checks.ts:234`: `const stackedOn = entry.saved.stackedOn ?? null;`, the whole `{ issue, headSha }` and not `.issue`. `State.stackedOn` (`src/state.ts:38`) is already parsed by zod at the state's boundary, so no cast is needed.
4. `resetBranches` (`checks-git.ts:272`) keeps calling `baseOf(job, null)` for its fallback and its `assertOwnHead` base. For a stacked spec it now gets the pinned head, the same base the checks use. The head is in the job's checkout, because the issue's branch starts from it (`stacked-branches`).

The issue's second Behaviour bullet ("records `startSha` and `startWikiSha` ... at that moment") is met as triage read it. The checkpoints are already saved (`machine.ts:296`, `edges.ts:52-64`) and read back (`locate.ts:124-136`), and null marks a created branch that `reset` deletes. The base no longer depends on a vanishing ref because `baseOf` reads the pinned `stackedOn.headSha`, not because a sha is stored in `startSha`.

Practices this follows:
- CONTRIBUTING "Design": information hiding and pulling complexity down. The base rule stays in `baseOf`, its one module, and callers don't change. The change also removes a git lookup.
- CONTRIBUTING "Types": `stackedOn`'s type is imported, not copied. There are no casts, and parsing stays at the state's zod boundary.
- `practices-cover-all-code` and `aposd-and-strict-typing`: the change is in `apps/issue-pipeline`, under the same rules.
- `tests-pin-promised-behaviour`: the tests assert how the stage ends (`saved` at `implement`, `stopped` `no-work`), the saved checkpoints, and the files the session is told are committed. That list is promised in `Pipeline-Roles-Spec-Writer` ("lists the test files, stubs ... and the task names them").
- `pipeline-tests-bounded`: every test uses real temporary bare repos and git, with no timers, waits or repeats.
- Wiki decision `stacked-branches` (Issue-Pipeline): only the dependent's own commits count, measured from the saved prerequisite head. This applies the same rule as `prepare-review` and `verify` to the spec stage.

Design it twice. (A) The chosen design: `baseOf` reads the state's `stackedOn.headSha`. (B) Save the stacked start head as `startSha` when the stage creates the branch. B was rejected because null `startSha` is how `reset` knows to delete a branch it created, and because states saved before this change would still need a fallback.

## Test interfaces

- The spec writer role run, `roleOf("spec").run(entry, effects, cfg)` (`apps/issue-pipeline/src/roles/registry.ts:100`), driven through `specWriter(setup)` in `test/spec-writer-git-test-kit.mjs` with real bare origins and the role's real checks (`checkout`, `spec-tests-check`, `confirm-no-work`, `reset`). This is the interface the wiki's Pipeline-Roles-Spec-Writer test table already uses for the role (#334). The test kit gains a `prepare(origin)` option, which builds the origin's branches before the job's checkout opens and returns fields of the starting state.

## Tests

All tests are in `apps/issue-pipeline/test/roles-spec-writer-stacked-base.test.mjs` (new). It uses `test/spec-writer-git-test-kit.mjs`, which gets the `prepare` hook, and `test/spec-writer-role-test-kit.mjs`. The fixture is `mergedPrereq`. On #6's branch `agent/issue-6` it makes two commits, `apps/README.md` and `src/prereq.ts`, neither a test file nor in the spec's `files`. It puts #7's branch on #6's head, with the spec's test commit (trailer `Pipeline-Agent: spec writer`). Another issue's merge then lands on the base, followed by #6's squash-merge. Last, #6's branch is deleted, kept as it is, or kept after a rebase onto the base before the merge. The state has `stackedOn: {issue: 6, headSha}` and checkpoints `{startSha: null, startWikiSha: null}`, as a branch the stage created saves them. Each test drives the role run above.

1. "a stacked spec whose prerequisite merged and lost its branch lists and checks only its own commits": pins Behaviour 1 and 3. Today it fails. `baseOf` falls back to `origin/integration`, so the session is told `apps/README.md` and `src/prereq.ts` are committed, and the commit check fails twice (`not-allowed`). The run stops `error` instead of saving at `implement`.
2. "a stacked spec whose merged prerequisite kept its branch lists and checks only its own commits": pins Behaviour 1, the branch-present half. It passes today, because `origin/agent/issue-6` still points at the head the spec started on. It guards against a change that would break that case.
3. "a stacked spec whose prerequisite was rebased before its merge lists and checks only its own commits": pins Behaviour 1. Today it fails. The rebased `origin/agent/issue-6` shares only the old base commit with the spec's branch, so the prerequisite's files are listed and the check fails twice.
4. "a stacked spec that changed nothing since the prerequisite's head is no work after the prerequisite merged": pins Behaviour 2. The spec's branch is #6's head, and the test command is `exit 1`. Today it fails. The base is `origin/integration`, whose tree differs, so the no-work check runs the failing test command and the run stops `error` instead of `no-work`.
5. "a branch the stage created saves null start heads": pins Behaviour 3. A fresh stacked run (`stacked: true`) saves `startSha` and `startWikiSha` as null. It passes today, because that is existing behaviour the issue keeps (triage note 4). Tests 1, 3 and 4 start from these checkpoints through `locate` and fail today.
6. "an unstacked spec measures from the base branch after the base moved": pins Behaviour 4. The spec's branch is on the old base and another issue's merge moved the base on. It passes today, because the rule is unchanged. It guards against a fix that breaks the unstacked case.

Verified locally: with the change described in Design applied to a scratch copy (not committed), all six tests and all 157 tests in `test/roles-spec-writer*.test.mjs` pass. On the base, tests 1, 3 and 4 fail as described. `npm run typecheck` and Biome pass on the test files.

No existing test or kit builds a `SpecJob` with a numeric `stackedOn`, so no fixture needs the new shape (`grep stackedOn test/roles-spec-writer*.test.mjs test/spec-writer-*kit.mjs`). The git kit's `stacked: true` already saves `{issue, headSha}`.

Acceptance: `mise //apps/issue-pipeline:check` passes.

## Wiki updates

- `Pipeline-Roles-Spec-Writer.md`: a new paragraph, **The spec's base**, under Locate (#401). The `checkout` row and the commit check's base sentence now point to it, and the test table gains the row "A stacked spec keeps its base".

## Assumptions and risks

- The prerequisite head is in the job's checkout. It is, because the issue's branch starts from it. If a person rebased the spec's own branch off that head, `base...HEAD` would still use the merge base, which is no worse than today.
- With `startSha` null, the reset's `assertOwnHead` now counts the spec's commits from the prerequisite head, not from the base. That is stricter and correct: before, it would also have counted the prerequisite's commits, which lack the spec trailer, and refused the reset.
- The committed-files test reads the file names from the session's task, which the wiki promises lists them. It matches only the backticked names, not the wording.

## Sources

- `apps/issue-pipeline/src/roles/spec-writer/checks-git.ts:43-48, 98-112, 124-140, 163-188, 193-209, 268-282`
- `apps/issue-pipeline/src/roles/spec-writer/checks.ts:226-236`
- `apps/issue-pipeline/src/roles/spec-writer/check.ts:72`
- `apps/issue-pipeline/src/roles/spec-writer/edges.ts:52-64`, `locate.ts:124-136`, `machine.ts:296`, `task.ts:123-155`
- `apps/issue-pipeline/src/stack.ts:17-28`, `src/state.ts:38`
- `apps/issue-pipeline/test/spec-writer-git-test-kit.mjs`, `test/job-git-test-kit.mjs`, `test/roles-spec-writer.test.mjs:140, 267`
- `AGENTS.md`, `CONTRIBUTING.md`, and the wiki's Decisions-Code-and-tooling (`practices-cover-all-code`, `aposd-and-strict-typing`, `tests-pin-promised-behaviour`, `pipeline-tests-bounded`)
- Wiki: Pipeline-Roles-Spec-Writer (Lifecycle, Locate, commit check, test table), Issue-Pipeline (`stacked-branches`), Running-the-Issue-Pipeline (Stacked branches), Pipeline-Roles-Shared (Checkpoints)
- Issue #401 and its triage comment

<!-- end of spec -->
