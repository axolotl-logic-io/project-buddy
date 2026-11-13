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

Verbs ignore case and accept an optional leading `/`. Missing arguments get usage instructions. Other messages remain saved and receive command help. Plan edit commands and controls keep their existing path. `/plan` now enters the Plan spell instead of showing an inline form card.

## Retained architecture

`src/replies/model.ts` uses local rules in every environment. `src/replies/local-model.ts` owns command behavior. `src/replies/scripted-model.ts` adapts rule outputs to the existing SDK stream protocol. The SDK does not contact a provider by itself.

Replies keep the existing context assembly, streaming, tool execution, ownership checks and persistence. Search and cast use their existing tool contracts; the engine never dispatches arbitrary tool names or JSON from chat text. No schema migration is needed.

Local replies report zero tokens and bypass provider spend metering. The existing balance check remains part of the harness, so an exhausted account still cannot start a reply. Historical accounting tests record costs directly, while local reply tests assert zero spending.

## Initial limits

The engine does not infer intent, interpret prose instructions, understand attached images, infer plans or propose quest-status changes. Conversations keep their chosen construct snapshot. Casting Plan or Brainstorm activates its deterministic routing; the engine does not interpret prose instructions. The saved active spell controls deterministic message capture. Stop [Spell] appears above the composer. Plan, Ideas and Progress are tabs at the top of the collapsible sidebar. Each message is one item, up to 200 characters. Longer messages remain in the conversation with feedback. Other commands such as help, search and cast keep their command behavior. New quest openings use the shared greeting request.

Image generation, its Workshop controls and the Image gallery have been removed. Saving a Visual description changes text without spending batteries or replacing artwork. Existing artwork and saved conversation images remain available; the composer accepts text only. No remote image generation or avatar framing call is made.

## Configuration

No model selector or API key is required. The local engine runs in every environment. The former mock engine and its command catalog have been removed. Tests use local commands and call tool handlers directly.

## Message capture

`src/spells/spell-reply.ts` applies explicit spell commands and routes ordinary messages before the local reply streams. The spell transition or bucket write and its result commit together. `spell_message_results` keeps one result per source message, so a retry reuses the result without adding a duplicate item. Only the conversation's owner can read or write it. Migration 0062 adds direct spell state and result storage while retaining legacy activity tables for the previous build during rollout.

Activities and spells now share the [two-spell model](spellbook.md). Only Plan and Brainstorm are offered. The obsolete Activities code and custom spell definitions are removed.

## Test audit

The retired mock command catalog, prompt echo, recall, delayed replies and simulated token charges are removed. The tests use real local commands for search, spell transitions and message persistence. Prompt context and conversation-window tests inspect the real assembly directly. Tool contract tests call the registered handlers without a model simulator. Rich Markdown tests use fixed saved content. Cancellation and execution-failure tests retain small, explicit stream doubles; duplicate reply claims use event barriers instead of delays.

Local reply tests assert zero battery spending. Historical accounting, image delivery, retained artwork and owner isolation still have real database coverage. Reset tests cover fresh conversations, reopened Plan steps, retained Ideas and Progress, and the ownership of retained artwork.
