# Dependency security overrides

Run `npm ci` at the root to install the workspace lockfile, then `npm audit`.
Audit the complete tree, including development tools: the Vercel CLI runs the
preview and production builds.

## Vercel CLI

`apps/web/package.json` pins Vercel 64.5.0. It still pins vulnerable transitive
packages, so the root `package.json` scopes security overrides to **Vercel's
subtree**, not to the site's runtime or the other apps.

| Dependency | Replacement | Reason |
| --- | --- | --- |
| `ajv` | 8.20.0 | Fix the `$data` regular-expression denial of service. |
| Vulnerable `esbuild` 0.27/0.28 releases | 0.28.1 | Fix the Windows development-server file disclosure; leave unaffected pins alone. |
| `js-yaml` | 4.3.2 | Fix YAML merge/alias denial-of-service cases without moving to v5. |
| `minimatch` v10 | 10.2.6 | Fix pathological wildcard and extglob matching. |
| `path-to-regexp` v6 / v8 | 6.3.0 / 8.4.2 | Fix routing regular-expression denial of service while preserving each consumer's major API. |
| `smol-toml` | 1.9.1 | Fix malformed-input and long-comment denial of service. |
| `tar` | 7.5.22 | Fix archive parser denial of service and header interpretation issues. |
| `ts-morph` | 27.0.2 | Remove the old `fast-glob` → `micromatch` → `braces` chain. `braces` has no patched release. This version uses TypeScript 5.9, matching the site's compiler. |
| `undici` below 6.28.1 | 6.29.1 | Fix HTTP, cookie and WebSocket vulnerabilities. This crosses v5 to v6 because the old pins have no complete backport. Unaffected v6/v7/v8 consumers keep their versions. |

The two compatibility-sensitive replacements are `ts-morph` and `undici`.
When changing them, resolve the dependencies from Vercel's own package (not
from a possibly different hoisted copy) and check:

- Vercel's static-config reader extracts a valid config, returns null without
  one, and rejects an invalid config. Use an in-memory `ts-morph` project so
  the disk-based fast path fails and Vercel exercises its parser fallback.
- Vercel's HTTP client sends multipart form data, follows a redirect, and
  supports `request` with an `Agent`, against a loopback-only test server.
- The CLI starts and exposes the deployment options (`--version`,
  `deploy --help`). Do not deploy or connect to production to test dependencies.

When Vercel updates its pins, remove overrides individually and verify
`npm ci`, `npm ls --all`, `npm audit`, the site's `npm run check` and
`npm run test:e2e`. Do not use `npm audit fix --force`: its proposed Vercel
major downgrade is not a compatibility-tested upgrade.

## drizzle-kit

The root `package.json` also overrides `esbuild` to `^0.25.12` under
`@esbuild-kit/core-utils`, which drizzle-kit pulls in, to clear
GHSA-67mh-4wv8-2f99. drizzle-kit doesn't load `@esbuild-kit` when it runs.
