# Local constructs

Project Buddy makes no requests to AI model companies. Constructs run a local command engine inspired by multi-user dungeons (MUDs): users type a verb, the harness executes an allowed action, and the construct reports its result. The engine runs the same way in every environment, and no model selector or API key exists.

## Commands

| Command | Result |
| --- | --- |
| `brainstorm` | Enter Brainstorm; save subsequent messages to Ideas. |
| `tasks` | Enter Tasks; save subsequent messages as open tasks. |
| `stop` | Return to Chat without changing existing bucket contents. |
| `help` | List supported commands. |
| `look` | Show the Visual description from the conversation's saved construct, or explain that it has none. |
| `cast <spell id>` | Use the existing owner-scoped spell tool and save the cast. |
| `exp` | Show the sender's [experience](experience.md#the-exp-command): their circle and its title, the experience the next circle needs, and their points in each ability. An active spell doesn't save it. |

Verbs ignore case and accept an optional leading `/`. Missing arguments get usage instructions. Other messages remain saved and receive command help. Tasks edit commands and controls keep their own path; `/tasks` enters the Tasks spell.

## Architecture

`src/replies/local-model.ts` owns command behavior, and it plugs into the AI SDK stream protocol without contacting a provider. Replies keep the shared context assembly, streaming, tool execution, ownership checks and persistence. Casts use their tool contract; the engine never dispatches arbitrary tool names or JSON from chat text. Local replies report zero tokens.

## Limits

The engine does not infer intent, interpret prose instructions, understand images, infer tasks or propose quest-status changes. Casting Tasks or Brainstorm activates its deterministic routing, and the saved active spell controls message capture. Stop [Spell] appears above the composer. Each message is one item, up to 200 characters. Longer messages remain in the conversation with feedback. Other commands such as help, cast and exp keep their command behavior.

## Message capture

`src/spells/spell-reply.ts` applies explicit spell commands and routes ordinary messages before the local reply streams. The spell transition or bucket write and its result commit together. `spell_message_results` keeps one result per source message, so a retry reuses the result without adding a duplicate item. Only people the quest is open to can read or write it.

Spellbook offers built-in Tasks and Brainstorm and customizable own spells. See [Spells](spellbook.md) for creation, destinations and active snapshots.
