# Project Buddy

Project Buddy is a web app that turns doing tasks and brainstorming into an adventure.

[Glossary](docs/GLOSSARY.md)

## Local development

Install mise and Docker with Compose, then start Docker. From the repository root, run:

```sh
mise trust
mise install
mise run setup
mise run dev
```

In another terminal, run `mise run sign-in-link` and open the printed link to sign in to the local site. Each branch has a development database of its own, made and migrated when you run `mise run dev`. `mise tasks` lists every task, and `mise run db:prune` drops the databases of deleted branches.

## Tests

```sh
mise run lint
mise run test
```

`mise run test` runs the full suite: the fast checks, the server tests, the Vitest browser tests and the Playwright tests, in parallel. The database tests need the database servers that `mise run setup` starts (`mise run //apps/web:db:up` starts them again); each suite makes its own [test database](docs/project-practices.md#site-tests).

If a stage fails, run the rerun commands the summary prints. Run `mise run test` again after fixing the failures. To run only the browser and Playwright suites, use `mise run test:e2e`.

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
