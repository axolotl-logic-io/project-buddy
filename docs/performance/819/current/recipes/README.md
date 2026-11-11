# Local diagnostic recipes

Run from `apps/web`, with this worktree's guarded `.env.test`, database/proxy and pinned Chrome 156.0.8078.4 installed. These are archived experimental drivers, not the maintained full audit command. They deliberately use fixed lab observation intervals; they are not deterministic behavior tests.

The drivers write only under `/tmp/pb-current-diag`, except for the temporary `seed-current.local.mts` and build output. Copy `seed.mts.txt` there as `seed-current.mts`; the original first runner needed the fixture script copied into `apps/web` manually. The later paired runner copies and removes it itself. The private fixture file has mode 0600 and is removed by the runner. The final paired input runners expect prior build directories; read their preparation before running them. Do not reset a database used by another run.

Each runner must hold `/tmp/project-buddy-unattended-full-suite.lock` across database preparation, build, server, capture and cleanup. The maintained `audit:performance` runner acquires that lock itself; these separate experimental drivers do not. Do not nest the same lock.

- `run.mjs.txt` with `capture-v1.mjs.txt` produced the first 19-row partial cohort: eighteen Workshop controls and one direct empty-quest observation. The first transition failed the time-origin check.
- `capture-v2.mjs.txt` added one source-menu keyboard action. That action ran before hydration and timed out. Its single direct observation stays separate.
- `input-v3-run.mjs.txt` and `capture-v3.mjs.txt` use the maintained readiness probe for source preparation. They produced 24 input observations and three controlled streams on candidate build `EdH_eq2nPEyGKni-9TT0c`.
- `ablate-run.mjs.txt` and `ablate.mjs.txt` reuse the baseline build and create new synthetic fixtures. The ablation removes DOM links only in the diagnostic browser.
- `pair-run.mjs.txt` made real copies of both builds, but omitted `next.config.ts` in those serving directories. It failed before observations. `pair-run-v2.mjs.txt` reused the same build copies and copied the configuration into both, correcting serving topology. `pair-capture.mjs.txt` then produced forty matched observations. Both builds use the same fixture; each observation gets a fresh browser context.

The temporary capture file was extended with a stream phase after the first process had loaded it. The archived `capture-v1.mjs.txt` reconstructs the loaded version without that unexecuted phase. The stream phase runs only in the later input protocol. Changing a local recipe does not retroactively change a running process's observations.

`reduce.py.txt` validates the exported observations and derives the summary; run it from the repository root after restoring the named raw diagnostic files under `/tmp/pb-current-diag`. It also validates the written compressed bytes. `chart.py.txt` produces the current-source input chart from the complete input cohort. The manifest records source/build provenance and recipe hashes. No recipe reconstitutes a production session or authorizes production capture.
