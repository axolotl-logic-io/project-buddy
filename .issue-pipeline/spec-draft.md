## Behaviour

All paths are under `apps/issue-pipeline/`.

1. At depth 0, the spec writer's task offers `split` only when implementing and testing the issue would take more than two implementer sessions. It gives that bound in tokens, twice `contextLimits.soft`, and says each part must fit in two implementer sessions. This holds for the role's task (`src/roles/spec-writer/task.ts`) and for the lanes' (`src/workflow/stages/spec-task.ts`). The split line no longer names `sessionTokenCap` or "one implementer session".
2. When triage suggested a split (`splitSuggested`), both spec writer tasks open with triage's reason and say "Split it unless your spec shows the change fits two sessions."
3. Triage's task (`src/roles/triage/task.ts`, used by both the triage role and the lane stage) uses the same bound: `ready` when two implementer sessions (at most twice `contextLimits.soft` tokens of context) can implement and test it, and `split` when it needs more than two implementer sessions.
4. The bound follows the config's `contextLimits.soft` (`budgets.softLimit`), not a fixed number: soft 175000 gives 350000, soft 100000 gives 200000.
5. At depth 1 nothing changes: both spec writer tasks still say "Don't set `decision` to split … splitting is not allowed", and triage still uses `SPLIT_FORBIDDEN`.

The exact lines (with `B` = `2 * budgets.softLimit`), which the updated kits pin:

- Spec writer role, depth 0 (replaces `src/roles/spec-writer/task.ts:207`'s first sentence; the rest of the line is unchanged):
  `` Only if implementing and testing it would take more than two implementer sessions (more than ${B} tokens of context, twice `contextLimits.soft`), set `decision` to split and give 2 to 5 `subIssues`, each a complete, independently testable change with its own acceptance criteria that two implementer sessions can implement and test. Put its slice of the spec, with its interfaces, in its `body`. Use `after` … prefer fewer parts. ``
- Lane spec task, depth 0 (`src/workflow/stages/spec-task.ts:38`): the same first sentence, up to "…that two implementer sessions can implement and test.", then its own unchanged rest ("Put its slice of the spec in its `body`. Use `after` … Prefer fewer parts to many that share files.").
- Both `triageFinding`s with `splitSuggested`: `` Triage judged this issue too big for two implementer sessions: ${splitSuggested} Split it unless your spec shows the change fits two sessions. ${notes} ``
- Triage's ready line: `` - ready: two implementer sessions (at most ${B} tokens of context) can implement and test it. Write `plan`: at most 15 lines naming the files and approach you found. A spec writer turns it into the full spec next. ``
- Triage's `SPLIT_ALLOWED`: `` - split: needs more than two implementer sessions. Say why in `reason` and write `plan` as for ready; the spec writer decides how to cut it. ``

## Out of scope

- How the `split` op files sub-issues (`src/ops/split.ts`), the stage's split checks (2 to 5 parts, depth 1 stops).
- Session budgets (`sessionTokenCap`, `roleBudgets`, `sessionBudget`) and `contextLimits` themselves, and the config schema.
- Every other line of the three tasks, `SPLIT_FORBIDDEN`, and the spec writer's depth-1 line.

## Design

- **Where the bound comes from.** `Budgets.softLimit` already carries `contextLimits.soft` (`src/workflow/budget.ts:11-13`), set by `sweepSettings` (`src/workflow/sweep-config.ts:238`) for lanes and roles and by `src/config.ts:133` for jobs. Every task builder already gets `budgets` (`src/roles/spec-writer/task.ts:211`, `src/workflow/stages/spec-task.ts:52`, `src/roles/triage/task.ts:60`), so no config or signature change reaches callers.
- **One module owns "two sessions, twice soft".** Add one function to `src/workflow/budget.ts`, for example `splitBound(budgets: Pick<Budgets, "softLimit">): number`, returning `2 * budgets.softLimit`, with an interface comment saying it is the most context an issue (or a split part) may need: two implementer sessions, each wrapping up at `contextLimits.soft` (`roles-6-10-scope`). The three tasks call it instead of each multiplying (CONTRIBUTING "Information hiding": each design decision lives in exactly one module; red flag "repetition"). It is an internal helper, not a test interface: tests check the bound through the tasks.
- **Spec writer role** (`src/roles/spec-writer/task.ts`): `splitLine(depth, sessionCap)` (l.203-208) takes the bound instead of `sessionCap`, and `decisionLines` (l.217) passes `splitBound(budgets)`. `triageFinding` (l.97-105) gets the new sentence; its comment ("too big for one session") changes to two sessions.
- **Lanes** (`src/workflow/stages/spec-task.ts`): the same edits to `splitOption` (l.33-39, called at l.68 with `budgets.sessionCap`) and `triageFinding` (l.22-31).
- **Triage** (`src/roles/triage/task.ts`): the ready line (l.64) is built in `triageSession` with `splitBound(budgets)`; `SPLIT_ALLOWED` (l.43-44) stays a constant, as its text has no number, so `splitLine(depth)` (l.48-53) is unchanged.
- **Practices that bear on it:** CONTRIBUTING Design (information hiding, no repetition, comments say what a module promises), Types (explicit parameter and return types, `import type`), Lint (Biome `all`, 50-line functions, 300-line files: `spec-writer/task.ts` is at 262 lines, so keep the change in place; regexes in tests are top-level, named, with `u`), and `tests-pin-promised-behaviour` / `pipeline-tests-bounded` (deterministic, no model, no processes). The wiki decision followed is `roles-6-10-scope` (Pipeline-Roles), which settles the rule; this change departs from no decision.
- Run `mise //apps/issue-pipeline:check` (typecheck, lint, build, `node --test`).

## Test interfaces

- The spec writer role's `transition` (`src/roles/spec-writer/machine.ts`), with data from `locate` (`src/roles/spec-writer/locate.ts`) over a `RoleContext` built from a config (`roleContext` in `test/role-context-fixtures.mjs`): the session effect's `task`.
- The lane spec stage's `next` (`src/workflow/stages/spec.ts`): the spec writer launch's `task`.
- The triage role's `locate` (`src/roles/triage/locate.ts`) over a `RoleContext`: `data.start.session.task`.
- The lane triage stage's `next` (`src/workflow/stages/triage.ts`): the triage launch's `task`.

## Tests

All deterministic, no model, no processes (`pipeline-tests-bounded`).

- **New `test/split-two-sessions.test.mjs`** (committed):
  - "the spec writer role offers split past two sessions, twice contextLimits.soft": role `transition` with configs of soft 175000 and 100000; the split line names 350000 / 200000 tokens, "more than two implementer sessions", each part fitting two sessions, and neither "one implementer session" nor the fixtures' `sessionTokenCap` 150000. Pins Behaviour 1 and 4. Fails today: the line says "one implementer session (at most 150000 tokens…)".
  - "the lane spec writer offers split past two sessions, twice contextLimits.soft": the same through the lane `next`, with `budgets.softLimit` 175000 and 100000. Pins 1 and 4. Fails today for the same reason.
  - "a suggested split asks to split unless the spec shows the change fits two sessions": both tasks with `splitSuggested`; the line with triage's reason says "Split it unless your spec shows the change fits two sessions." and not "fits one session". Pins 2. Fails today: it says "fits one session".
  - "triage is ready within two sessions and splits past them, at the same bound": the triage role's `locate` (from a config) and the lane triage `next`, at soft 175000 and 100000; the `- ready:` line names 350000 / 200000 tokens and two implementer sessions, not one; the `- split:` line says "more than two implementer sessions". Pins 3 and 4. Fails today: "one implementer session (at most 150000 …)" and "too big for one session".
  - "a sub-issue's spec writer still may not split, on the role and in lanes": depth 1 still says splitting is not allowed and names no bound. Pins 5. It passes today by design, since Behaviour 5 is that nothing changes; it guards the change.
- **Updated kits** (committed), whose exact expected tasks now hold the new text, so these existing tests fail until the code matches:
  - `test/workflow-triage-test-kit.mjs`: the ready line (softLimit 175000 → 350000) and `SPLIT_ALLOWED`. Fails today in `workflow-stages-triage-next.test.mjs` ("the first call counts the run…", "a sub-issue's session is told it may not split"). Pins 3.
  - `test/workflow-build-test-kit.mjs`: `SOFT_LIMIT`/`SPLIT_BOUND` constants and the lane split line. Fails today in `workflow-stages-spec-next.test.mjs` and `workflow-stages-spec-retry-next.test.mjs` (the tests that compare `specTask()`). Pins 1.
- Existing depth-1 tests (`roles-spec-writer-task.test.mjs` "split is offered only at depth 0…", `workflow-stages-spec-split-next.test.mjs` "a sub-issue's spec writer is told splitting is not allowed") stay as they are and must keep passing.

## Wiki updates

Committed on the wiki's `agent/issue-413`:
- `Pipeline-Roles-Spec-Writer.md`, "Split": split offered only past two implementer sessions, the bound as twice `contextLimits.soft`, each part fits two sessions, and "fits two sessions" for a suggested split.
- `Pipeline-Roles-Triage.md`, Requirements: a new item on sizing in two implementer sessions at twice `contextLimits.soft`.
- `Issue-Pipeline.md`: the `triage` section (l.79), the `budgets-bound-context` paragraph (l.103, which said the split option names `sessionTokenCap`), and the split paragraph of `spec-step` (l.197).
- `Pipeline-Roles.md`, `roles-6-10-scope`: notes the rule is built by #413.

## Assumptions and risks

- "The config's `contextLimits.soft`" means `budgets.softLimit` (triage's reading, confirmed at `src/workflow/sweep-config.ts:238` and `src/config.ts:133`).
- The kits pin whole task text, as they already did; the implementer must use the exact lines in Behaviour. The new test file checks facts (the number, "more than two implementer sessions", each part fitting two), not whole lines.
- With today's defaults (`sessionTokenCap` 300000, `contextLimits.soft` 175000), the figure the tasks name moves from 300000 tokens for one session to 350000 for two. Issues that fit in two sessions now go to the implementer whole and run as a continuation, up to `maxContinuations`. A config with `maxContinuations` 0 can't finish a two-session issue; that config is out of scope here.
- No text in the code or wiki read for this spec asked to change the task.

## Sources

- Issue #413 and triage's notes; `AGENTS.md`, `CONTRIBUTING.md`; wiki `Decisions-Code-and-tooling` (`practices-cover-all-code`, `tests-pin-promised-behaviour`, `pipeline-tests-bounded`), `Pipeline-Roles` (`roles-6-10-scope`), `Pipeline-Roles-Spec-Writer` ("Split", test interfaces), `Pipeline-Roles-Triage`, `Issue-Pipeline` (l.79, l.103, l.197).
- `src/workflow/budget.ts:8-16`, `src/workflow/sweep-config.ts:233-245`, `src/config.ts:133`, `src/roles/spec-writer/task.ts:97-105,202-219`, `src/workflow/stages/spec-task.ts:22-39,53-72`, `src/roles/triage/task.ts:43-66`, `src/roles/spec-writer/locate.ts:204-226`, `src/roles/triage/locate.ts:114-125`.
- `test/workflow-triage-test-kit.mjs`, `test/workflow-build-test-kit.mjs`, `test/spec-writer-role-test-kit.mjs`, `test/role-context-fixtures.mjs`, `test/roles-spec-writer-task.test.mjs`, `test/workflow-stages-spec-split-next.test.mjs`, `test/workflow-stages-triage-next.test.mjs`.

<!-- end of spec -->
