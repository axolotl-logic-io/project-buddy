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
