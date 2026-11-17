# Dependency security overrides

Run `npm ci` at the root to install the workspace lockfile, then `npm audit`.
Audit the complete tree, including development tools: the Vercel CLI runs the
preview and production builds. `npm audit` must report 0 vulnerabilities at
every severity.

## Vercel CLI

`apps/web/package.json` pins Vercel 65.16.0. It still pins vulnerable transitive
packages, so the root `package.json` scopes security overrides to **Vercel's
subtree**, not to the site's runtime or the other apps.

| Dependency | Replacement | Reason |
| --- | --- | --- |
| `@vercel/cli-config` | 0.4.0 | Replace 0.3.1, which `@vercel/blob` and `@vercel/sandbox` reach through older `@vercel/oidc` pins, with the release Vercel's CLI uses. It only adds exports and depends on a patched zod. |
| `@vercel/nft` | 1.11.5 | Move file tracing to glob 14, which fixes the AbortSignal traversal bypass and uses minimatch 11. Vercel pins 1.10.0, which uses glob 13. |
| `ajv` | 8.20.0 | Fix the `$data` regular-expression denial of service. |
| Vulnerable `esbuild` 0.27/0.28 releases | 0.28.2 | Fix the Windows development-server file disclosure; leave unaffected pins alone. |
| `js-yaml` | 4.3.2 | Fix YAML merge/alias denial-of-service cases without moving to v5. |
| `minimatch` 7 to 11.0.0 | 11.0.9 | Fix pathological wildcard, extglob and globparts matching. No 10.x release fixes the globparts case. The one direct caller, `@vercel/python-analysis`, uses `match()`, which v11 keeps. |
| `path-to-regexp` v6 / v8 | 6.3.0 / 8.4.2 | Fix routing regular-expression denial of service while preserving each consumer's major API. |
| `smol-toml` | 1.9.1 | Fix malformed-input and long-comment denial of service. |
| `tar` | 7.5.23 | Fix archive parser denial of service and header interpretation issues. |
| `undici` below 6.29.1 | 6.29.1 | Fix HTTP, cookie and WebSocket vulnerabilities, and drop the vulnerable `@fastify/busboy` that undici 5 bundles. This crosses v5 to v6 because the old pins have no complete backport. Unaffected v6/v7/v8 consumers keep their versions. |
| `zod` below 4.6.6 | 4.6.7 | Fix memory exhaustion while validating large arrays. Every zod 3 release is affected. `@vercel/backends` and `@vercel/python-analysis` pin zod 3.22.4, and their schemas use only APIs that zod 4 keeps, including the one-argument `z.record()`. |

The compatibility-sensitive replacements are `undici`, `zod`, `minimatch` and
`@vercel/nft`. When changing them, resolve the dependencies from Vercel's own
packages (not from a possibly different hoisted copy) and check:

- Vercel's HTTP client, as `@vercel/node` and `@vercel/cli-support` resolve
  it, sends multipart form data, follows a redirect, supports `request` with an
  `Agent`, and constructs a `ProxyAgent`, against a loopback-only test server.
- `@vercel/python-analysis` discovers a `pyproject.toml` project, parses a
  requirements file, and validates and rejects a Pipfile. Load its CommonJS
  build: the ES module build fails to import `fs-extra` on its own.
- `@vercel/backends` loads.
- `@vercel/nft` traces the files that a wildcard `path.join` reads.
- Vercel's static-config reader extracts a valid config, returns null without
  one, and rejects an invalid config. Use an in-memory `ts-morph` project so
  the disk-based fast path fails and Vercel exercises its parser fallback.
- The CLI starts and exposes the deployment options (`--version`,
  `deploy --help`). Do not deploy or connect to production to test dependencies.

When Vercel updates its pins, remove overrides individually and verify
`npm ci`, `npm ls --all`, `npm audit`, the site's `npm run check` and
`npm run test:e2e`. Do not use `npm audit fix --force`: its proposed Vercel
version change is not a compatibility-tested upgrade.

npm keeps a version that the lockfile already records even when a new override
rules it out, and `npm ls` then reports it as invalid. To apply a changed
override, delete the affected entries from `package-lock.json` and run
`npm install` again.

## drizzle-kit

The root `package.json` also overrides `esbuild` to `^0.25.12` under
`@esbuild-kit/core-utils`, which drizzle-kit pulls in, to clear
GHSA-67mh-4wv8-2f99. drizzle-kit doesn't load `@esbuild-kit` when it runs.
