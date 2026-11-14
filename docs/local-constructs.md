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
| `cast <spell id>` | Use the existing owner-scoped spell tool and save the cast. |

Verbs ignore case and accept an optional leading `/`. Missing arguments get usage instructions. Other messages remain saved and receive command help. Plan edit commands and controls keep their own path; `/plan` enters the Plan spell.

## Architecture

`src/replies/model.ts` uses local rules in every environment. `src/replies/local-model.ts` owns command behavior. `src/replies/scripted-model.ts` adapts rule outputs to the AI SDK stream protocol. The SDK doesn't contact a provider.

Replies keep the shared context assembly, streaming, tool execution, ownership checks and persistence. Casts use their tool contract; the engine never dispatches arbitrary tool names or JSON from chat text. Local replies report zero tokens.

## Limits

The engine does not infer intent, interpret prose instructions, understand images, infer plans or propose quest-status changes. Conversations keep their chosen construct snapshot. Casting Plan or Brainstorm activates its deterministic routing, and the saved active spell controls message capture. Stop [Spell] appears above the composer. Plan, Ideas, Progress, Quick Notes and Actions are tabs at the top of the collapsible sidebar. Each message is one item, up to 200 characters. Longer messages remain in the conversation with feedback. Other commands such as help and cast keep their command behavior. New quest openings use the shared greeting request.

The composer accepts text only. Saving a Visual description changes text without replacing artwork. Existing artwork and saved conversation images remain readable.

## Configuration

No model selector or API key is required. The local engine runs in every environment. Tests use local commands and call tool handlers directly.

## Message capture

`src/spells/spell-reply.ts` applies explicit spell commands and routes ordinary messages before the local reply streams. The spell transition or bucket write and its result commit together. `spell_message_results` keeps one result per source message, so a retry reuses the result without adding a duplicate item. Only the conversation's owner can read or write it.

Workshop offers built-in Plan and Brainstorm and customizable own spells. See [Spells](spellbook.md) for creation, destinations and active snapshots.

## Tests

The tests use real local commands for spell transitions and message persistence. Prompt context and conversation-window tests inspect the real assembly directly. Tool contract tests call the registered handlers without a model simulator. Rich Markdown tests use fixed saved content. Cancellation and execution-failure tests use small, explicit stream doubles; duplicate reply claims use event barriers instead of delays.

Local reply tests cover command guidance and replies. Image delivery, retained artwork and owner isolation have real database coverage. Reset tests cover fresh conversations, reopened Plan steps, retained Ideas and Progress, and the ownership of retained artwork.
