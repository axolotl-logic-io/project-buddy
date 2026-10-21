# Decisions: Claude

Part of [Decisions](Decisions.md). Each decision has a name, which issues and code comments use to refer to it.

## `claude-via-ai-sdk`

Claude, through the Vercel AI SDK with Axlog's Anthropic API key, powers the tutor. The model ids live in the tutor module: `claude-sonnet-5-5` for replies and openings, `claude-haiku-5-5` for chat names.

## `anthropic-prompt-caching`

Anthropic prompt caching, through the AI SDK, stays hidden inside `src/tutor/` (Axlog, 2026-10-10). It roughly halves the cost of search-heavy questions.
