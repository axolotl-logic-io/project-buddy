# Local constructs

Project Buddy makes no requests to AI model companies. Constructs run a local command engine inspired by multi-user dungeons (MUDs): users type a verb, the harness executes an allowed action, and the construct reports its result.

## Commands

| Command | Result |
| --- | --- |
| `brainstorm` | Enter Brainstorm; save subsequent messages to Ideas. |
| `plan` | Enter Plan; save subsequent messages as open steps. |
| `stop` | Return to Chat without changing existing bucket contents. |
| `help` | List supported commands. |
| `look` | Show the Visual description from the conversation's saved construct, or explain that it has none. |
| `search <query>` | Search the local Blender manual index, save citations and show excerpts. |
| `cast <spell id>` | Use the existing owner-scoped spell tool and save the cast. |

Verbs ignore case and accept an optional leading `/`. Missing arguments get usage instructions. Other messages remain saved and receive command help. Test-only `/mock-*` commands are unavailable in the local engine. Plan edit commands and controls keep their existing path. `/plan` now enters the Plan spell instead of showing an inline form card.

## Retained architecture

`src/replies/model.ts` selects local rules by default, including in production. `src/replies/local-model.ts` owns command behavior. `src/replies/scripted-model.ts` adapts rule outputs to the existing SDK stream protocol. It also transports the opt-in mock scripts used by tests. The SDK does not contact a provider by itself.

Replies keep the existing context assembly, streaming, tool execution, ownership checks and persistence. Search and cast use their existing tool contracts; the engine never dispatches arbitrary tool names or JSON from chat text. No schema migration is needed.

Local replies report zero tokens and bypass provider spend metering. The existing balance check remains part of the harness, so an exhausted account still cannot start a reply. Mock tests retain simulated spending to exercise accounting.

## Initial limits

The engine does not infer intent, interpret prose instructions, understand attached images, infer plans or propose quest-status changes. Conversations keep their chosen construct snapshot. Casting Plan or Brainstorm activates its deterministic routing; the engine does not interpret prose instructions. The saved active spell controls deterministic message capture. Stop [Spell] appears above the composer beside Start the day when offered. Plan, Ideas and Progress live in the collapsible side menu. Each message is one item, up to 200 characters. Longer messages remain in the conversation with feedback. Other commands such as help, search and cast keep their command behavior. New quest openings use the shared greeting request.

Image generation, its Workshop controls and the Image gallery have been removed. Saving a Visual description changes text without spending batteries or replacing artwork. Existing artwork, saved conversation images and uploads remain available. No remote image generation or avatar framing call is made.

## Configuration

Unset `CONSTRUCT_MODEL` or set it to `local`. `mock` remains available outside production for existing test commands. Remote settings, including the former `claude` setting, fail closed. Remove that setting before deploying; no API key is required. The Anthropic and OpenAI provider packages are removed from the app's dependencies.

## Message capture

`src/spells/spell-reply.ts` applies explicit spell commands and routes ordinary messages before the local reply streams. The spell transition or bucket write and its result commit together. `spell_message_results` keeps one result per source message, so a retry reuses the result without adding a duplicate item. Only the conversation's owner can read or write it. Migration 0062 replaces the activity tables with direct spell state and result storage.

Activities and spells now share the [two-spell model](spellbook.md). Only Plan and Brainstorm are offered. The obsolete Activities code and custom spell definitions are removed.
