# project-buddy

project-buddy is a personal Next.js site that teaches Blender, the open-source 3D creation suite.

## Development

Node is pinned to 24 via `mise.toml`. Run `mise install` once, then use mise shell activation or prefix commands with `mise exec --`.

```bash
npm install          # install dependencies
npm run dev          # start the dev server at http://localhost:3000
npm test             # run unit tests once (Vitest)
npm run test:watch   # run unit tests in watch mode
npm run test:e2e     # build, start and run end-to-end tests (Playwright, Chromium)
npm run lint         # lint with Biome; any warning fails the run
npm run typecheck    # type-check with tsc --noEmit
npm run format       # format with Biome (writes files)
npm run format:check # verify formatting without writing
npm run check        # lint, typecheck, format:check, then test; stops at the first failure
npm run build        # production build
```

[Biome](https://biomejs.dev) lints and formats the code; its settings live in `biome.json`. Tailwind class order is checked by the lint rule `useSortedClasses`, not by the formatter, so `npm run format` does not sort classes. To apply the sort, run `npx biome lint --write --unsafe --only=nursery/useSortedClasses`. The editor extension is listed in `.vscode/extensions.json`. Run `npm run check` before committing.

### Tests

Unit tests live next to the code in `src/` as `*.test.tsx` and run with Vitest. End-to-end tests live in `e2e/` as `*.spec.ts` and run with Playwright. Each runner ignores the other's directory.

Before the first e2e run, install the browser once with `npx playwright install chromium`. `npm run test:e2e` runs `npm run build && npm run start` on port 3000. Outside CI it reuses a server that is already running on that port, so stop `npm run dev` first if you want to test the production build. `npm run check` does not run e2e tests, to stay fast.
