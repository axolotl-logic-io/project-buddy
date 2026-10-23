# PB v4 preparation controls

## Proposal boundary

This is a fast-only external preparation proposal, not adoption or execution permission. The parent must bind the complete committed source, trusted inputs, target, effective native policy and every external artifact. The unchanged 31-path vector is compatibility evidence only. New preparation metadata does not replace source authority or Security.

## Command order

| Boundary | Prospective action | Refusal |
| --- | --- | --- |
| Shell entry | Validate stage with Bash builtins before external commands | Setup accepts fast only. Check accepts fast/integration. Unset/empty retains fast; other nonempty exits 2. |
| Companion integrity | Isolated Python checks regular ancestry and exact guard/helper/profile hashes, then execs isolated Python guard | No neighboring Python imports, site startup or bytecode cache supplies proposal code. Parent separately binds the shells and host interpreter/standard library. |
| Setup pre-effect | Existing configuration/index/control/lock/tool proof; stat-only dotenv boundary; generated-state inspection | All eight current index mismatches still refuse. Partial/unknown/stale outputs refuse before npm. |
| Dependencies | In this checkout, pinned Node/npm run public HTTPS locked `npm ci --ignore-scripts --no-audit --no-fund` | Empty isolated HOME/config/cache, no credentials/private Git/lifecycle/trust/bootstrap or legacy setup. |
| Preparation | Repeat compatibility, all 16 dotenv absences, installed versions/files and generation-input proof | No metadata required to prove truly fresh absence. Installed prerequisites must exist before generation. |
| Local generation | Only for absent primary/ancillary outputs and absent build markers, write immutable attempt metadata; preload exact installed SWC with Node `--require`; invoke exact installed Next CLI `typegen` in `apps/web` | No build/dev/install/download alternative, no retries or cleanup. The native preload fails before Next evaluates or can enter its fallback. |
| Post-generation | Repeat compatibility/input proof, require five complete regular outputs, hash them, exclusively create provenance sidecar | Changed HEAD/inputs, missing/unknown output or failed generation leaves data for inspection. No deletion, repair, overwrite or retry. |
| Verification | Separate check guard authenticates compatible generation provenance, without generating | Root Biome → counter unchanged package check → web unchanged package check. |

The immutable `pb-typegen-attempt.v4.json` marker is build metadata only. It prevents a failed zero-output generator from becoming another all-absent opportunity. A completed generation retains it and binds its hash. Neither build file is a native receipt, state record, lease, Security grant or source authority. Both live only under the checkout's ignored `apps/web/.next/`, never native state directories.

## Metadata cases

| State | Setup/preparation | Non-generating verification |
| --- | --- | --- |
| All three primary files absent; ancillary files and both build files also absent; no unknown types | Setup permits dependency preparation; preparation may generate after all proofs | HOLD |
| Complete five outputs and both build files; exact matching inputs and output hashes | Recognize prior generation; do not rerun typegen (locked npm preparation still occurs) | Permit retained recipe |
| Any partial output, unknown types, missing sidecar/attempt, old unproven output, failed attempt or mismatch | HOLD; no deletion/regeneration/retry | HOLD |
| Changed HEAD, checkout, routing inventory/entry contents, profile, guard/helper, tool or configuration inputs | HOLD even if the three files are present | HOLD |

The snapshot records HEAD, checkout, exact policy/companion/tool/installed-entry identities, route discovery names and route/metadata entry contents. Route entries must be regular tracked/index-equal. It does not freeze all production/tests/docs or assert that unpinned code matches HEAD. Full source/input/target authority remains parent-bound. A doc-only commit changes HEAD and deliberately invalidates old metadata; v4 offers no automatic refresh route. A mutation of an unrelated unpinned working file might not change the snapshot: complete committed-source authentication and writer quiescence remain necessary. Stat/hash checks are not atomic locks.

## Installed Next order

Actual installed Next 16.4.0 data, not an execution trace:

1. `dist/bin/next:245–253` dispatches typegen and propagates failure as a nonzero exit.
2. `dist/cli/next-typegen.js:76–104` loads config in `PHASE_PRODUCTION_BUILD`, installs bindings, finds app/pages, and runs TypeScript setup with `shouldRunTypeCheck: false`.
3. `dist/server/config.js:1263,1307` calls `loadEnvConfig`, then transpiles TypeScript config. The proposal does not bypass this loader: all 16 dotenv candidates must be absent so no dotenv content is consumed. The reviewed `next.config.ts` is exact SHA-256 `99e4b968369721280e78b16d0a142a5132f8af99ffe69dc6612315096f37915b`: type-only import, literal settings and redirects; no model/DB/network/environment-loader import.
4. `dist/build/next-config-ts/transpile-config.js:111–134` may load SWC while transpiling config, BEFORE the explicit later `installBindings`. Therefore the preload belongs before the entire Next CLI, not merely before route discovery.
5. `dist/build/swc/index.js:234–309,1092–1150` tries installed native code and can download native/WASM fallbacks after failure. v4 preloads the exact installed `.node` file before CLI evaluation, rejects known shadow/native-preview/local-native paths, pins matching package main metadata and native bytes, and sets `NEXT_DISABLE_SWC_WASM=1`. Missing/unloadable preload exits before any Next loader. No custom binding override or monkey patch is used.
6. `dist/lib/verify-typescript-setup.js:81–204` defaults to `experimental.useTypeScriptCli: true`; it checks TypeScript package/CLI plus `@types/react/index.d.ts` and `@types/node/index.d.ts`, can install missing dependencies, and can rewrite tsconfig. v4 proves exact installed TS 5.9.3 package, CLI/bin/API entries and required type metadata/entries first; generator-only `CI=1` also makes missing dependencies a refusal rather than installation. Existing exact tsconfig satisfies the reviewed writer's requirements; post-proof catches changes without restoring them. Verification still omits CI, as v3 did. React DOM types remain required for actual web types too.
7. Typegen writes `next-env.d.ts`, `routes.d.ts`, `validator.ts`, **also** `root-params.d.ts` and `cache-life.d.ts` under this config's defaults. These ancillary files are checked and bound, not silently overwritten. `typedRoutes` is not enabled, so no link.d.ts is expected. Discovery examines route/metadata entries; it does not execute application modules or run tsc.

## Retained execution vector

The 31 source controls, their reasons and all 16 configuration/ignore paths are byte-for-byte unchanged from v3. Compact inventory is identical. No source pin is refreshed. The new profile version, three required-types metadata entries and 26 installed generator/loader/native/TypeScript entry hashes describe preparation only, not new source execution exemptions or an all-dependency attestation.

Root lint retains exactly the three accepted metric exceptions: cognitive complexity, lines per function and lines per file. No new lint/default/compiler/assertion/deadline/concurrency changes occur. Web still runs both complete shell suites and repository plus all six original Vite operations. Broad browser/server/e2e/build/font/visual checks remain opt-ins, not fast evidence.

Standalone integration retains the exact fast → broad Vitest → server-before-Playwright/e2e workers4 recipe and the original supplied regular local/mock/outbox environment guard. **Canonical integration F2 remains HOLD.** Setup still rejects every dotenv candidate, including the separately supplied web `.env.test`; there is no claimed setup-to-test publication interval. Do not configure the pair for integration, disable setup, move dotenv files or widen allowances.

## Runtime assumptions

The fresh environment removes ambient credentials/proxies/model/DB variables, uses empty npm configs and an isolated cache, disables telemetry/browser downloads and sets npm offline for generation/verification. Public HTTPS dependency fetching is setup-only. Npm offline, source fences and native preload are **not an OS network sandbox**. They do not intercept arbitrary dependency sockets, subprocesses or filesystem writes.

The proposal relies on the pinned Node/npm entrypoints and OS runtime, Python standard library and Git binary; lock-integrity-correct npm extraction; intact installed dependency companions/resolution outside the bounded pins; the inspected Next/TypeScript CLI behavior; and no concurrent writers. Direct native preload proves loadability prospectively, not arbitrary native safety. Post-proof detects bounded input mutations but cannot undo effects. A failure leaves the checkout held for parent inspection, never permission to rerun.

Claim-time old saved-checkout compatibility, native setup/readiness timing, committed source composition, cumulative room, concurrency and actual phase startup remain unobserved. This proposal invents no phase route and disables no lane. PR193/install-source choice, exact pre-Land Security and all adoption/install decisions stay with parent/user.
