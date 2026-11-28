# Project Buddy web app

## Tests

With the [test database server](../../docs/project-practices.md#site-tests)
running and Playwright Chromium installed, run the opt-in Lighthouse audit.

```sh
mise run //apps/web:audit
mise run //apps/web:audit --page quests --samples 1
```

Use `--profile phone|desktop` to select one device profile and `--samples N` to
change the default of three samples per page and profile. The command prints
medians and min–max ranges and writes `summary.json` and Lighthouse JSON reports
to the temporary directory it names. Use `--compare DIR` with a previous run's
directory to see changes against that run. Changes smaller than the previous
range are marked as noise.

## Measure performance

With the same test database server and Chromium, run this command for a
performance summary:

```sh
mise run //apps/web:audit:performance
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
mise run //apps/web:audit:performance --page quests --profile phone
mise run //apps/web:audit:performance --action start-performance --profile phone --samples 3
mise run //apps/web:audit:performance --action start-performance --profile phone --samples 3 --compare BASELINE_DIR
mise run //apps/web:audit:performance --help
```

`BASELINE_DIR` is the directory from the earlier run. Each run writes
`summary.json` with medians, ranges and sample counts, plus the raw Lighthouse
reports.
