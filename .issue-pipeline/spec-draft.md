# Spec: #417, the orchestrator runs only the chosen roles

Paths are under `apps/issue-pipeline/` unless they start with `docs/` (the wiki).

## Behaviour

1. **Stage to role.** `roleOfStage(stage)` gives each stage's role, by the names in `ROLE_NAMES` (`src/roles/registry.ts:39`): `triage` → `triage`; `spec` → `spec-writer`; `implement`, `open-pr`, `fix`, `sync`, `checks` → `implementor`; `review`, `accept`, `security` → `reviewer`; `merge`, `publish` → `finalizer`. Every stage in `STAGE_ORDER` has a role, and every role in `ROLE_NAMES` starts at least one stage.
2. **Choice.** `rolesOf(args, cfg)` returns the roles to run: the `--roles` flag's, else the config's `orchestratorRoles`, else all five. The flag overrides the config. `orchestratorRoles: null` or absent means all five. The result is in `ROLE_NAMES` order, each role once.
3. **Refused names.** An unknown role name from `--roles` throws, naming it. An unknown or empty name in `orchestratorRoles`, or an `orchestratorRoles` of `[]`, throws naming `orchestratorRoles`. `--roles` is split on commas; an empty entry (`""`, `"a,,b"`, `"a,"`) throws naming `--roles` and saying it is empty. `orchestrate.mjs` exits 1 on any of these, naming the bad value on stderr, before any tick or gh call.
4. **Arguments.** `orchestratorArgsOf` reads `--roles <a,b>` as `roles: ["a","b"]` and `--print-roles` as `printRoles: true`. Existing flags (`--config`, `--once`) and their errors are unchanged.
5. **Scheduler holds.** In `schedule`, an issue whose next stage belongs to a role that isn't running is held `role-off:<role>`. Its state and labels don't change (no gh write). The role check comes before the global cap, stage caps, file overlaps, merge order and the `tokensPerHour` rate limit, so the hold names the role. A held issue doesn't count toward any cap for later issues in the tick.
6. **Own holds first.** A hold `planOf` finds from the issue itself (`after:#M`, `stacked-on:#M`, `lane:<lane>` and the other stack and verdict holds) keeps its reason with the role off.
7. **No roles set, or all of them.** With `roles` unset in `ScheduleSettings`/`TickDeps` and no `orchestratorRoles`, or with all five roles, every decision is as before #417.
8. **Start gate.** `startGate` holds a restart whose stage belongs to a role that is off `role-off:<role>`, and doesn't count it toward any cap. The watchdog's restart of a dead job goes through it, so with the role off the job isn't resumed, its resume count doesn't rise (a later restart with the role on is still the first), and the scheduler starts nothing else for that issue in that tick. The escalation agent's `resume` uses the same gate.
9. **Caps count every live job.** A live job of a role that is off still counts toward `maxJobs`, stage caps, file overlaps and merge order.
10. **Safety actions.** With a job's role off, the watchdog still steers its silent or failing session, still sends SIGTERM for silence or budget, still applies the budget and `maxResumes` stops (`agent:stopped-job`), and escalations and closing split parents run as before.
11. **Tick.** `tick(cfg, deps)` uses `deps.roles` when given, else `rolesOf({}, cfg)`.
12. **Roles log line.** `orchestrate.mjs` (with or without `--once`) writes one line `{"at","action":"roles","roles":[…]}` to `runs/<slug>/orchestrator.log` before the first tick. It has no `issue` or `stage`. With no flag and no config key it lists all five roles in `ROLE_NAMES` order.
13. **`--print-roles`.** Prints one line per stage in `STAGE_ORDER`: `<stage>`, a tab, `<role>`. Then it prints the line `roles: <role>,<role>…` with the roles chosen (flag over config), and exits 0. It runs no tick, makes no gh call and writes no log line. A bad role name still exits 1 (item 3).

## Out of scope

- One implementor job for `fix` then `checks` (#424); any change to merge order (from the issue).
- The proposed stage changes in the Orchestrator page's table (`open-pr` removed, `sync-at-edges`, `finalize`/`land`, `final-security`).
- The provider rate-limit backoff (`rate-limit-backoff.ts`). While it is active, its `gate` returns `rate-limited` for every restart, as it does today, before the start gate runs (`rate-limit-backoff.ts:157`). Its `hold` rewrites only `started` decisions (`rate-limit-backoff.ts:158-165`), so the scheduler's `role-off` holds pass through it unchanged.
- The ops, the sweep, `job.mjs` and the roles registry stay as they are. The only change to `job.mjs` is the move of its stage-to-role table (Design).

## Design

**New module `src/orchestrator/roles.ts`** (stub committed). It holds the one stage-to-role decision (information hiding, CONTRIBUTING "Design"):
- `roleOfStage(stage: StageName): RoleName`: a `Readonly<Record<StageName, RoleName>>` table, so tsc checks it is complete over `StageName` (`src/workflow/stages/types.ts`, `STAGE_ORDER` at `src/workflow/sweep-config.ts:94`).
- `rolesOf(args: { roles?: readonly string[] | undefined }, cfg: Config): RoleName[]`: parses `cfg.orchestratorRoles` with zod at the config boundary (CONTRIBUTING "Types": zod at the boundary), as `tick.ts:36` does with `ORCHESTRATOR_SETTINGS`. The schema is `z.array(z.string()).min(1).nullable().optional()`. Every name is checked against `ROLE_NAMES` (`registry.ts:39`). The error names the bad value, and for the config the key `orchestratorRoles`. The result is `ROLE_NAMES.filter(chosen.has)`, which keeps `ROLE_NAMES` order and drops duplicates. An unknown name is an error, not "not found", because a typo would silently stop a role (CONTRIBUTING "Define errors out of existence" doesn't fit a startup refusal; this matches `loadConfig`'s refusals).
- A small exported helper, e.g. `roleOffReason(roles: readonly RoleName[] | undefined, stage: string): string | null`. It returns `role-off:<role>` when `roles` is set and the stage's role isn't in it. Otherwise (roles unset, or `stage` not in `STAGE_ORDER`) it returns null. It lives here and not in `schedule.ts`, which is 293 lines with a 300-line limit (CONTRIBUTING "Lint: Limits"). Don't name it `roleOf`: `schedule.ts` already has a local `roleOf` for its reader/writer/merge gate classes.
- Design it twice (CONTRIBUTING): (a) `rolesOf` returns a plain `RoleName[]` that settings carry and the reason helper reads; (b) a `RoleSet` object with `runs(stage)` and `describe()`. Choose (a): a list is JSON-safe for the log line and `--print-roles`, fits `ScheduleSettings` as data next to `maxJobs` and `stageCaps`, and tests can pass it directly. (b) would add a class that only wraps one `includes` call (shallow-module red flag).
- Replace the duplicate table `STAGE_ROLES` in `src/job/driven-run.ts:45-58` (used at `:94-96`) with `roleOfStage`, so the table lives in one module ("Strategic, not tactical"; repetition red flag). `driven-run.ts` is imported only by `src/job.ts:61-62`, and `roles.ts` imports only types plus `registry.ts`, so this adds no cycle.

**Arguments, `src/orchestrator/args.ts:15-31`.** Add `roles: { type: "string" }` and `"print-roles": { type: "boolean" }` to `parseArgs` options. Map `print-roles` to `printRoles`, and split `roles` on `,` before `ORCHESTRATOR_ARGS.safeParse`. An empty entry throws `--roles has an empty role name` (the message must match `/--roles/` and `/empty/`). Name validation stays in `rolesOf`, so the one list of names lives in the registry. The stub fields `roles` and `printRoles` on `ORCHESTRATOR_ARGS` (args.ts:11-13) stay; remove the stub comment.

**Scheduler, `src/orchestrator/schedule.ts`.** `ScheduleSettings.roles?: readonly RoleName[]` (stub at `queue.ts:90-91`). In `holdReason` (`schedule.ts:127`), return `roleOffReason(count.settings.roles, stage)` first when non-null. That comes before the gate-class switch and the `tokensPerHour` check (`:148-151`). One check then covers both `decide` (`:209`, after `plan.held`, so item 6 holds) and `startGate` (`:284`). A held result never calls `countStart` (`:214`, `:286`), so a role-off hold counts toward nothing. `countOf` (`:230`) counts live jobs from the snapshot whatever their role, and stays unchanged (item 9). If adding lines pushes `schedule.ts` past 300, move code into `roles.ts` or `queue.ts`, not a new wrapper.

**Tick, `src/orchestrator/tick.ts`.** `TickDeps.roles?` (stub at `:66-68`). In `tick` (`:219`), compute `roles = deps.roles ?? rolesOf({}, cfg)` and pass it into the `ScheduleSettings` used by both `schedule` and `startGate` (`:231`). Under `exactOptionalPropertyTypes`, set the key only with a value. The watchdog is unchanged. `revive` checks the `maxResumes` stop first (`watchdog.ts:100-108`), then `admit` (`:110`), and increments `resumes[key]` only after admission (`:114`). So a role-off restart is held and uncounted, and the max-resumes stop, steering, SIGTERM and budget code still run for every job (item 10). `withoutHeld` (`tick.ts:201-212`) already drops the scheduler's decision for an issue whose restart was held (item 8). `adviceOf` (`:159`) passes the same `admit`. `closeParents` is untouched.

**CLI, `src/orchestrate.ts:143-169`.** Inside the existing `try`, call `rolesOf(args, cfg)` after `loadConfig`, so a bad name exits 1 through the same `orchestrate: <message>` path. Then:
- if `args.printRoles === true`, write the table (`STAGE_ORDER.map(s => `${s}\t${roleOfStage(s)}`)`) and `roles: ${roles.join(",")}` to stdout and return 0 before building deps;
- otherwise log the roles line once, then set `deps.roles = roles` and run `tickOnce` or `loop` as now.

`LogEntry` requires `issue` and `stage` (`log.ts:46-55`), so add `logRoles(cfg, at, roles)` to `src/orchestrator/log.ts` beside `logDecisions`. It uses the same `appendLines` and `orchestrator.log` file, writing `JSON.stringify({ at, action: "roles", roles })`. Update the header comment (`orchestrate.ts:1-13`) for `[--roles <role,…>] [--print-roles]`, the roles line and the exit codes.

**Config and docs in the repo.**
- Add `"orchestratorRoles": null` to `repos/example.json` beside the other orchestrator keys (`maxJobs` at `:23`, `orchestratorIntervalSeconds` at `:32`).
- `CONFIG_SCHEMA` (`src/config-schema.ts`) is a `looseObject`, so the key passes `loadConfig` unchanged, and `rolesOf` validates it.
- Update the README row for `src/orchestrate.ts`, `src/orchestrator/` (`README.md:16`): name `roles.ts`, the `--roles`/`--print-roles` usage and the `role-off:<role>` hold.

**Practices followed.**
- `aposd-and-strict-typing`: deep `rolesOf`, one table, no pass-throughs; no `any`, `!` or `as`; explicit types.
- `biome-infos-fail` and the 300/50 line limits.
- `practices-cover-all-code`.
- `tests-pin-promised-behaviour`: tests assert hold reasons, gh writes, exit codes, the log line and print format the wiki promises, not call order.
- `pipeline-tests-bounded`: the CLI test's `spawnSync` calls carry a `timeout`, below the suite's `--test-timeout`.
- Wiki decisions followed: the Orchestrator page's "Run only the chosen roles" (built, #417) and `finalizer-role`.
- No wiki decision is departed from.

## Test interfaces

- `roleOfStage(stage)`, `rolesOf(args, cfg)`: new, `src/orchestrator/roles.ts`.
- `orchestratorArgsOf(argv)`: changed, `src/orchestrator/args.ts:17`.
- `schedule(snapshot, settings)`, `startGate(snapshot, settings)`: changed, `src/orchestrator/schedule.ts` (`ScheduleSettings.roles`, `queue.ts:84`).
- `tick(cfg, deps)`: changed, `src/orchestrator/tick.ts:219` (`TickDeps.roles`, config `orchestratorRoles`).
- `orchestrate.mjs` CLI: changed, `src/orchestrate.ts` (`--roles`, `--print-roles`, the roles log line).
- Config key `orchestratorRoles`: new, read by `rolesOf` and `tick`.

## Tests

All committed on `agent/issue-417`. Each file was run once. `npm run typecheck`, the test tsconfig and `npm run lint` pass.

`test/orchestrator-roles.test.mjs` (drives `roleOfStage`, `rolesOf`, `orchestratorArgsOf`; all 9 fail today: the stubs throw "not implemented", and `parseArgs` rejects `--roles`/`--print-roles` as unknown):
- "every stage in STAGE_ORDER has the role the wiki's table gives it": item 1.
- "every role owns at least one stage, and no stage names another role": item 1.
- "with no flag and no orchestratorRoles, all five roles run" (also `null`): items 2 and 7.
- "orchestratorRoles picks the roles, in ROLE_NAMES order": item 2.
- "--roles overrides orchestratorRoles": item 2.
- "an unknown role name from --roles is refused, naming it": item 3.
- "an unknown or empty role name, or no role, in orchestratorRoles is refused, naming the key": item 3.
- "--roles is split on commas, and --print-roles is read": item 4.
- "an empty role name in --roles is refused, naming the flag": items 3 and 4.

`test/orchestrator-roles-schedule.test.mjs` (drives `schedule`, `startGate`; 3 fail today because `settings.roles` is ignored, and 2 are guards that pass today and must keep passing):
- "with only triage running, every other role's issue is held role-off:<role> and the triage issue starts": item 5. Fails: the issues start.
- "with every role running, or no roles set, the scheduler decides as before": item 7. Guard.
- "an issue held for its after mark or another lane keeps that reason with its role off": item 6. Guard.
- "live jobs of a role that is off still count toward maxJobs": items 5 and 9. Fails: a `global-cap` hold is reported, not role-off first.
- "the start gate holds a restart of a role that is off role-off:<role>, and doesn't count it": item 8. Fails: the restart is admitted.

`test/orchestrator-roles-tick.test.mjs` (drives `tick` with fakes, through `test/orchestrator-watchdog-test-kit.mjs`, whose `tickOver` now takes `roles` and returns `decisions`; 3 fail, 3 guards pass):
- "with --roles triage, an issue at review is held role-off:reviewer with its state and labels unchanged, while a triage issue starts": items 5 and 11. Fails: review starts.
- "with no roles given, the tick runs the config's orchestratorRoles, and given roles override them": item 11. Fails: no config read.
- "a dead fix job with the implementor off isn't restarted or counted toward maxResumes": item 8. Fails: it is resumed.
- "a live job of a role that is off still counts toward maxJobs": item 9. Guard.
- "a silent session of a role that is off is still steered": item 10. Guard.
- "a dead job past maxResumes still stops its issue with agent:stopped-job when its role is off": item 10. Guard.

`test/orchestrator-roles-cli.test.mjs` (drives the `orchestrate.ts` CLI with the world kit's fake gh, `spawnSync` bounded; all 4 fail today: `--roles`/`--print-roles` are unknown flags, and no roles line is logged):
- "--print-roles prints each stage's role and the roles chosen, and exits 0 without a tick": item 13.
- "an unknown role name exits 1 naming it, from --roles or orchestratorRoles, before any tick": item 3.
- "an empty role name in --roles exits 1 naming the flag": item 3.
- "a run logs the roles chosen once, the flag's over the config's, then holds an issue of a role that is off": items 2, 5 and 12.

`test/build.test.mjs`:
- "the built orchestrator's --once logs the roles it chose, exits 0 after a tick and 1 after a failed one": item 12, with the built `orchestrate.mjs` and no config key logging exactly `{action:"roles", roles: ROLE_NAMES}`. Fails: today the log is empty.

## Wiki updates

- `docs/Pipeline-Roles-Orchestrator.md`:
  - marks "Run only the chosen roles" as built (#417), with the built role names (`spec-writer`, `implementor`, `reviewer`, `finalizer`) and `roleOfStage` in `src/orchestrator/roles.ts`;
  - spells out the `ROLE_NAMES` ordering, the refused empty list, check order before the caps and the rate limit, own holds first, the roles log line and the `--print-roles` format;
  - drops "(proposed)" on the role-off Test plan rows.
- `docs/Running-the-Issue-Pipeline.md`:
  - the command line with `[--roles <role,…>] [--print-roles]`;
  - a **Roles** paragraph and the `orchestratorRoles` config key;
  - the `role-off:<role>` hold reason;
  - the roles line in **The log**.

## Assumptions and risks

- #413 (`after`) is not verified merged. The work doesn't depend on its code: `splitBound` is unrelated to role selection.
- The roles log line is written by `main`, not by `tick`, so tests that call `tick` directly see no roles line. The wiki says "once at start".
- Under the provider rate-limit backoff, a held restart reads `rate-limited`, not `role-off` (Out of scope). Either way the restart is held and uncounted, so nothing promised changes. Scheduler holds keep `role-off`.
- The stage → role table follows today's stages. When #424 or the proposed `finalize`/`land` stages land, the table changes with them; the `Record<StageName, RoleName>` type makes tsc demand it.
- Size: roughly one to two implementer sessions. The code change is small (about 150 lines across roles.ts, args.ts, schedule.ts, tick.ts, orchestrate.ts and log.ts). The tests are already written.
- No text in the code, wiki or logs read asked to change the task.

## Sources

- Issue #417 (`issue.md`); handoff from spec session 1.
- `AGENTS.md`, `CONTRIBUTING.md` (Design, Types, Lint, Tests), `docs/Decisions-Code-and-tooling.md` (`practices-cover-all-code`, `aposd-and-strict-typing`, `biome-infos-fail`, `tests-pin-promised-behaviour`, `pipeline-tests-bounded`).
- Wiki: `docs/Pipeline-Roles-Orchestrator.md` ("Run only the chosen roles", "Scheduling rules", Test plan), `docs/Running-the-Issue-Pipeline.md` (Orchestrator, The log).
- Code:
  - `src/orchestrator/schedule.ts:127-155,175-214,230,277-290`;
  - `src/orchestrator/watchdog.ts:95-115`;
  - `src/orchestrator/tick.ts:36,66-68,159,201-231`;
  - `src/orchestrator/args.ts`, `src/orchestrator/queue.ts:84-91`, `src/orchestrator/log.ts:33-55`;
  - `src/orchestrator/rate-limit-backoff.ts:150-165`;
  - `src/orchestrate.ts:1-13,143-169`;
  - `src/roles/registry.ts:32-39`, `src/workflow/sweep-config.ts:94`, `src/job/driven-run.ts:45-96`;
  - `repos/example.json`, `README.md:16`.
- No web sources were needed.

<!-- end of spec -->
