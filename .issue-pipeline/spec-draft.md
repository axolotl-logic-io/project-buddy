# Spec draft for #386 (unfinished; see handoff.md)

## Behaviour
1. When a browser test project's Vite server (`browser`, `browser-<zone>`, `browser-touch`) serves to the browser a JavaScript module that doesn't parse as an ES module, it logs an error through Vite's logger naming the module's file relative to `apps/web/`, the line and column (from 1) of the first parse error in the served (transformed) code as `file:line:column`, the parser's message, and the lines around it (at least the line before, the line itself, the line after).
2. The check sees the code after every plugin, including plugins that transform after its own (Vitest's `vitest:browser:esm-injector` runs after the projects' own post hooks).
3. The check changes nothing that is served: a broken module is still served as transformed, and a module that parses is served as before and logs nothing.
4. Every browser project (`test.browser.enabled`) in `vitest.config.mts` has the check among its plugins (via `BROWSER_PROJECT`).
5. Cause: not proven. Ruled out: #375's case, a shared transform cache, a race of concurrent transforms of one mocked file (evidence in wiki `served-syntax-check`). No speculative fix ships. No test's assertions change.

## Design
- New `apps/web/vitest.browser-syntax.mts`, export `servedSyntaxCheck(): Plugin` (stub committed). Suggested: in `configureServer(server)`, wrap `server.environments.client.transformRequest` so each result (skip direct CSS `?direct`) is parsed once with `parseAst` from `vitest/node` (WeakSet of checked results); on a parse error (`err.pos`, UTF-16 offset) log via `server.config.logger.error` and return the result unchanged. A `transform` post hook can't see the injector's output (verified: a post/post probe saw hoisted code but no `wrapDynamicImport`).
- Wire in `apps/web/vitest.config.mts:13` (import) and `:56` (`BROWSER_PROJECT.plugins`).
- Practices: CONTRIBUTING Design/Types/Lint (no `any`, no `as`, explicit types, exports last, 50-line functions), `flakes-are-failures`, `no-load-repro-in-issues`, `browser-deps-prebundled`, new wiki decision `served-syntax-check`.

## Tests (committed, `apps/web/vitest.browser-syntax.test.mts`, fail on the stub's throw)
- "is reported with its position and the lines around it" → B1, B2 (break plugin listed after the check).
- "is still served as transformed" → B3.
- "a served module that parses is not reported" → B3.
- "every browser project serves through the check" → B4.

## Wiki updates
`Decisions-Code-and-tooling.md` (new `served-syntax-check`, pointer in `browser-deps-prebundled`), `Decisions.md` index.

<!-- draft, not the final spec -->
