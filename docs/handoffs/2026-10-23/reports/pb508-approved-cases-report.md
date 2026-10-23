# PB508 approved browser cases

## Result

Implemented exactly two new genuine browser-mode feature cases. **Both passed once in Chromium and WebKit.** The existing use-case coverage guard then passed once: **11 tests, no failures**. These are separate focused results, not a configured gate, full-suite pass, repair claim, independent source review or canonical acceptance.

The candidate contains the complete accepted PB508 preparation plus only two new test files. All 892 existing non-env prepared files retain exact accepted bytes. Root lint, the six original Vite bodies/fixtures, existing browser coverage and the existing PB514 scenario are unchanged. No production file, guard, case definition, pending list, exemption, timeout or concurrency setting changed.

Two earlier failures remain explicit: an incorrect native-package inspection name, and a scoped Biome check on the initial draft. The supervisor authorized one corrected-name inspection before the original unused browser slot. I corrected the draft's reported lint issues before the browser run, but did not rerun the failed lint check. **There is no current-source lint-pass claim.**

## Scope and guidance

Paths:

- `D`: `/Users/axolotl-logic/workspace/agent-handoffs/project-buddy/20261019-launch-ready/dispatch-20261022-four-lane-drain`.
- `S`: `D/approved-pb508-cases/source`, the new normal clone and sole source-writing scope.
- `E`: `D/approved-pb508-cases/evidence`, the new evidence directory.

The only report is this authoritative path, `D/pb508-approved-cases-report.md`. The reviewed `D/prepare-pb508-target/source` and all prior evidence remain immutable. No child agent, source commit, push, GitHub mutation, canonical start, live wrapper/config application, target change or install occurred.

I read the complete prospective grant, original policy, target independent review and preparation report. I read actual root/web AGENTS, README, docs index, shared/project practices, docs style guide, Decisions index and every Decisions page. I followed up truncated combined guidance with bounded reads. No CONTRIBUTING exists on this target. I reread the incoming changed shared practices after applying the accepted patch. The installed Next Server and Client Components guide was read after provisioning became available; only tests changed, not Next production code.

Before writing the cases, I read their actual definitions, the real buddy-list page, footer, header, root layout, relevant page components and copy, existing browser suites, phone/page fixtures, workspace/site-frame/current-user/id test kits, browser setup/config and Vite plugins. The manual-credit definition concerns Blender Reference Manual attribution, not financial credit.

## Authenticated route and candidate identity

Initial read-only origin inspection named `https://github.com/axolotl-logic-io/project-buddy.git`. GitHub repository metadata identified that canonical non-fork repository with admin permission. Initial explicit remote refs and PR517 metadata matched the required subjects. A normal `git clone --single-branch --branch integration` created `S` at the exact target. No alternate route, trust action, shallow/filter clone, hook bypass or Git configuration override was used.

Final explicit refs and PR metadata still match. PR517 remains open, unmerged and draft, with canonical base repository/ref `integration` and canonical head repository. Draft status is not landing eligibility. `E/final-remote-refs.txt`, `E/final-pr517-metadata.json` and `E/route-closeout-commands.json` retain closeout evidence. No thread text or untrusted contributor instruction was consumed.

| Subject | Identity |
| --- | --- |
| Target / unchanged local HEAD | `c4a7056d5cd7ee07e7425b5c922aad2e3e8d8c44` |
| PR517 head, initial and final | `df84ab2fa012f91eaacdb52afcf9d5aa2ca52832` |
| Accepted complete input patch SHA-256 | `a2539f3e51a7250c60a55fb8379fbddfbeca6717c814bf7b735d8fbec0e9a814` |
| Accepted prepared tree | `a2a511647b3cefdf31c8ae8bb971538e46b69ea3` |
| New complete candidate tree | **`657fc2ecbddf9deabf02cd6710599597fcfa4dce`** |
| New-case-only patch SHA-256 | **`595352b53361f358e6a8a04c4091436d7895b063ef2c1d4caded2d5260451090`** |
| Complete target-to-candidate patch SHA-256 | **`2bc6af70f51f6b3540d550100a00699b823fb994f150ea3f7d214f82175dfa08`** |
| Unchanged root lint SHA-256 | `540005094deaec6379199cdb0a2832dbcc79cd0bb6aa12f1cfd824779f9a59fb` |
| Unchanged lockfile SHA-256 | `76705cfcc26c44f2c3d9cf56ff950e44e8a16382b0433e0b8887ee01bec67cb2` |
| Final index / target tree | `1d26d7d41e7466ebe7c7bb732ad9ea230b7db519` |
| Evidence manifest SHA-256 | `95d5870462952ae10eebee95788e0af4cff81fe31db8e173791cbce8325f8723` |

The input patch's SHA-256 matched before `git apply --index`. Its resulting index tree exactly reproduced the accepted prepared tree. This applied every inherited addition/deletion, not only an overlay. I cleared only own staging normally at unchanged HEAD before writing new cases.

The new delta is exactly two additions:

| New test file under `S` | SHA-256 |
| --- | --- |
| `apps/web/test/buddies/buddy-list.browser.test.tsx` | `00de8d0a43bfb1bab9e90d07ca70e9f797159f40a5e6cf1b36fbdd62f02eb6d1` |
| `apps/web/test/components/site-footer.browser.test.tsx` | `25364617d20aca35410a2d964956e7ba716d2c8dcda3d6904c988ae668643592` |

## Genuine feature assertions

### Buddy listing

`test("use_case_view_buddies", …)` invokes and renders the actual async `BuddiesPage` through the existing workspace/browser harness. It does not mock the page, built-in buddy provider, cards or controls.

It checks the rendered heading, built-in section preceding the user's section, all six named built-ins, actual detail-link destinations and enabled Customize controls. Two own-buddy fixtures deliberately have names opposite alphabetical order. The test checks their supplied oldest-first display order, detail/Tweak destinations and enabled Clone controls. It then rerenders the real page with an empty store result and checks the visible empty-state message, no own cards, and retention of all six built-ins.

Only the established current-user, database-store and unsubmitted Server Action boundaries are mocked. Existing `HIPPY_CLONE`, domain-id and workspace test kits supply fixtures. Database ownership, database sorting, legacy redirects and actual clone submissions are not proven by this UI case; those remain server/router coverage concerns. The test does not claim mock data proves owner isolation.

### Manual attribution

`test("use_case_see_manual_credit", …)` uses the established site-frame kit and actual sign-in, not-found and home components. It constructs signed-out public frames and a signed-in home frame, then renders their real shared header/main/footer composition in the browser. The footer is the actual `SiteFooter`, not recreated test markup.

For each frame, it checks a visible footer after main content, exactly two attribution links, visible Blender Reference Manual and CC BY-SA 4.0 labels, the exact destinations below and the license relationship:

```text
https://docs.blender.org/manual/en/latest/
https://creativecommons.org/licenses/by-sa/4.0/
rel="license"
```

It inspects destinations without navigating to external sites. Only established auth and unsubmitted action boundaries are mocked. This is browser-mode component integration, not a Next server/navigation or universal-route-rendering test.

## Safety and dependency preflight

Node was the explicit pinned `/Users/axolotl-logic/.local/share/mise/installs/node/24.21.0/bin/node`; npm was its explicit `lib/node_modules/npm/bin/npm-cli.js`, version **11.19.0**. Python was only `/usr/bin/python3`.

I reviewed root/workspace package scripts and lock lifecycle metadata. There are no project install lifecycle hooks. Dependency lifecycle hooks were disabled, not executed: the lock listed only esbuild/fsevents install hooks. One locked provisioning command ran in the owned clone:

```sh
/Users/axolotl-logic/.local/share/mise/installs/node/24.21.0/bin/node /Users/axolotl-logic/.local/share/mise/installs/node/24.21.0/lib/node_modules/npm/bin/npm-cli.js ci --ignore-scripts --no-audit --no-fund
```

It passed, installing 723 packages. `E/npm-ci.log` retains deprecation notices and npm's update notice; no update was performed. No sibling dependency directory was borrowed. No subsequent install, bootstrap or download-on-test occurred.

Installation and execution used a fresh allowlisted subprocess environment, isolated HOME, empty isolated npm user/global configs and isolated npm cache under `E`. No ambient credentials or model variables were inherited. `E/execution-environment.json` records every supplied value. It includes `TUTOR_MODEL=mock`, `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` and the existing browser-cache path. The runner uses the unchanged browser config's empty browser-side `process.env` definition. The actual loaded feature paths have no unmocked data/model/action call.

Before any browser/Vite loader, I used stat/lstat only on all **16** candidates: `.env`, `.env.local`, and `.env.production`, `.env.development`, `.env.test`, each with and without `.local`, in root and `apps/web`. All were absent at initial preflight and again immediately before loading Vitest. No dotenv or credential contents were read. Tracked env examples were excluded from content/hash reads; their unchanged object identities remain in Git trees.

Installed SWC 16.4.0, Tailwind oxide and lightningcss loaded successfully. The first native probe then failed with exit 1 because I mistakenly named nonexistent `@rolldown/binding`:

```text
Error: Cannot find module '@rolldown/binding'
```

No browser/test had started. I paused and obtained explicit authorization for one corrected-name inspection. `E/supervisor-inspection-correction.md` retains the exact supervisor decision. Lock and installed metadata matched `@rolldown/binding-darwin-arm64` **1.2.13**, darwin/arm64. The corrected probe loaded that already-installed exact package and passed. Original and corrected commands, errors and exits remain in their separate `*-result.json` and `.log` files. No dependency or resolver substitution occurred.

Installed browser paths matched Playwright 1.64.0's Chromium revision **1248** and WebKit revision **2370**. Required executables existed. The real browser run subsequently used the existing Chromium and WebKit instances successfully. No browser install command ran.

## Checks and retained failures

### Initial scoped lint failure

An initial source-editing Biome command checked only the two new files:

```sh
NODE S/node_modules/@biomejs/biome/bin/biome check --write --error-on-warnings test/buddies/buddy-list.browser.test.tsx test/components/site-footer.browser.test.tsx
```

Here `NODE` is the explicit pinned Node path above; cwd was `S/apps/web`. `E/scoped-biome-result.json` records the fully expanded command. It returned **exit 1**, reporting seven draft diagnostics: explicit fixture type, two unnamed six-item counts, three awaited loops and a bitwise document-position assertion. The full failure remains in `E/scoped-biome.log`.

I corrected those reported draft constructs without weakening assertions or changing policy. Independent assertion loops now use `Promise.all`; page frames are constructed sequentially, then their read-only attribution assertions run together. One later `biome format --write` source-format command passed. **I did not rerun the lint check, and formatting is not lint validation.** The focused runtime evidence below is on the final revised/formatted source, which stayed unchanged through export.

### Focused browser invocation

Exactly one runner-native browser invocation ran, from `S/apps/web`, selecting only the two new files, each containing one new case:

```sh
/Users/axolotl-logic/.local/share/mise/installs/node/24.21.0/bin/node ../../node_modules/vitest/vitest.mjs run test/buddies/buddy-list.browser.test.tsx test/components/site-footer.browser.test.tsx --project=browser --reporter=verbose
```

**Exit 0. Four browser-instance test results passed:** both case slugs in Chromium and both in WebKit. Vitest reported four test files/instances and four tests passed, duration **2.79 s**; subprocess wall time was **4.467 s**. No skips, pending entries or unrelated cases appeared. Original browser/assertion bounds, flags and concurrency remain unchanged. `E/focused-browser.log` and `E/focused-browser-result.json` retain the full output and exact command.

### Existing coverage guard invocation

After that pass, exactly one existing guard invocation ran on the genuinely changed source prerequisite:

```sh
/Users/axolotl-logic/.local/share/mise/installs/node/24.21.0/bin/node ../../node_modules/vitest/vitest.mjs run use-cases/use-cases.test.ts --project=repository --reporter=verbose
```

**Exit 0. One file, 11 tests passed, duration 354 ms.** This includes the unchanged missing-slug assertion. The guard, scanner, case definitions, auth and pending lists were not modified. `E/coverage-guard.log` and `E/coverage-guard-result.json` retain output and command.

The prior **69-pass / 1-failure** repository-guard result remains unchanged at `D/pb508/fast-repository-guards.log`; its hash is recorded among inputs. The new single-file 11-test guard pass is not a rerun or reattribution of that broader historical total. No old #178 unauthorized success is used as proof.

## Export, preservation and closeout

`E/prepared-to-new-cases.patch` and its manifest export exactly the two new additions against accepted tree `a2a51164…`. `E/target-to-candidate.patch` and its manifest export the **complete 253-path** target-to-new-candidate change: **28 modifications, 220 deletions and five additions**. All original cleanup deletions and all five untracked additions are included. There is no old-policy overlay or omitted cleanup.

Mechanical comparisons established that the complete prepared-to-candidate Git delta is only those two additions; every pre-existing non-env prepared file matches its accepted Git blob. Exact original Vite suite hashes remain:

```text
vitest.browser-deps.test.mts
66e65fa026bc6862778eeaf0e14b6315c48559fa424312b6d5bdb5292c082f44
vitest.browser-syntax.test.mts
46ae66cbcbd78bc9c6428ae018f79c880733787e926f94fcf39040a8924fcdd6
```

Complete patch forward applicability against the exact-target index and reverse applicability against working source passed. Staged whitespace inspection passed. `E/execution-source-hashes.json` records 894 non-env source hashes before runtime; all still matched at export. `E/candidate-identity.json`, both patch manifests and `E/input-artifact-hashes.json` bind the subject and inputs. `E/artifact-manifest.json` hashes 42 direct evidence files; isolated HOME/cache directories are not source or attestation artifacts.

I staged only the explicit 253 intended paths to export patches/tree, then used normal `git reset --mixed HEAD` to clear only own staging. HEAD never moved. Final staged and unmerged lists are empty. Final index equals target tree `1d26d7d…`. Working changes and all five intended untracked additions remain present. No commit was created.

Both runners returned naturally. A closeout `lsof` inspection of process names/PIDs/cwd, filtered to the owned source subtree, found **no remaining process with cwd there**. No process arguments/environments were read, no process was signaled, and no host-wide quiescence is claimed. `E/scoped-consumer-closeout.json` records this limited observation. The focused slot is relinquished.

No production database, real model, application server, secret/env contents, live wrapper, state/receipt/limit/lease, stop, budget or target/operator setting was touched. Installed `684473c`, disabled CI, PB511/PB512 exclusions, stopped177, separate187/108, PID88384 and the unauthorized history remain untouched, not freshly authenticated by this work.

## Unrun boundaries and next prerequisite

Unrun: six Vite cases; full/root lint and final revised-source scoped lint; typecheck/typegen; build; broad repository/browser/server/database/e2e/visual suites; real-model tests; old configured wrapper; every canonical phase, Security, publication, target application and installation acceptance. No broad check or configured old wrapper ran.

**Next actionable prerequisite:** obtain fresh independent source review of candidate tree `657fc2ec…`, the two-file delta and the complete target export. Preserve the retained lint failure and establish applicable current-source lint/types/fast-policy evidence through an authorized, separately reviewed exact-source/effective-policy/configured-stage binding. Do not mechanically refresh the incompatible old wrapper or call this focused result a gate. Parent owns that binding, publication and all canonical continuation decisions.

```acceptance-report
{
  "criteriaSatisfied": [
    {"id":"criterion-1","status":"satisfied","evidence":"Added exactly two genuine rendered feature cases in new owned clone; prepared-to-candidate delta contains only two test additions. Complete accepted cleanup, root lint, existing Vite/browser/514 sources and coverage guard remain unchanged."},
    {"id":"criterion-2","status":"satisfied","evidence":"Retained exact input/candidate/tree/patch identities, complete253-path and two-path manifests,894 execution-source hashes, original failures, one4-result browser pass, one11-test guard pass, empty final staging and scoped consumer closeout."}
  ],
  "changedFiles": [
    "approved-pb508-cases/source/apps/web/test/buddies/buddy-list.browser.test.tsx",
    "approved-pb508-cases/source/apps/web/test/components/site-footer.browser.test.tsx",
    "approved-pb508-cases/source: complete253-path inherited-plus-new target delta in evidence/target-to-candidate-manifest.json",
    "approved-pb508-cases/evidence:42 direct artifacts hashed in artifact-manifest.json, plus isolated provisioning directories",
    "pb508-approved-cases-report.md"
  ],
  "testsAddedOrUpdated": [
    "apps/web/test/buddies/buddy-list.browser.test.tsx:use_case_view_buddies",
    "apps/web/test/components/site-footer.browser.test.tsx:use_case_see_manual_credit"
  ],
  "commandsRun": [
    {"command":"Read-only route/origin/GitHub metadata and initial/final explicit integration/PR517 refs;normal single-branch integration clone","result":"passed","summary":"Target c4a7056d and PR517 df84ab2f remained exact;canonical route;no GitHub mutation."},
    {"command":"Verify pinned full patch SHA256;git apply --index;git write-tree;normal own-index clear","result":"passed","summary":"Reproduced accepted prepared tree a2a511647b3cefdf31c8ae8bb971538e46b69ea3 before new edits."},
    {"command":"Pinned Node/npm ci --ignore-scripts --no-audit --no-fund with isolated HOME/config/cache","result":"passed","summary":"One install,723 packages;no lifecycle execution,sibling dependencies or bootstrap."},
    {"command":"Initial native preflight require('@rolldown/binding')","result":"failed","summary":"Exit1 MODULE_NOT_FOUND:mistaken package name;before any browser/Vite/test launch. Original command and error retained."},
    {"command":"Supervisor-authorized corrected installed-package identity/preflight require('@rolldown/binding-darwin-arm64')","result":"passed","summary":"Exact locked/installed1.2.13 darwin-arm64;SWC/oxide/lightningcss and existing required browser executables verified;no reinstall/substitution."},
    {"command":"Scoped biome check --write --error-on-warnings on two draft test files","result":"failed","summary":"Exit1;seven diagnostics retained. Reported constructs corrected before runtime;lint not rerun and no lint-pass claim."},
    {"command":"Scoped biome format --write on revised two test files","result":"passed","summary":"Source formatting only,not lint validation."},
    {"command":"Pinned Node ../../node_modules/vitest/vitest.mjs run test/buddies/buddy-list.browser.test.tsx test/components/site-footer.browser.test.tsx --project=browser --reporter=verbose","result":"passed","summary":"Exactly one invocation;two new cases each passed in Chromium and WebKit;4 tests,exit0,2.79s runner duration."},
    {"command":"Pinned Node ../../node_modules/vitest/vitest.mjs run use-cases/use-cases.test.ts --project=repository --reporter=verbose","result":"passed","summary":"Exactly one changed-prerequisite guard invocation;11 tests,exit0,354ms. Historical69/1 evidence remains separate."},
    {"command":"Explicit253-path staging;complete/new-case diff exports;write-tree;normal reset --mixed HEAD;forward/reverse apply --check;whitespace and final hash/index/consumer checks","result":"passed","summary":"Candidate657fc2ec;all892 inherited non-env files exact;894 execution hashes unchanged;no staged/unmerged paths or remaining owned-source-cwd consumers."},
    {"command":"Vite/full/root lint/final scoped lint/types/typegen/build/broad suites/model/configured wrapper/canonical phases","result":"not-run","summary":"Not expanded beyond authorized focused slot;no full-green,repair,gate,Security,delivery or installation claim."}
  ],
  "validationOutput": [
    "Focused browser:4 passed,0 failed;two case slugs across unchanged Chromium/WebKit instances.",
    "Coverage guard:11 passed,0 failed;guard and source definitions unchanged.",
    "Candidate tree657fc2ecbddf9deabf02cd6710599597fcfa4dce;complete patch2bc6af70f51f6b3540d550100a00699b823fb994f150ea3f7d214f82175dfa08.",
    "New-case patch595352b53361f358e6a8a04c4091436d7895b063ef2c1d4caded2d5260451090;253 complete changed paths:28M/220D/5A.",
    "Initial native probe and draft lint failures retained;only the named inspection correction received explicit supervisor authorization. No test rerun occurred."
  ],
  "residualRisks": [
    "Fresh independent source review required for the new exact subject.",
    "Draft scoped lint failed;reported issues corrected but final scoped/root lint and types remain unrun. No current lint/type pass.",
    "Mocked UI boundaries do not prove database isolation/sorting,clone submissions,legacy redirects or actual Next universal-route rendering.",
    "New exact-source/effective-policy/configured-stage binding and parent-owned canonical prerequisites remain;old wrapper incompatibility is not repaired here."
  ],
  "noStagedFiles": true,
  "diffSummary":"Complete accepted PB508 target reconciliation preserved;only two genuine browser-case additions authored. Full inherited253-path candidate exported without commit or publication.",
  "reviewFindings": [
    "Independent review remains required;this author report is not source acceptance.",
    "Runtime evidence is limited to new cases and existing use-case guard;retained lint failure prevents a lint-green claim."
  ],
  "manualNotes":"Focused slot relinquished after natural runner exits;no consumers with cwd in owned source at closeout. All parent-owned publication,routing,policy,Security,target,install and acceptance boundaries remain."
}
```
