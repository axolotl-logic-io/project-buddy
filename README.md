# Project Buddy

Project Buddy is a web app that turns doing tasks and brainstorming into an adventure.

[Glossary](docs/GLOSSARY.md)

## Local development

Install mise and Docker with Compose, then start Docker. From the repository root, run:

```sh
mise trust
mise install
mise setup
mise //apps/web:dev
```

In another terminal, run `mise run sign-in-link` and open the printed link to sign in to the local site.

## Tests

```sh
mise run lint
mise run test
```

`npm test` (also `mise run test`) runs the full suite. It runs the fast checks, Vitest browser tests, and database-backed tests in parallel. The database lane runs the server tests before Playwright. Set up the [local test database](docs/project-practices.md#site-tests) before running the full suite.

If a stage fails, copy its rerun commands from the summary and run them from the repository root. Run `npm test` again after fixing the failures. To run only the browser and Playwright suites, use `mise run test:e2e`.

## Production database

After signing in with `vercel login`, run these commands from the repository root:

```sh
mise run ops:link
mise run ops:env production
mise run ops:query production "select count(*) from quests"
```

`ops:link` links the local checkout to the Project Buddy Vercel project.
`ops:env` saves the environment variables to a private file outside the checkout.
`ops:query` uses that file to run one SQL statement in a read-only transaction and prints the rows as JSON.
`ops:env` and `ops:query` also accept `preview` and `development`.
