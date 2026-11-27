# Project Buddy web app

## Tests

With the [local test database](../../docs/project-practices.md#site-tests) and
Playwright Chromium available, run the opt-in Lighthouse audit from `apps/web`.

```sh
npm run audit
npm run audit -- --page quests --samples 1
```

Use `--profile phone|desktop` to select one device profile and `--samples N` to
change the default of three samples per page and profile. The command prints
medians and min–max ranges and writes `summary.json` and Lighthouse JSON reports
to the temporary directory it names. Use `--compare DIR` with a previous run's
directory to see changes against that run. Changes smaller than the previous
range are marked as noise.

## Measure performance

With the same local test database and Chromium available, run this command
from `apps/web` for a performance summary:

```sh
npm run audit:performance
```

The command measures each audited page and action once on phone and desktop
profiles. It reports Largest Contentful Paint (LCP) on cold and warm page loads,
Interaction to Next Paint (INP) on clicks, and Cumulative Layout Shift (CLS).
Navigation rows include the time until the destination content appears.
Product action rows include the approximate time until the browser displays
the expected result. A dash means Lighthouse returned no INP for that click.
The measurements come from a local Chromium run.

To shorten an optimization loop, select a page or action and one device
profile. For a baseline, collect more samples and keep the path printed under
`Audit JSON`. Pass that directory to `--compare` on a later run with the same
filters.

```sh
npm run audit:performance -- --page quests --profile phone
npm run audit:performance -- --action start-performance --profile phone --samples 3
npm run audit:performance -- --action start-performance --profile phone --samples 3 --compare BASELINE_DIR
npm run audit:performance -- --help
```

`BASELINE_DIR` is the directory from the earlier run. Each run writes
`summary.json` with medians, ranges and sample counts, plus the raw Lighthouse
reports.
