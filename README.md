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
npm run db:generate  # generate SQL migrations in drizzle/ from src/db/schema.ts
npm run db:migrate   # apply migrations to the database at DATABASE_URL
```

[Biome](https://biomejs.dev) lints and formats the code; its settings live in `biome.json`. Tailwind class order is checked by the lint rule `useSortedClasses`, not by the formatter, so `npm run format` does not sort classes. To apply the sort, run `npx biome lint --write --unsafe --only=nursery/useSortedClasses`. The editor extension is listed in `.vscode/extensions.json`. Run `npm run check` before committing.

### Database

The app uses Neon Postgres through [Drizzle ORM](https://orm.drizzle.team) and the Neon serverless HTTP driver. Tables are defined in `src/db/schema.ts`, and server code gets the client from `getDb()` in `src/db/client.ts`. Both the app and drizzle-kit read `DATABASE_URL`; see `.env.example`. Put it in `.env.local`, which git ignores, or run `vercel env pull .env.local` once the Vercel project is linked. `npm run db:generate` works without `DATABASE_URL`; `npm run db:migrate` needs it.

### Passphrase

A passphrase protects every page and API route. `src/proxy.ts` (Next.js Proxy, formerly Middleware) admits only `/login` without a session: pages redirect to `/login`, and `/api/*` routes answer 401. The login form checks the passphrase against `SITE_PASSPHRASE` and sets an HTTP-only `session` cookie signed with `SESSION_SECRET`, valid for 30 days. Once one client address enters 5 wrong passphrases within 15 minutes of its first failure, logins from that address are refused until those 15 minutes end. A successful login resets the count. The counts live in the `failed_logins` table. Set both variables in `.env.local` and in the Vercel project; see `.env.example`. Logging in needs `DATABASE_URL` too.

### Tests

Unit tests live next to the code in `src/` as `*.test.tsx` and run with Vitest. End-to-end tests live in `e2e/` as `*.spec.ts` and run with Playwright. Each runner ignores the other's directory.

Before the first e2e run, install the browser once with `npx playwright install chromium`. `npm run test:e2e` runs `npm run build && npm run start` on port 3000. Outside CI it reuses a server that is already running on that port, so stop `npm run dev` first if you want to test the production build. `npm run check` does not run e2e tests, to stay fast.
