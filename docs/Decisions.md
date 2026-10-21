# Decisions

Each decision has a stable slug that issues and code comments use to refer to it. Entries state the current choice, its source and the rationale or rejected alternatives that still matter. Known gaps and deferred choices stay explicit; completed rollout history does not belong here.

"Axlog" marks a decision by the project's owner; "orchestrator" marks one made by the agent running the build, which stands until Axlog reverses it. The current contribution rules live in the [coding practices](coding-practices.md) and [project practices](project-practices.md); these pages explain the decisions behind them. See [`agents-md-holds-the-rules`](Decisions-Code-and-tooling.md#agents-md-holds-the-rules) for the current rules and retired guidance.

Paths are relative to `apps/web/` unless they name a root file ([`monorepo-layout`](Decisions-Code-and-tooling.md#monorepo-layout)). Link to a decision as `[slug](Decisions-<Section>.md#slug)`; issues and code comments may name the slug alone.

## [Product and tutor](Decisions-Product.md)

- [`manual-only`](Decisions-Product.md#manual-only)
- [`manual-via-git-clone`](Decisions-Product.md#manual-via-git-clone)
- [`latest-stable-manual`](Decisions-Product.md#latest-stable-manual)
- [`keyword-search-agentic`](Decisions-Product.md#keyword-search-agentic)
- [`project-memory-shared-text`](Decisions-Product.md#project-memory-shared-text)
- [`use-case-behavior-rulings`](Decisions-Product.md#use-case-behavior-rulings)
- [`project-interview-rulings`](Decisions-Product.md#project-interview-rulings)
- [`haiku-chat-names`](Decisions-Product.md#haiku-chat-names)
- [`working-notes-quiet`](Decisions-Product.md#working-notes-quiet)
- [`central-chat`](Decisions-Product.md#central-chat)
- [`not-found-is-200`](Decisions-Product.md#not-found-is-200)
- [`claude-via-ai-sdk`](Decisions-Product.md#claude-via-ai-sdk)
- [`anthropic-prompt-caching`](Decisions-Product.md#anthropic-prompt-caching)

## [Personas](Decisions-Personas.md)

- [`persona-spoof-names`](Decisions-Personas.md#persona-spoof-names)
- [`personas-as-text`](Decisions-Personas.md#personas-as-text)
- [`personas-and-prompts-rulings`](Decisions-Personas.md#personas-and-prompts-rulings)
- [`no-banned-lists`](Decisions-Personas.md#no-banned-lists)
- [`name-placeholder`](Decisions-Personas.md#name-placeholder)
- [`buddies-schema-rename`](Decisions-Personas.md#buddies-schema-rename)

## [Accounts, quota and releases](Decisions-Accounts.md)

- [`admin-email-invitations`](Decisions-Accounts.md#admin-email-invitations)
- [`passphrase-gated-email-sign-in`](Decisions-Accounts.md#passphrase-gated-email-sign-in)
- [`resend-for-email`](Decisions-Accounts.md#resend-for-email)
- [`private-user-data`](Decisions-Accounts.md#private-user-data)
- [`claude-spend-quota`](Decisions-Accounts.md#claude-spend-quota)
- [`release-workflow`](Decisions-Accounts.md#release-workflow)
- [`integration-branch`](Decisions-Accounts.md#integration-branch)

## [Site and UI](Decisions-Site-and-UI.md)

- [`suspense-via-segment-conventions`](Decisions-Site-and-UI.md#suspense-via-segment-conventions)
- [`header-links-slot`](Decisions-Site-and-UI.md#header-links-slot)
- [`chat-ui-assistant-ui`](Decisions-Site-and-UI.md#chat-ui-assistant-ui)
- [`adopt-radix-ui`](Decisions-Site-and-UI.md#adopt-radix-ui)
- [`chat-ui-flags-and-mobile`](Decisions-Site-and-UI.md#chat-ui-flags-and-mobile)
- [`chat-project-filter-contract`](Decisions-Site-and-UI.md#chat-project-filter-contract)
- [`reload-during-reply-known-gap`](Decisions-Site-and-UI.md#reload-during-reply-known-gap)
- [`site-themes`](Decisions-Site-and-UI.md#site-themes)
- [`theme-spacing-token`](Decisions-Site-and-UI.md#theme-spacing-token)
- [`theme-heading-sizes`](Decisions-Site-and-UI.md#theme-heading-sizes)
- [`fixed-width-times`](Decisions-Site-and-UI.md#fixed-width-times)

## [Code and tooling](Decisions-Code-and-tooling.md)

- [`test-code-in-test`](Decisions-Code-and-tooling.md#test-code-in-test)
- [`agents-md-holds-the-rules`](Decisions-Code-and-tooling.md#agents-md-holds-the-rules)
- [`plan-retired`](Decisions-Code-and-tooling.md#plan-retired)
- [`practices-cover-all-code`](Decisions-Code-and-tooling.md#practices-cover-all-code)
- [`aposd-and-strict-typing`](Decisions-Code-and-tooling.md#aposd-and-strict-typing)
- [`biome-for-lint-and-format`](Decisions-Code-and-tooling.md#biome-for-lint-and-format)
- [`biome-infos-fail`](Decisions-Code-and-tooling.md#biome-infos-fail)
- [`biome-config-authoritative`](Decisions-Code-and-tooling.md#biome-config-authoritative)
- [`biome-drizzle-meta-exclusion`](Decisions-Code-and-tooling.md#biome-drizzle-meta-exclusion)
- [`best-practice-over-lint`](Decisions-Code-and-tooling.md#best-practice-over-lint)
- [`biome-css-class-rules`](Decisions-Code-and-tooling.md#biome-css-class-rules)
- [`use-cases-drive-tests`](Decisions-Code-and-tooling.md#use-cases-drive-tests)
- [`e2e-visual-and-auth-only`](Decisions-Code-and-tooling.md#e2e-visual-and-auth-only)
- [`e2e-test-database-speed`](Decisions-Code-and-tooling.md#e2e-test-database-speed)
- [`flakes-are-failures`](Decisions-Code-and-tooling.md#flakes-are-failures)
- [`web-tests-under-load`](Decisions-Code-and-tooling.md#web-tests-under-load)
- [`browser-deps-prebundled`](Decisions-Code-and-tooling.md#browser-deps-prebundled)
- [`served-syntax-check`](Decisions-Code-and-tooling.md#served-syntax-check)
- [`biome-overload-false-positive`](Decisions-Code-and-tooling.md#biome-overload-false-positive)
- [`gitguardian-false-positive`](Decisions-Code-and-tooling.md#gitguardian-false-positive)
- [`monorepo-layout`](Decisions-Code-and-tooling.md#monorepo-layout)
