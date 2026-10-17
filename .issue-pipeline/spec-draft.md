## Behaviour

All paths are under `apps/issue-pipeline/`.

- **Replies carry no `files`.** The spec writer's `SPEC_WRITER_SCHEMA` (`src/roles/spec-writer/reply.ts`) and the workflow's `SPEC_SCHEMA` and split part (`src/workflow/schemas.ts`) neither list nor require `files`. A split part's properties are exactly `title`, `body` and `after`. A reply without `files` reads as a valid `ready`, `split`, `needs-info`, `no-work` or handoff reply. The only path list a spec carries is the `where` of its `new` interfaces.
- **`wikiOnly` signal.** `SPEC_WRITER_SCHEMA` has a boolean `wikiOnly`. The reading (`specReadingOf`) gives `wikiOnly: true` only when the reply says so. A missing `wikiOnly` reads as `false`, and a non-boolean `wikiOnly` makes the reply malformed. The workflow's `SPEC_SCHEMA` gets no `wikiOnly`, because the sweep has no wiki-only path.
- **Prompts ask for no file list.** The role task (`src/roles/spec-writer/task.ts`), at depth 0 and 1, and the sweep's spec task (`src/workflow/stages/spec-task.ts`) don't mention `files`. Their Design line reads "- **Design**: the approach, with `file:line` anchors to the code it builds on, and the coding practices and wiki decisions it follows. …", not "the files to change". The split instruction asks for each part's `body` and `after` only. The role task explains `wikiOnly`. `agents/issue-pipeline-specifier.md` asks for "the behaviour, the entry points it builds on, and the tests", not "the files".
- **The commit check has no `not-in-files` rule.** `specTestsCheck`'s change has no `files`. A set of commits that changes only test files (`testPathGlobs`), the `new` interfaces' stubs, the spec draft and wiki pages passes with nothing listed. A wiki page edit passes without being named anywhere. Any other changed file still fails `not-allowed`.
- **Wiki-only versus a `noTestsReason` code change.** In `specTestsCheck`, a reply with `wikiOnly: true`, `noTestsReason` set and a clean wiki change passes, and its result is wiki-only (`{ pass: true, wikiOnly: true }`); a reply with `wikiOnly: true` that changed no wiki page and no test fails `nothing-to-build`, and its reason still says "nothing to build"; and a `noTestsReason` reply with `wikiOnly: false` passes as a code change (`wikiOnly: false`), with or without a wiki edit, and even if it committed nothing.
- **Routing on the runner.** A wiki-only spec opens no PR (closing one an earlier spec opened) and is saved at `review`, as today. A `noTestsReason` spec that isn't wiki-only goes to `implement` with a PR, with or without a wiki edit. A wiki-only reply with no wiki change gets the retry task, which names "nothing to build". After its second failure it stops as today ("the spec writer failed twice").
- **Saved state and the hand-off.** The spec writer saves no `files` at `implement` or `review`; the hand-off saves `wikiOnly` in its place. `locate` routes on the saved `wikiOnly`: `true` → the wiki-only path (`close-old-pr`), and `false` or absent → `open-pr`. A state saved before this change, with `files` and no `wikiOnly`, keeps today's reading: `noTestsReason` set and every `files` entry under the wiki folder means wiki-only, and anything else doesn't. The sweep's spec stage (`next`) saves no `files` in the state at `implement`.
- **Restarts.** A restart's carry-over (`startState`) carries no `files`. It carries `interfaces` along with the plan, the spec and `specWritesTests`, so a restarted spec keeps its stubs. A saved state that still has `files` loads, restarts and resumes without error, and its `files` is ignored.
- **Split sub-issues.** Each sub-issue's body is the part's `body` exactly as the spec writer wrote it, with no `Files:` line. `src/workflow/files-line.ts` is deleted.
- **Restart check of documented files.** `specFilesMissing` (`src/restart-spec.ts`) takes the documented files from the spec's Tests section and from the `new` interfaces' `where` paths (repo-relative or app-relative), not from `files`. An old state's `files` adds nothing. A missing stub still stops the restart with stop code `spec-files` (`agent:stopped-spec-files`) when the spec writer wrote the tests (`specWritesTests`). Wiki pages a spec names are never reported missing.

## Out of scope

- The orchestrator's overlap gate (#390, part 1, already on `integration`).
- The commit check's other rules (`not-allowed`, the stub, test, lint, type-check, fails-before and wiki-link rules), the interface coverage check, the meaning of `noTestsReason`, and the PR flow (`src/workflow/flows.ts`).
- A wiki-only path for the workflow sweep's spec stage.
- The orchestrator's wiki text about `st.files` (Running-the-Issue-Pipeline, Pipeline-Roles-Orchestrator), which #390's wiki branch owns (see risks).

## Design

**Reply and schemas (Behaviour "replies", "wikiOnly signal").**
- `src/roles/spec-writer/reply.ts:48,134,152`: drop `files` from `SpecWriterReply`, from the zod `REPLY` and `PART`, and from `SPEC_WRITER_SCHEMA` (`:110`) and its part. Add `wikiOnly`:
  - in the JSON schema, a required `{ type: "boolean" }`, because the existing test "every object in the schema is closed and requires every field" pins all-required;
  - in zod, `z.boolean().optional()`, read as `wikiOnly: boolean`, with a missing value read as `false`. This defines the error out of existence: an older reply is simply not wiki-only.
- `src/workflow/schemas.ts:35-45,60-70`: drop `files` from `SPEC_SCHEMA` and from the split part's properties and `required`. Update the comment at `:35`.
- `src/workflow/stages/build-replies.ts:17,25,60-97`: the split part and spec reply types and their readers lose `files`.
- `src/workflow/types.ts:68`: drop `files` from the sweep state's type.
- `src/workflow/stages/spec.ts:68,124,142-158`: `ReadySpec` and its carry lose `files`, so the saved state has none.
- `src/roles/spec-writer/edges.ts:74-75`: carry `wikiOnly` into the role's data in place of `files`.

**Commit check (Behaviour "no not-in-files", "wiki-only vs noTestsReason").** The wiki-only decision lives in one place, the check. The hand-off only reads its saved result (information hiding).
- `src/roles/spec-writer/check-rules.ts`:
  - drop `"not-in-files"` (`:12`), the `files` fact (`:33`), `listsWikiPage` and `MD_EXTENSION` (`:41-50`), and the half of `scopeFailure` that checks for unlisted files (`:66-73`);
  - add a `wikiOnly: boolean` fact;
  - `workFailure` (`:99`) passes when tests changed, a wiki page changed, or the reply isn't wiki-only, and otherwise returns `{ rule: "nothing-to-build", reason: "nothing to build: …" }`;
  - update the header comments (`:1-5`, `:28-31`).
- `src/roles/spec-writer/check.ts:32-43,63,84,193,208-211`: `SpecTestsChange` loses `files` and gains `wikiOnly: boolean`. The pass result is `wikiOnly = change.wikiOnly && change.noTestsReason !== null`, replacing `files.every(startsWith(wikiPrefix))`. Update the comments at `:2-6`.
- `src/roles/spec-writer/checks-git.ts:60,181`: pass the reply's `wikiOnly`, not `files`.
- `src/roles/spec-writer/checks.ts:47,78,141,159`:
  - the `READY` payload has `wikiOnly` (`z.boolean().optional()`) in place of `files`;
  - the "no spec, files or interfaces" message drops "files";
  - publish routes with `wikiOnly(handoff, paths)`.

**Hand-off (Behaviour "routing", "saved state").**
- `src/roles/spec-writer/machine.ts:172,235,287`: save `wikiOnly` in place of `files`, including in the handoff key list at `:287`.
- `src/roles/spec-writer/locate.ts:53-59,138-161,170-177`: `SpecHandoff` gets `wikiOnly: boolean | undefined`, and keeps a read-only legacy `files` only for the fallback. `wikiOnly(handoff, paths)` works in this order:
  - a saved boolean decides, together with `noTestsReason` being a string;
  - when the boolean is absent and an old `files` string array is present, today's rule applies;
  - otherwise the result is `false`.

**State and restarts (Behaviour "restarts", "restart check").**
- `src/state.ts:28`: either drop `files` from `STATE`, since the loose object passes an old value through untouched, or keep it as `.nullish().catch(undefined)`. Either way an old state with `files` parses. Zod stays the state boundary.
- `src/start-state.ts:70-82`: `carriedWork` carries `interfaces` in place of `files`. A no-work or branch restart then keeps the stubs that the restart check and the orchestrator's stub-file gate (#390) read. `resumedStop` spreads the old state, so an old `files` passes through there and is ignored.
- `src/spec-files.ts:32-64`: `documentedFiles(spec, interfaces, wikiDir)` and `missingSpecFiles(spec, interfaces, tracked, wikiDir)` take the `where` path of each `new` interface (repo-relative or app-relative) in place of `files`, with `interfaces` as the second parameter. Update the comments at `:1-7,32-33,55`.
- `src/restart-spec.ts:29,46`: pass `interfacesOf(state.interfaces) ?? []` (exported from `reply.ts:246`). `specWritesTests` still decides the `spec-files` stop.

**Split (Behaviour "split").** `src/workflow/stages/spec-split.ts:3-27` sends `{ title, body, after }` unchanged. Delete `src/workflow/files-line.ts`. Its only user is `spec-split.ts:5`: `grep -rn files-line src test` finds no other, so no test is deleted.

**Prompts (Behaviour "prompts").**
- `src/roles/spec-writer/task.ts`:
  - `:175`: the Design line above;
  - `:190`: drop the `` `files` lists every repo path… `` sentence, and add one such as "`wikiOnly` is true only when the wiki pages you changed are the whole change, with `noTestsReason` set; otherwise false.";
  - `:206`: the split instruction drops ", and in its `files` the paths from `files` it touches", so it reads "Put its slice of the spec in its `body`. Use `after` …".
- `src/workflow/stages/spec-task.ts:34,57,61`: the same Design line, no `files` sentence, and the same split line. `test/workflow-build-test-kit.mjs` pins this text.
- `agents/issue-pipeline-specifier.md:16`: "name the behaviour, the entry points it builds on, and the tests".

**Practices followed.**
- `CONTRIBUTING.md` Design:
  - information hiding: the wiki-only rule lives in the check alone;
  - define errors out of existence: an old `files` is ignored, and a missing `wikiOnly` is false;
  - strategic, not tactical: delete what nothing needs any more (`files-line.ts`, `listsWikiPage`).
- Types: strict TypeScript, no casts, and zod at the state and reply boundaries (`aposd-and-strict-typing`).
- Lint:
  - Biome's `all` preset with no overrides (`biome-infos-fail`);
  - the 300-line file and 50-line function limits;
  - `check.ts` and `checks-git.ts` stay inside their existing scoped Node-API override (`best-practice-over-lint`).
- Tests: `tests-pin-promised-behaviour` (the reply shape, stop codes, routing and the saved state, not internals), `pipeline-tests-bounded` and `flakes-are-failures`.
- Wiki: `spec-step` and the split section of Issue-Pipeline, and `wiki-flows` (a wiki-only change has no PR). This spec departs from no wiki decision; the pages are updated to the new shape (see Wiki updates).

## Test interfaces

- `specReadingOf(output, depth)`, `src/roles/spec-writer/reply.ts:211`, with `SPEC_WRITER_SCHEMA` (`reply.ts:110`): existing, changed shape.
- `SPEC_SCHEMA`, `src/workflow/schemas.ts:60`: existing, changed.
- `specTestsCheck(change, settings)`, `src/roles/spec-writer/check.ts:193`: changed. Its change has `wikiOnly` and no `files`.
- The spec writer role on the runner, `specWriter(setup)`, `test/spec-writer-git-test-kit.mjs:272`: existing.
- The role's `locate` (`src/roles/spec-writer/locate.ts:196`), driven through the machine test kit's `located`: existing.
- The role task, driven through `transition` (`src/roles/spec-writer/machine.ts`) and the task kit's `retried`: existing.
- The sweep's spec stage `next(state, ctx, results)`, `src/workflow/stages/spec.ts:237`, with its task driven through `test/workflow-build-test-kit.mjs`: existing.
- `startState(state, start)`, `src/start-state.ts:214`: existing.
- The specifier agent definition, `agents/issue-pipeline-specifier.md`, read through `parseDefinition` (`src/job/agent-definition.ts`): existing, its prompt text changed.
- `specFilesMissing(wt, state, wikiDir)`, `src/restart-spec.ts:28`: existing, changed in what it reads. Tests drive it rather than `missingSpecFiles`, because a checked-JS test can't call the new parameter type before the change.

## Tests

All are under `apps/issue-pipeline/test/`. They type-check (`npx tsc -p tsconfig.test.json`) and lint clean today. They fail on behaviour, not on imports or types. Many existing cases fail today only because a reply without `files` reads as malformed. The new and changed cases are:

- `spec-tests-check.test.mjs` (`specTestsCheck`; Behaviour "no not-in-files"; Behaviour "wiki-only vs noTestsReason"). The `not-in-files` cases are removed. New cases:
  - "a failing test plus a wiki page that nothing lists passes". It fails today on `not-in-files`.
  - "a wiki-only reply that changed no wiki page has nothing to build". It fails because today's check reads `files`.
  - "noTestsReason with nothing committed, not wiki-only, passes" and "noTestsReason with a wiki edit, not wiki-only, passes as a code change" (`wikiOnly: false`).
  - "a clean wiki change from a wiki-only reply is wiki-only".
  - The change spreads a leftover `NO_FILES = { files: [] }` so it type-checks against today's `SpecTestsChange`. The implementer drops it along with the field.
- `roles-spec-writer-reply.test.mjs` (`specReadingOf`, `SPEC_WRITER_SCHEMA`; Behaviour "replies"; Behaviour "wikiOnly signal"): "the schema asks for no files, at the top or in a part, and for wikiOnly", "a reply without files reads as ready, wiki-only only when it says so", and a malformed `wikiOnly: "yes"`. The kits `spec-writer-role-test-kit.mjs` and `spec-writer-edge-fixtures.mjs` lose `files`.
- `roles-spec-writer-task.test.mjs` (the role task; Behaviour "prompts"): at depths 0 and 1, the task has no `` `files` `` and includes the new Design line and `` `wikiOnly` ``.
- `job-agent-definition.test.mjs` (the specifier's definition; Behaviour "prompts"): "the specifier's prompt asks for the entry points, not the files". It fails today because the prompt says "the behaviour, the files, and the tests".
- `workflow-build-test-kit.mjs`, which pins the sweep's spec task (Behaviour "prompts"): the new Design line, no `files` sentence, and the split line without `files`.
- `roles-spec-writer-machine.test.mjs` (`locate`; Behaviour "saved state"):
  - a saved `wikiOnly: true` → `close-old-pr`;
  - `false` → `open-pr`;
  - absent, with no files → `open-pr`;
  - an old state whose `files` are all wiki pages keeps the wiki-only reading, and one with `src/a.ts` → `open-pr`;
  - the hand-off key set has `wikiOnly` in place of `files`.
- `roles-spec-writer.test.mjs` and `roles-spec-writer-resume.test.mjs` (`specWriter`; Behaviour "replies"; Behaviour "saved state"): a ready run saves no `files` (`Object.hasOwn(saved, "files") === false`).
- `roles-spec-writer-wiki-only.test.mjs`, new (`specWriter`; Behaviour "routing"):
  - a wiki-only reply closes the earlier PR and saves at `review` with no `files`;
  - a `noTestsReason` reply with `wikiOnly: false` and a wiki edit → `implement` with a PR;
  - one with no `wikiOnly` and nothing committed → `implement` with a PR;
  - a wiki-only reply with no wiki change → stopped with "the spec writer failed twice", with "nothing to build" in the retry task.
- `workflow-schemas.test.mjs` (`SPEC_SCHEMA`; Behaviour "replies"): no `files`, and the part's properties and `required` are `after`, `body`, `title`.
- `workflow-stages-spec-next.test.mjs`, `workflow-stages-spec-retry-next.test.mjs`, `workflow-stages-spec-split-next.test.mjs`, `workflow-stages-build.test.mjs`, `workflow-stages-stage.test.mjs`, `workflow-stages-through.test.mjs` and `workflow-sweep-interrupt.test.mjs` (`next`; Behaviour "replies"; Behaviour "saved state"; Behaviour "split"): replies have no `files`, the saved state has no `files`, and sub-issue bodies go out unchanged, with no `Files:` line.
- `start-state-carried.test.mjs` and `start-state-resume.test.mjs` (`startState`; Behaviour "restarts"): from an old stopped state with `files`, a restart at `review` or `implement` carries `interfaces` and no `files`. This fails today because `files` is carried and `interfaces` isn't. The resumed state loads with its old `files`.
- `restart-spec-files.test.mjs` (`specFilesMissing`; Behaviour "restart check"):
  - the documented files are the Tests paths plus the `new` interfaces' `where` (repo-relative or app-relative);
  - an old state's `files` is ignored;
  - a missing stub with `specWritesTests` stops with code `spec-files`;
  - named wiki pages aren't reported.

No stubs are needed: every interface already exists, and only shapes change.

## Wiki updates

- **Pipeline-Roles-Spec-Writer**: the reply shape, the `check-commits` and `publish-spec` routing, the hand-off fields (`wikiOnly`, no `files`), the commit check's rules (no `not-in-files`; `nothing-to-build` reads `wikiOnly`), the restart files and the other `files` mentions.
- **Pipeline-Roles**: the spec writer → implementor hand-off (`interfaces`, no `files`), the wiki-only hand-off (`wikiOnly`), and the "after spec" no-work row.
- **Pipeline-Roles-Implementor**: `implement-work?` and the hand-off fields from the spec writer.
- **Issue-Pipeline**: the split section under `spec-step`. Parts carry no `files`, and sub-issues no `Files:` line.

## Assumptions and risks

- `wikiOnly` is required in the JSON schema but optional in zod. A model that omits it is read as not wiki-only. The worst case is a wiki-only spec going to `implement`, where the implementor's flows handle a wiki-only change as they do today.
- An in-flight issue saved before this change keeps today's reading through its old `files`, until its next spec run saves `wikiOnly`.
- The wiki-only rule now trusts the reply's claim plus the check (a wiki page changed, no tests, `noTestsReason` set) rather than a file list. A `wikiOnly` reply that also committed stubs still fails the existing scope and stub rules.
- Running-the-Issue-Pipeline ("Writers are gated on files") and Pipeline-Roles-Orchestrator (`st.files`, the `Files: …` line) still describe the old gate. Those pages belong to #390, whose wiki branch isn't published yet, so this issue leaves them alone to avoid a conflict. Once #390's wiki lands, any `files` mention left there should go.
- The full suite takes minutes. 91 tests fail today in `apps/issue-pipeline` (1251 pass), all in the files above.
- The earlier stop (`agent:stopped-error`, "reverted-fails") was not caused by this branch. With the tests reverted, `apps/issue-pipeline` passed 1309 of 1309. The failures were all in `apps/web`'s server tests, which hit the test database's `NeonDbError: Too many connections`. That is an infrastructure flake: this issue touches nothing in `apps/web`.
- Nothing in the code, wiki or logs I read tried to change these instructions.

## Sources

- Issue #391 and its triage notes; parent #388; #390.
- `CONTRIBUTING.md`, `AGENTS.md`, and the wiki's Decisions-Code-and-tooling (`practices-cover-all-code`, `aposd-and-strict-typing`, `biome-infos-fail`, `best-practice-over-lint`, `tests-pin-promised-behaviour`, `pipeline-tests-bounded`, `flakes-are-failures`).
- Wiki: Pipeline-Roles-Spec-Writer, Pipeline-Roles, Pipeline-Roles-Implementor, Issue-Pipeline (`spec-step`, `wiki-flows`), Running-the-Issue-Pipeline, Pipeline-Roles-Orchestrator.
- Code: the `apps/issue-pipeline/src` files anchored above, `apps/issue-pipeline/mise.toml` (the check commands), and `apps/issue-pipeline/agents/issue-pipeline-specifier.md`.

<!-- end of spec -->
