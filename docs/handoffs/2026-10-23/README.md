# GitHub work index — 2026-10-23

GitHub in this owning repository is the source of truth. No local file or backup repository is required to locate the work. All named handoff branches are ordinary inspectable source, not opaque archives. No live pipeline job was present at the final host checkpoint. Do not interpret a stale label as a running worker.

## Current issues

| Issue | Recorded state | Next action |
| --- | --- | --- |
| [#523](https://github.com/axolotl-logic-io/project-buddy/issues/523) Define an explicit integration preparation and environment publication contract | Unimplemented integration phase contract | Design/review explicit setup→environment-publication→verification. Fast-only v4 does not waive F2. |
| [#522](https://github.com/axolotl-logic-io/project-buddy/issues/522) Reconcile PB source branches and open work after workstation loss | Native GitHub work index | Use source-map and current PRs; record every remaining source disposition here. |
| [#521](https://github.com/axolotl-logic-io/project-buddy/issues/521) Adopt the reviewed fast-only preparation policy on the replacement host | Implemented fast-only v4 proposal; static PASS only | Port host-specific assumptions and prove normal checkout/startup before adopting. Never run the old absolute scripts blindly. |
| [#520](https://github.com/axolotl-logic-io/project-buddy/issues/520) Reconcile retained wiki and legacy-checkout source changes | Legacy root/wiki source identified | Use native handoff branches for legacy-root and legacy-wiki; compare canonical docs/wiki and file focused source disposition. |
| [#514](https://github.com/axolotl-logic-io/project-buddy/issues/514) Fix browser code colors changing with the system theme despite selected Dark mode | Regression readiness in519; cause unproved | Keep open. Reproduce/establish original cause or explicitly resolve remaining scope; old8browser passes are not proof on519. |
| [#508](https://github.com/axolotl-logic-io/project-buddy/issues/508) Delete the site's unit tests and forbid new ones | Consolidated candidate PR519; unverified combined head | Review deletion ledger and genuine cases, bind final source/policy/startup, then run allowed current gate and independent Security. Older517 is superseded source. |

## Source PRs

| PR | Branch and exact head | Disposition |
| --- | --- | --- |
| [#524](https://github.com/axolotl-logic-io/project-buddy/pull/524) | `handoff/20261023/work-tracking` / `516238ab551b8a395e147e8bdc6ac7a8540ebc11` | Draft checkpoint; complete actual current gate and independent pre-Land Security before merging. |
| [#519](https://github.com/axolotl-logic-io/project-buddy/pull/519) | `recovery/issue-508-source-20261023` / `471d9eb5b05749fb6c3c8ef6d9d9f3294ec9f059` | Draft checkpoint; complete actual current gate and independent pre-Land Security before merging. |
| [#517](https://github.com/axolotl-logic-io/project-buddy/pull/517) | `agent/issue-508` / `df84ab2fa012f91eaacdb52afcf9d5aa2ca52832` | Older divergent source; consolidated current candidate is519. Preserve history; do not merge independently. |
| [#516](https://github.com/axolotl-logic-io/project-buddy/pull/516) | `agent/issue-514` / `b5eeb21e9b867bc51261442d15ed0a695ee9fba7` | Older divergent source; consolidated current candidate is519. Preserve history; do not merge independently. |

## Published source states

The full machine-independent mapping is [source-map.json](source-map.json). Duplicate source states share a branch; dirty states received explicit WIP commits. Historical alternatives are not patches to stack or candidates to merge automatically.

| Original source context | Native branch | Exact checkpoint |
| --- | --- | --- |
| `dispatch-20261022-pb-508-514/pb514-corrections` | [handoff/20261023/checkpoint-2-b5eeb21e](https://github.com/axolotl-logic-io/project-buddy/tree/handoff/20261023/checkpoint-2-b5eeb21e) | `2d207e6d9f79732dc0adadc9a253ed1ee1a0327c` |
| `dispatch-20261022-pb-508-514/pb508-harness-correction` | [handoff/20261023/checkpoint-5-98a525a1](https://github.com/axolotl-logic-io/project-buddy/tree/handoff/20261023/checkpoint-5-98a525a1) | `ecc8448d63a7fd414260dedbd69a40fa244d784e` |
| `dispatch-20261022-pb-508-514/pb508-inventory` | [handoff/20261023/checkpoint-6-29065aa2](https://github.com/axolotl-logic-io/project-buddy/tree/handoff/20261023/checkpoint-6-29065aa2) | `29065aa2131595175cab9670160a616b518b08b9` |
| `dispatch-20261022-pb-508-514/pb187-defaults` | [handoff/20261023/checkpoint-8-c4a7056d](https://github.com/axolotl-logic-io/project-buddy/tree/handoff/20261023/checkpoint-8-c4a7056d) | `c4a7056d5cd7ee07e7425b5c922aad2e3e8d8c44` |
| `dispatch-20261022-pb-508-514/pb514-review` | [handoff/20261023/checkpoint-9-b5eeb21e](https://github.com/axolotl-logic-io/project-buddy/tree/handoff/20261023/checkpoint-9-b5eeb21e) | `b5eeb21e9b867bc51261442d15ed0a695ee9fba7` |
| `dispatch-20261022-pb-508-514/eco187-defaults-main` | [handoff/20261023/checkpoint-10-c3134206](https://github.com/axolotl-logic-io/project-buddy/tree/handoff/20261023/checkpoint-10-c3134206) | `c3134206c0e94fa81b53c6dde1d14bc9b2877cb7` |
| `recovery-20261019T182905Z-project-buddy-475-483/operator-483` | [handoff/20261023/checkpoint-13-4d9e4b72](https://github.com/axolotl-logic-io/project-buddy/tree/handoff/20261023/checkpoint-13-4d9e4b72) | `4d9e4b72abd800d0769118b39c280b0c00179749` |
| `recovery-20261019T182905Z-project-buddy-475-483/operator-475` | [handoff/20261023/checkpoint-14-a67e923d](https://github.com/axolotl-logic-io/project-buddy/tree/handoff/20261023/checkpoint-14-a67e923d) | `a67e923df0bc9a1cd42140334d95d22ac58f028f` |
| `migration-url-repair-20261019T172114Z/operator-479` | [handoff/20261023/checkpoint-26-2c2825f1](https://github.com/axolotl-logic-io/project-buddy/tree/handoff/20261023/checkpoint-26-2c2825f1) | `2c2825f164b9222fd4e541441f01db11e29bc43a` |
| `migration-url-repair-20261019T172114Z/recovery/issue-481/failed-job-copy/repo` | [handoff/20261023/checkpoint-27-44bde589](https://github.com/axolotl-logic-io/project-buddy/tree/handoff/20261023/checkpoint-27-44bde589) | `44bde589fe947c4b717ddd7cf8dd34f5a2ce13bd` |
| `migration-url-repair-20261019T172114Z/recovery/issue-481/original-failed-job/repo` | [handoff/20261023/checkpoint-27-44bde589](https://github.com/axolotl-logic-io/project-buddy/tree/handoff/20261023/checkpoint-27-44bde589) | `44bde589fe947c4b717ddd7cf8dd34f5a2ce13bd` |
| `migration-url-repair-20261019T172114Z/recovery/issue-480/failed-job-copy/repo` | [handoff/20261023/checkpoint-29-d729d0f9](https://github.com/axolotl-logic-io/project-buddy/tree/handoff/20261023/checkpoint-29-d729d0f9) | `d729d0f9f2e4b5777028c96f8aaa5d7ffb52547d` |
| `migration-url-repair-20261019T172114Z/recovery/issue-480/original-failed-job/repo` | [handoff/20261023/checkpoint-29-d729d0f9](https://github.com/axolotl-logic-io/project-buddy/tree/handoff/20261023/checkpoint-29-d729d0f9) | `d729d0f9f2e4b5777028c96f8aaa5d7ffb52547d` |
| `migration-url-repair-20261019T172114Z/recovery/issue-479/failed-job-copy/repo` | [handoff/20261023/checkpoint-31-7d5f7963](https://github.com/axolotl-logic-io/project-buddy/tree/handoff/20261023/checkpoint-31-7d5f7963) | `7d5f796340c1a67eb62b87478678c47688c67f7e` |
| `migration-url-repair-20261019T172114Z/recovery/issue-479/original-failed-job/repo` | [handoff/20261023/checkpoint-31-7d5f7963](https://github.com/axolotl-logic-io/project-buddy/tree/handoff/20261023/checkpoint-31-7d5f7963) | `7d5f796340c1a67eb62b87478678c47688c67f7e` |
| `migration-url-repair-20261019T172114Z/operator-480` | [handoff/20261023/checkpoint-33-5a460147](https://github.com/axolotl-logic-io/project-buddy/tree/handoff/20261023/checkpoint-33-5a460147) | `5a460147adb7d44df6603ebf4b7085f51b8e61be` |
| `migration-url-repair-20261019T172114Z/operator-481` | [handoff/20261023/checkpoint-34-af160881](https://github.com/axolotl-logic-io/project-buddy/tree/handoff/20261023/checkpoint-34-af160881) | `af16088118d58c653f2eabedc6eef8059b8f0df2` |
| `cutover-UTC-A/candidate` | [handoff/20261023/checkpoint-35-d6346746](https://github.com/axolotl-logic-io/project-buddy/tree/handoff/20261023/checkpoint-35-d6346746) | `d6346746d28e8612d4a3046700f4a1b7c0306622` |
| `dispatch-20261022-four-lane-drain/approved-pb508-cases/source` | [handoff/20261023/checkpoint-39-c4a7056d](https://github.com/axolotl-logic-io/project-buddy/tree/handoff/20261023/checkpoint-39-c4a7056d) | `1f9a5bfd98506ec81ec5859722e34be06ac234b6` |
| `dispatch-20261022-four-lane-drain/prepare-pb508-target/source` | [handoff/20261023/checkpoint-42-c4a7056d](https://github.com/axolotl-logic-io/project-buddy/tree/handoff/20261023/checkpoint-42-c4a7056d) | `017422cd829d442a8f57f7a1b5fffd1e863a0454` |
| `dispatch-20261022-four-lane-drain/pb514/source` | [handoff/20261023/checkpoint-2-b5eeb21e](https://github.com/axolotl-logic-io/project-buddy/tree/handoff/20261023/checkpoint-2-b5eeb21e) | `2d207e6d9f79732dc0adadc9a253ed1ee1a0327c` |
| `dispatch-20261022-four-lane-drain/pb508/source` | [handoff/20261023/checkpoint-44-df84ab2f](https://github.com/axolotl-logic-io/project-buddy/tree/handoff/20261023/checkpoint-44-df84ab2f) | `880551a2e88ddab787b29fe5e95022d882aa3a7e` |
| `migration-url-repair-20261019T171812Z/recovery/issue-479/failed-job-copy/repo` | [handoff/20261023/checkpoint-31-7d5f7963](https://github.com/axolotl-logic-io/project-buddy/tree/handoff/20261023/checkpoint-31-7d5f7963) | `7d5f796340c1a67eb62b87478678c47688c67f7e` |
| `migration/session-resume/pb-475-retained-merge-checkout-20261022T1018Z/repo` | [handoff/20261023/checkpoint-46-2c54319f](https://github.com/axolotl-logic-io/project-buddy/tree/handoff/20261023/checkpoint-46-2c54319f) | `f6bec9830747ba38cb272e5cfb195a0276a1c767` |
| `migration/session-resume/pb-482-retained-merge-checkout-20261022T0630Z/repo` | [handoff/20261023/checkpoint-47-b1b7e53a](https://github.com/axolotl-logic-io/project-buddy/tree/handoff/20261023/checkpoint-47-b1b7e53a) | `7d8714ee81e2fefcf0d50eb688ab4a6992423ef3` |
| `migration/session-resume/pb-482-retained-merge-checkout-2-20261022T0737Z/repo` | [handoff/20261023/checkpoint-48-79c8c2f2](https://github.com/axolotl-logic-io/project-buddy/tree/handoff/20261023/checkpoint-48-79c8c2f2) | `7e9fe2f5d47f083f9a0c152773b405f93537b617` |
| `legacy-root` | [handoff/20261023/checkpoint-legacy-root-e798e377](https://github.com/axolotl-logic-io/project-buddy/tree/handoff/20261023/checkpoint-legacy-root-e798e377) | `77462b3398c4407fe49c91289adea282d9121abb` |
| `legacy-wiki` | [handoff/20261023/checkpoint-legacy-wiki-57459172](https://github.com/axolotl-logic-io/project-buddy/tree/handoff/20261023/checkpoint-legacy-wiki-57459172) | `574591728a5286732ed21ee39cbac0e32f9f6aa3` |

## External policy proposal

The complete [policy-proposal](policy-proposal/) source and [reports](reports/) live in this repository. Static review is not adoption, setup, type generation, current verification, Security or installation. The old host absolute paths/tool hashes/platform assumptions require review on the replacement host. Do not run them blindly or auto-refresh pins.

Ecosystem policy adoption is tracked by [ecosystem196](https://github.com/axolotl-logic-io/ecosystem/issues/196). PB fast-only adoption is [PB521](https://github.com/axolotl-logic-io/project-buddy/issues/521); its unresolved integration/environment phase contract is [PB523](https://github.com/axolotl-logic-io/project-buddy/issues/523).

## Authority and validation limits

The operator authorized the most expedient new main delivery under ecosystem194. That replaced waiting for an unassigned historical route. Do not repeat that permission question. Emergency publication is ordinary operator-owned source preservation, not a canonical pipeline receipt or permission to restart stopped jobs. Do not restore lost-host leases/state/private keys or fabricate authenticated old authority.

Keep exact-subject checks and independent Security before Land. After Land, only inspect delivery proof; no retrospective suites, models or repairs. Installation is separate and requires controlled cutover/backups and independent artifact acceptance. Do not merge or activate Safe Refactor under the preservation task. No production DB or real-model tests; preserve assertions, genuine integration contracts and full-suite explicit opt-in with literal glob/concurrency2/timeout180000.

GitHub source excludes credentials, dotenv/runtime secrets, dependency caches and generated build output. Provision fresh operator credentials separately. Conservative secret exclusions are recorded in source metadata; existing public source remains obtainable from its recorded original commit.

## Historical outcomes

PB511/512 were excluded from the original drain; owner merges are not retrospective gate approvals. PB514 original cause remains unproved. Ecosystem177 and144 stopped histories stay truthful. Unauthorized178 broad-trust observations do not become authenticated results. The original machine had installed684473c; this is historical, not installation acceptance on another host.
