## Behaviour

1. A restart's missing-files check (`specFilesMissing`) counts a documented test or stub file as missing only when the spec head, the saved `specTestsSha`, lacked it too. A file that the branch's `HEAD` or the commit at `specTestsSha` tracks is present.
2. A documented test file that was at `specTestsSha` and that `HEAD` deleted is not missing. A spec whose writer wrote its tests (`specWritesTests` true) then gets no stop, and the claim carries on.
3. A documented file that was at `specTestsSha` and that `HEAD` moved to another path is not missing.
4. A `new` interface's stub (its `where`) that was at `specTestsSha` and that `HEAD` deleted is not missing.
5. A documented file that neither `specTestsSha` nor `HEAD` has is still missing, and only such files are reported. For a spec whose writer wrote its tests (`specWritesTests` true), the claim stops with the `spec-files` code (`agent:stopped-spec-files`), naming only those files.
6. A state whose `specTestsSha` is missing or empty, or names a commit the checkout can't resolve, keeps the rule from before this change: the files at `HEAD` alone. Specs saved before this change behave as they did, and the check doesn't throw.
7. The check still doesn't parse the spec for delete instructions. Which files a spec documents (`src/spec-files.ts`) doesn't change.

## Out of scope

- `src/spec-files.ts` (`documentedFiles`, `missingSpecFiles`, `isTracked`): unchanged. They already take any list of paths.
- `checkedSpecFiles` (`src/restart-spec.ts:60-80`), the claim's call at `src/ops/claim.ts:153-158`, and `specFilesStop`/`claimStep` (`src/workflow/stages/entry.ts:126-138`): unchanged. The stop's reason and detail text stay the same.
- Carrying `specTestsSha` over on restarts that don't resume a stop. `resumedStop` keeps it, because it spreads the saved state (`src/start-state.ts:196-210`), and that is the lift path #351 took. `branchStart` and `noWorkStart` rebuild the state with `carriedWork` (`src/start-state.ts:74-84`), which drops it. Those restarts (a `done` state, a lost stopped stage, answered questions) keep the HEAD-only rule, which is the fallback in Behaviour 6. `start-state.ts` is at 297 of its 300 lines, so carrying the sha over there would need its own restructuring. After answered questions the spec may change anyway.
- Parsing the spec for "delete" or "move" instructions (Behaviour 7).
- Releasing or deploying anything.

## Design

The change is in one function, `specFilesMissing` in `apps/issue-pipeline/src/restart-spec.ts:25-54`.

- Today it lists the tracked paths with `gitIn(wt, ["ls-tree", "-r", "--name-only", "HEAD"])` (`src/restart-spec.ts:45-47`) and passes them to `missingSpecFiles` (`src/spec-files.ts:71-80`).
- Pull that listing into a small module-private helper, such as `treeAt(wt: string, rev: string): string[]`: the non-empty lines of `git ls-tree -r --name-only <rev>`.
- `tracked` becomes the HEAD listing plus the listing at `state.specTestsSha`. Take the second listing only when `specTestsSha` is a non-empty string. `State` is a loose object (`src/state.ts`), so the field reads as `unknown` and needs a `typeof` check.
- `gitIn` (`src/git-state.ts:16-18`) calls `run` (`src/process.ts:102-128`), which throws `OpsError` on a non-zero exit unless `allowFail` is set. So either catch around the spec-head listing and use `[]`, or call `run` with `allowFail: true` and use `[]` when `code !== 0`. `git ls-tree` fails with "not a tree object" for a sha the checkout lacks, for example a spec head that a rebase dropped from a fresh clone. Either way that case falls back to HEAD only (Behaviour 6). The HEAD listing still throws as today.
- `missingSpecFiles` and `isTracked` (`src/spec-files.ts:63-80`) already match a path from the repo root or as an app-relative suffix against any list. A union of the two trees therefore gives Behaviours 1-5 with no change there (Behaviour 7). A duplicate path in the union is harmless: `isTracked` uses `some`.
- Update the interface comment above `specFilesMissing` (`src/restart-spec.ts:25-29`). Say that a file the spec head (`specTestsSha`) tracks counts as present, as `HEAD`'s do, and that a state with no resolvable spec head checks `HEAD` alone. Interface comments say what the function promises, not how (CONTRIBUTING, Design: Comments).
- `specTestsSha` is the head the spec writer saved once its tests were committed (`src/roles/spec-writer/edges.ts:79-87`). The verify step already treats it as the spec's own head (wiki Pipeline-Roles-Implementor, "`verify` runs the spec writer's tests as they were at `specTestsSha`"). This change uses the same reference point, so the spec's files mean the same thing everywhere.

Practices followed:
- CONTRIBUTING Design, "Pull complexity downward": the claim (`src/ops/claim.ts:155`) still makes one call. The spec-head rule and its fallback stay inside `restart-spec.ts`, so callers learn nothing new.
- CONTRIBUTING Design, "Define errors out of existence": a missing, empty or unresolvable sha is not an error. It means no extra paths.
- CONTRIBUTING Lint: at most 50 lines per function and 300 per file. `restart-spec.ts` is 82 lines now, and the helper keeps `specFilesMissing` short. Explicit parameter and return types, and exports last.
- Biome override: `src/restart-spec.ts` already has the node-API override for reading spec.md (`apps/issue-pipeline/biome.jsonc`, "src/restart-spec.ts reads a restart's spec.md"). Running git goes through `gitIn`, as it does today, so no new override is needed.
- Wiki `tests-pin-promised-behaviour`: the tests check the stop code and the missing list that the Agent-Labels page promises, through `specFilesMissing`, `checkedSpecFiles` and `claimStep`. They don't check git argv or call order.
- Wiki `pipeline-tests-bounded` and `flakes-are-failures`: the tests are deterministic. They use real temporary git repos made with `spawnSync`, with no timers or background processes.
- "Design it twice": two shapes were considered for `tracked`. (a) A union of the HEAD and spec-head trees. (b) "Missing at spec head and missing at HEAD", computed as two `missingSpecFiles` calls and intersected. (a) was chosen: it is one call, and it keeps `spec-files.ts`'s pure interface unchanged.

## Test interfaces

- `specFilesMissing(wt, state, wikiDir)`: `apps/issue-pipeline/src/restart-spec.ts:30`, changed. It now reads `state.specTestsSha`.
- `checkedSpecFiles(state, missing, now)`: `apps/issue-pipeline/src/restart-spec.ts:60`, existing.
- `claimStep(n, reply)`: `apps/issue-pipeline/src/workflow/stages/entry.ts:138`, existing. Its `stop.code` is the `agent:stopped-<control>` control.

## Tests

New file: `apps/issue-pipeline/test/restart-spec-head.test.mjs`. Each test builds a real temporary git repo with two commits. The first is the spec head, holding `test/thing.test.mjs`, `test/thing-kit.mjs` and the stub `src/thing.ts`. The second, HEAD, makes one `git rm` or `git mv`. The helper is `changedSinceSpec(name, change)`, which returns the checkout and the spec head's sha.

The tests are in a new file, not `test/restart-spec-files.test.mjs`. That file is already 191 lines, and five more tests plus a helper would bring it close to Biome's 300-line limit (CONTRIBUTING, Lint: Limits).

| Test | Interface | Behaviour | Why it fails today |
| --- | --- | --- | --- |
| "a documented file the branch deleted since the spec head is not missing, and the claim carries on" (line 107) | `specFilesMissing`, `checkedSpecFiles`, `claimStep` | 1, 2 | Today only HEAD is listed, so it returns `["test/thing-kit.mjs"]` |
| "a documented file the branch moved since the spec head is not missing" (line 118) | `specFilesMissing` | 1, 3 | Returns `["test/thing-kit.mjs"]`. The moved path doesn't end with `/test/thing-kit.mjs` |
| "a new interface's stub deleted since the spec head is not missing" (line 124) | `specFilesMissing` | 1, 4 | Returns `["src/thing.ts"]` |
| "a documented file neither the spec head nor HEAD has stops the restart, naming only it" (line 133) | `specFilesMissing`, `checkedSpecFiles`, `claimStep` | 5 | Returns `["test/thing.test.mjs", "test/never.test.mjs"]`, so the HEAD-deleted test file is wrongly named too |
| "a state with no spec head, or one the checkout lacks, checks the files at HEAD" (line 145) | `specFilesMissing` | 6, 7 | Passes today. It is the regression guard for old states (`specTestsSha` undefined, `""`, and a 40-zero sha the repo lacks). It must keep passing, without a throw |

I checked them locally. On the base, the first four fail on their `deepEqual` assertions, and the fifth passes. With a prototype of the Design (reverted, not committed), all five pass, and so do the existing `test/restart-spec-files.test.mjs` tests. `npm run typecheck` and `npm run lint` pass on the branch.

## Wiki updates

- `Agent-Labels.md`, the `agent:stopped-spec-files` row:
  - A file counts as missing only when the spec head (`specTestsSha`) lacked it too.
  - A state with no spec head, or one that doesn't resolve, checks `HEAD` alone (#408).
  - "Files list" is corrected to the `new` interfaces' stubs, as of #391.
- `Pipeline-Roles-Spec-Writer.md`, the restart-check bullet:
  - The same rule.
  - Why: #351's lift.
  - The check reads no delete instructions.
  - The fallback.

## Assumptions and risks

- **The spec head may not be reachable after a rebase.** It is usually an ancestor of the branch: the implementer builds on the spec writer's commits. After a rebase it may only be reachable if the clone fetched it before. If the checkout can't resolve it, the check falls back to HEAD only, which is today's behaviour. A deleted file could then still stop the issue. This is rarer than today's case and needs no hand state edit beyond what was needed before.
- **Two restart paths drop the sha.** Restarts that rebuild the state with `carriedWork` (`branchStart`, `noWorkStart`) lose `specTestsSha` today, so they keep the HEAD rule (see Out of scope). A follow-up could carry it over there.
- **What the check no longer catches.** A spec-head file the implementer deleted by mistake is no longer caught by this check. That is the intent of the issue. The verify step's run of the spec writer's tests at `specTestsSha` still catches a deleted spec test those tests need.
- **The sha is passed to git as an argument.** `specTestsSha` comes only from the pipeline's own commit reply (`src/roles/spec-writer/edges.ts:79-87`). The implementer may put `--end-of-options` before it as a guard against a value starting with `-`. This is optional.
- **The earlier spec check's reverted run failed for a reason outside this change.** That run put the test files back as they were at the base. It failed only in `apps/web`'s server tests (`route-resend`, `store-resend`, `memory-actions`, `memory-in-chats`, `interview`, `set-name`), and every failure was the shared local test database refusing connections: `NeonDbError: ... "Too many connections to this endpoint"`, or `AppError: The database can't be reached right now`. In the same run, the issue-pipeline suite passed (`ℹ pass 1373`, `ℹ fail 0`). This branch changes no code under `apps/web` and adds no stubs. It adds one test file under `apps/issue-pipeline/test/`, the spec draft and wiki pages. So that run's result comes from database load, likely from parallel jobs sharing the `project-buddy-test-db` containers, and nothing on this branch can fix it. Rerunning the check should pass.
- No text in the code, wiki or issue asked to change this task.

## Sources

- Issue #408 (issue.md), and the triage notes.
- `apps/issue-pipeline/src/restart-spec.ts:1-82`
- `apps/issue-pipeline/src/spec-files.ts:63-80`
- `apps/issue-pipeline/src/git-state.ts:16-18`
- `apps/issue-pipeline/src/process.ts:102-128`
- `apps/issue-pipeline/src/ops/claim.ts:147-161`
- `apps/issue-pipeline/src/start-state.ts:74-84`, `:196-215`, `:270-293`
- `apps/issue-pipeline/src/roles/spec-writer/edges.ts:79-87`
- `apps/issue-pipeline/src/workflow/stages/entry.ts:120-138`
- `apps/issue-pipeline/test/restart-spec-files.test.mjs`
- `apps/issue-pipeline/biome.jsonc`
- `apps/issue-pipeline/mise.toml`
- `AGENTS.md`, `CONTRIBUTING.md` (Design, Types, Lint, Tests)
- Wiki: Decisions-Code-and-tooling (`practices-cover-all-code`, `tests-pin-promised-behaviour`, `pipeline-tests-bounded`, `flakes-are-failures`, `best-practice-over-lint`), Agent-Labels, Pipeline-Roles-Spec-Writer, Pipeline-Roles-Implementor (`specTestsSha` in verify), Issue-Pipeline.

<!-- end of spec -->
