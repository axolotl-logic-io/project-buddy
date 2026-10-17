## Behaviour

All paths are under `apps/issue-pipeline/`.

1. **Bundle file.** `prepare-review` (`src/ops/sync.ts`) writes `bundle.md` in the same folder as `diff.patch` (`runs/<slug>/issue-N/review-<tag>/`). Its reply keeps every field it has today and adds `bundlePath` (that file's path) and `bundleLines` (`bundle.split("\n").length`, the same rule as `diffLines`).
2. **Diff first.** The bundle starts with `diff.patch`'s text, byte for byte: the reviewed commits' messages, the diff, and the issue's wiki commits when it has any.
3. **Changed files.** After the diff, the bundle gives the full text at the head of each file the reviewed range changed in the code checkout, in path order (byte order of the paths), each under its path.
4. **Size bound.** A file's text goes in only while the bundle stays within `REVIEW_BUNDLE_MAX_CHARS` (200 000 characters, `src/workflow/stages/review-prefix.ts`, which `src/ops/review-diff.ts` imports). The first file whose text would take the bundle past the bound is listed by path only, and so is every file after it in path order.
5. **Path-only files.** Deleted files and binary files are listed by path only, with none of their content.
6. **Wiki pages** appear only in the wiki commits (item 2). The op reads no wiki page from the code checkout, so a change that touches the wiki still prepares.
7. **Same inputs, same bytes.** A second `prepare-review` at the same head, base and wiki commits writes the same bundle, byte for byte. It holds no time, no tag and no path of its own.
8. **Shared prefix.** `lensTaskShared(ctx, state, lens, bundle)` (`src/workflow/stages/review-prefix.ts`) builds the `correctness`, `tests` and `scope` tasks over a bundle. All three start with one prefix that holds the reviewer rules and the issue (every line of a reviewer's `preamble` except its first, which names the role), the practices note for reviewers, the spec (or its path when clipped), and the bundle's path, its line count and its text.
9. **Lens part after it.** The lens's role name (`reviewer (<lens>)`), its concern (`LENSES[lens]`) and its output rules come only after the shared prefix, so the prefix holds no lens's name or concern.
10. **The bundle replaces the diff file.** The prefix says the bundle already holds the diff and the changed files, so a lens opens other files only for context the bundle lacks. A bundle task never sends the lens to `diff.patch`.
11. **Old format.** Given a diff (`ReviewDiff`, `{ path, lines }`), as built from a `prepare-review` reply without `bundlePath` (one an op ran before this change), `lensTaskShared` returns exactly what `lensTask` (`src/workflow/stages/review-text.ts:59`) returns for it.

## Out of scope

- The `review`, `rereview` and `accept` stage code, `lensTask`, `rereviewTask`, and the reply fields they read stay as they are. The `review` stage still launches `lensTask`'s diff-path tasks, and its existing tests (`workflow-stages-review*.test.mjs`, `workflow-stages-fix-next.test.mjs`, `workflow-stages-accept-*.test.mjs`) pass unchanged.
- Running the lenses over the bundle, their launch order, and how a launch marks the prefix for the prompt cache: #421 (the reviewer machine).
- The re-review, the check-fix review, acceptance and the security review (`roles-6-10-scope`).
- Reading the bundle file into a task. `lensTaskShared` is pure and takes the bundle's text as an argument. Its caller (#421) reads the file.

## Design

**Bundle (items 1-7).**
- `src/ops/review-diff.ts` already owns what `prepare-review` writes around the diff (`commitLog` at :12, `withWiki` at :24). Its new export, `reviewBundle`, takes the worktree, the reviewed range and the `full.text` that `prepareReview` writes to `diff.patch` (`src/ops/sync.ts:155-158`), and returns the bundle's text.
- **Where the bound lives.** The stub commit puts `REVIEW_BUNDLE_MAX_CHARS` in `src/workflow/stages/review-prefix.ts`, with its reason, because the spec stage may change only tests, stubs and the wiki. `test/sync-ops-prepare-review-bundle.test.mjs` imports it from there. Keep it there, and have `review-diff.ts` import it (`import { REVIEW_BUNDLE_MAX_CHARS } from "../workflow/stages/review-prefix.ts"`). That follows the repo's one direction of imports: node-side modules import pure workflow modules (`src/roles/triage/task.ts:6-12` imports `workflow/prompts.ts`, `budget.ts` and `clip.ts`), and no workflow module imports a node-side one. The reason is that the workflow's helpers are bundled for the sandbox with `platform: "neutral"` (`build.ts:95-116`). The reviewer machine (#421) will reach `review-prefix.ts` from the workflow, and the bundle can't hold `process.ts`'s child processes.
  - Rejected: defining the bound in `review-diff.ts` and re-exporting it from `review-prefix.ts`. Once #421 bundles `review-prefix.ts` into the workflow, that would pull `review-diff.ts`, `process.ts` and `wiki.ts` in with it.
  - Keep `review-prefix.ts` free of node imports for the same reason.
- Inside `reviewBundle`, keep the rules that need git apart from the rule that builds text from known inputs, so each stays within 50 lines:
  - list the range's files with their kind: `git diff --no-renames --name-status` gives the deleted files (`D`), and `git diff --no-renames --numstat` gives the binary ones (`-\t-\t`). Sort them by path with a plain `<` comparison, not `localeCompare`, so the order doesn't depend on the locale.
  - read each text file's head content with `git show <head>:<path>` through `run` (`src/process.ts:102`). Don't read the worktree, which may have uncommitted edits.
  - add each text while the bundle (the diff, the file texts so far and this one) stays within the bound. From the first file that doesn't fit, list every file by path only.
- **Range.** Use the reviewed range, `from..head` (`src/ops/sync.ts:146-147`), so the files match the diff above them. On a first review that is `base..head`, the range `changedFiles` lists. `changedFiles` keeps its own `base..head` names and the wiki paths (`sync.ts:164`) unchanged.
- **Wiki pages (item 6).** `full.files` holds the wiki paths (`withWiki`, `review-diff.ts:24`). They are not in the code checkout's git, so `reviewBundle` lists only the code range's files and never reads `full.files`.
- **Format.** After the diff text, a `# Changed files at the head, in path order` heading, then one `## <path>` entry per file, in path order. A text entry holds the file's text in a fenced block whose fence is one backtick longer than the longest backtick run in the text (at least three; CommonMark), so a file that holds a fence can't end the block early. A path-only entry gives a one-line reason: deleted, binary, or past the size bound. The tests pin the order and what is in or out, not this wording (`tests-pin-promised-behaviour`).
- **Writing the file (`prepareReview`, `src/ops/sync.ts:134-165`).** Write `bundle.md` with `fs.writeFileSync` beside `diffPath`, and add `bundlePath` and `bundleLines` to `ReviewReply` (`sync.ts:33-41`) and to its return. `prepareReview` is 32 lines now. The bundle adds about four, so it stays under the 50-line limit only because the git work lives in `review-diff.ts`.
- **Deterministic (item 7).** The bundle's inputs are git objects at fixed shas and the wiki diff, and the paths are sorted, so the output is fixed. It contains no `Date`, tag or path.

**Shared prefix (items 8-11), `src/workflow/stages/review-prefix.ts`.** This is a new module, since `review-text.ts` (281 lines) has no room under the 300-line limit. The stub holds the signature and `ReviewBundle`.
- **Prefix.** Build it from `preamble(cfg, state, "reviewer")` (`src/workflow/prompts.ts:71`). The role on its first line is the same for every lens, so the preamble can open the shared prefix, and its rules aren't written twice. Then `practicesNote(cfg, state, "reviewer")` (`prompts.ts:98`), the spec section with `SPEC_RULE_REVIEW` (`review-text.ts:38-56`; export `specSection` and the rule, or move them to this module and import them back, rather than copying them), the bundle line (its path, its line count, and that it already holds the diff and changed files, so open other files only for context it lacks and cite files by their repo paths), and then the bundle's text.
  - Triage's notes asked to avoid `preamble()` because it puts the role on line 1. A lens-independent role (`reviewer`) keeps the prefix shared and avoids repetition. The test pins this: the prefix must hold every preamble line but the first.
- **Lens part.** `Your lens: reviewer (<lens>)`, `Review only this concern: ${LENSES[lens]}` (`src/workflow/lenses.ts:29`), then the two output rules of `lensTask` (`review-text.ts:73-74`). Share those two rules with `lensTask` through one constant each, so neither copy drifts.
- **Fallback (item 11).** When `review` has no `bundlePath`, return `lensTask(ctx, state, lens, review)`. Narrow the union with `"bundlePath" in review`. `ReviewDiff` and `ReviewBundle` share no key, so the check is exact, and the code needs no cast.
- **Design it twice: a joined string or `{ prefix, own }`.** I chose a string because `ChildLaunch.task` and the role machine's `SessionEffect.task` (`src/roles/machine.ts:38-48`) are strings, and the fallback is today's string. A two-part value would put the cache layout into every caller before #421 decides it. If #421's launcher needs the boundary, it can export the prefix builder from this module.
- **Rejected: the bundle's text in the `prepare-review` reply.** It would put up to 200 000 characters into every op reply and run log, and the issue names only `bundlePath` and `bundleLines`.

**Practices that bear on it** (`CONTRIBUTING.md`, which `practices-cover-all-code` applies to this app):
- Information hiding: `review-diff.ts` alone knows the bundle's layout, one named constant holds its bound, and `review-prefix.ts` alone knows the prefix's order.
- Deep modules: one op field pair, and one builder.
- No repetition: reuse `preamble`, `practicesNote`, `specSection` and the output rules.
- Strict types: no `as`, no `!`, a union narrowed by `in`, `import type` for types, and explicit parameter and return types.
- Lint: 50 lines per function and 300 per file, named top-level constants (`noMagicNumbers`, which the tests already meet), and exports last.
- Tests: `tests-pin-promised-behaviour` (the reply's fields, the bundle's promised contents, and the prompt's facts, not its wording), `pipeline-tests-bounded` (the tests start nothing that outlives them), and test-first.
- No wiki decision is departed from.

## Test interfaces

- `prepare-review` ops request (changed), `src/ops/sync.ts:134`: `{ op: "prepare-review", number, sinceSha?, tag?, stackedOn? }` → `{ ok, op, posted, headSha, headTree, baseSha, patchId, diffPath, diffLines, changedFiles, bundlePath, bundleLines }`, and writes `bundle.md`.
- `lensTaskShared`, `REVIEW_BUNDLE_MAX_CHARS` (new), `src/workflow/stages/review-prefix.ts`: `lensTaskShared(ctx: StageContext, state: StageState, lens: ReviewLens, review: ReviewDiff | ReviewBundle): string`, with `ReviewBundle = { bundlePath: string; bundleLines: number; bundleText: string }`. `REVIEW_BUNDLE_MAX_CHARS: number` (200 000) is the bundle's size bound. The bundle tests read it to size `big-file`.

## Tests

The tests are committed on `agent/issue-415`. Each one fails today: the reply has no `bundlePath`, so there is no bundle to read, or the stub throws `lensTaskShared is not implemented yet (#415)`.

`test/sync-ops-prepare-review-bundle.test.mjs` runs the ops CLI against a local origin with the fake gh, as `sync-ops-prepare-review.test.mjs` does, so no model runs:
- "prepare-review writes bundle.md beside the diff: the commits and the diff as diff.patch has them, then each changed file's head text in path order". Drives `prepare-review`; pins items 1, 2 and 3. It checks that `bundlePath` is `diff.patch`'s sibling `bundle.md`, that the bundle starts with `diff.patch`'s text (which holds the commit message), that `a-file`'s head text comes before `b-file`'s (though `b-file` was committed first), and that `bundleLines` matches the file. Fails today: no `bundlePath`.
- "a second prepare-review at the same head writes the same bundle, byte for byte". Drives `prepare-review`; pins item 7. It removes the first bundle and runs the op again. Fails today: no bundle is named.
- "past the size bound, a changed file and every file after it in path order are listed by path only". Drives `prepare-review`; pins item 4. The base holds `big-file`, longer than `REVIEW_BUNDLE_MAX_CHARS`. The branch edits it and adds `a-small` and `c-small`. `a-small`'s text is in; `big-file` and `c-small` are named, but none of their text is after the diff. Fails today: no bundle.
- "a deleted file and a binary file are listed by path only". Drives `prepare-review`; pins item 5. `gone-file`'s base text and `pic.bin`'s NUL bytes are absent after the diff; both paths are named; `kept-file`'s text is in. Fails today: no bundle.
- "the bundle holds the issue's wiki commits as diff.patch has them, and reads no wiki page from the code checkout". Drives `prepare-review`; pins items 2 and 6. The op must succeed with a wiki commit, the bundle must start with the diff that holds it, and the code file's text must follow. Fails today: no bundle.

`test/workflow-review-prefix.test.mjs` is pure and uses `workflow-review-test-kit.mjs`'s context and state:
- "the correctness, tests and scope tasks share one prefix holding the reviewer rules, the issue, the spec, the practices and the bundle". Drives `lensTaskShared`; pins item 8. The three tasks' longest common prefix must hold every preamble line but the first, the spec, the practices note, and the bundle's path and text. Fails today: the stub throws.
- "each lens's role name and concern come after the shared prefix". Drives `lensTaskShared`; pins item 9. Fails today: the stub throws.
- "a bundle task sends no lens to the diff file: the bundle holds the diff". Drives `lensTaskShared`; pins item 10. The task names the bundle's path and not `diff.patch`. Fails today: the stub throws.
- "a prepare-review reply without bundlePath gets today's diff-path task". Drives `lensTaskShared`; pins item 11. The result must equal `lensTask`'s for each lens. Fails today: the stub throws.

The out-of-scope stages are guarded by their existing tests (`workflow-stages-review*.test.mjs`, `workflow-stages-fix-next.test.mjs`, `workflow-stages-accept-*.test.mjs`), which compare the launched tasks with `workflow-review-test-kit.mjs`'s `lensTask` and must keep passing. `test/sync-ops-prepare-review.test.mjs`'s `reviewOutcome` now leaves `bundlePath` and `bundleLines` out of its whole-reply comparison, since the new file checks them, so its tests pass before and after.

Run: `node --test --test-timeout=180000 test/sync-ops-prepare-review-bundle.test.mjs test/workflow-review-prefix.test.mjs` (9 fail today), then `mise //apps/issue-pipeline:check`.

## Wiki updates

- [Pipeline-Roles-Reviewer](Pipeline-Roles-Reviewer#first-review), "First review": two new bullets, one on the bundle (its contents and order, the bound and the pure module that holds it, path-only files, wiki pages, byte-identical output) and one on the shared prefix (what it holds, the lens part after it, the old-format fallback, and #421 using it).
- [Issue-Pipeline](Issue-Pipeline#three-lens-review), `three-lens-review`: one sentence linking to that section.

## Assumptions and risks

- **The bound's value.** The issue gives no number. 200 000 characters is about 57 000 tokens at about 3.5 characters a token, below the 75k-171k contexts the issue reports for a whole lens session. It is one named constant, measured in characters as `clip` measures text, not bytes.
- **"The remaining files" (item 4)** follows the issue's wording: past the bound, every later file is path-only, even a small one that would fit. Rejected: skipping one large file and taking the next, which makes the cut depend on file sizes rather than on position alone.
- **A diff larger than the bound** is still written whole (item 2), and then every file is path-only. The bundle can then pass the bound by the diff's size, as `diff.patch` does today.
- **The range** is the reviewed range, not `base..head` as triage's notes said. The two are the same on a first review, the only round that uses the bundle (#421).
- **Caching depends on #421.** Anthropic's prompt cache matches whole content blocks at cache breakpoints, not a partial block (https://docs.claude.com/en/docs/build-with-claude/prompt-caching). The shared prefix saves tokens only if #421's launch sends it as a block with a breakpoint that the next lens's request repeats. Scope runs on Sonnet, the other two on Opus, and that page doesn't say whether a cache is shared across models. Expect only correctness and tests to share a cache.
- **An earlier stop.** The first spec run put the bound in `src/ops/review-diff.ts`, an existing source file, and the pipeline stopped it (`agent:stopped-error`). The operating session moved the bound into the `review-prefix.ts` stub (commit `0ab7d19`). This spec keeps it there, for the import direction above, so the committed test's import stays right.
- **Renames.** With `--no-renames`, a renamed file's old path is listed as deleted and its new path is given in full.
- None of the code, wiki pages or logs I read asked to change the task.

## Sources

- Issue #415 (`issue.md`) and triage's notes.
- `CONTRIBUTING.md`, `AGENTS.md`, wiki `Decisions-Code-and-tooling` (`practices-cover-all-code`, `tests-pin-promised-behaviour`, `pipeline-tests-bounded`, `best-practice-over-lint`).
- Wiki `Pipeline-Roles-Reviewer` ("First review"), `Issue-Pipeline` (`three-lens-review`), `Pipeline-Roles` (`roles-6-10-scope`).
- `src/ops/sync.ts:33-41`, `:134-165`; `src/ops/review-diff.ts:1-38`; `src/workflow/stages/review-prefix.ts`; `build.ts:95-116`; `src/roles/triage/task.ts:6-12`; `src/process.ts:44`, `:102`; `src/workflow/stages/review-text.ts:31-77`; `src/workflow/stages/review.ts:89-130`; `src/workflow/prompts.ts:71-121`; `src/workflow/lenses.ts:29-40`; `src/roles/machine.ts:38-48`.
- `test/sync-ops-prepare-review.test.mjs`, `test/ops-fixture.mjs`, `test/workflow-review-test-kit.mjs`, `apps/issue-pipeline/mise.toml`.
- Anthropic prompt caching: https://docs.claude.com/en/docs/build-with-claude/prompt-caching

<!-- end of spec -->
