# Spells

Plan and Brainstorm are the only spells. Each owned quest conversation has one active spell or none. New conversations start with none.

| Command | Result |
| --- | --- |
| `plan` or `cast plan` | Save subsequent ordinary messages as open Plan steps. |
| `brainstorm` or `cast brainstorm` | Save subsequent ordinary messages in Ideas. |
| `stop` | Clear the active spell. |

Commands ignore case and accept an optional leading `/`. Casting the other spell switches future capture without moving existing items. **Stop Plan** or **Stop Brainstorm** appears beside the composer, next to Start the day when offered. Reopening the quest preserves its active spell. Standalone Chat has no quest buckets and refuses casts.

Each message becomes one item of at most 200 characters. Commands bypass capture. Plan capacity and text validation failures leave the conversation message saved with feedback. Bucket writes and a saved result commit together, so retries add no duplicate item.

Workshop has Constructs and Spells tabs. Spells opens read-only explanations; it has no creation, copy, editing or retirement controls. There is no Activities catalog.

## Implementation

`src/spells/spell.ts` defines the two spells. `spell-store.ts` reads and sets the nullable `chats.spell` column through owner-scoped queries. `spell-reply.ts` handles explicit commands and capture. `spell_message_results` records each handled message’s result. The `cast_spell` tool changes the same state and saves the spell identity. Reply context lists the two descriptions and names the active spell.

Migration 0062 removes activity session and message-result tables, obsolete activity and custom spell definitions, and their retired Marketplace listings. It creates direct spell state and result storage without translating old data. This is a destructive simplification, requiring the matching build at release; it is not compatible with the older build that reads activity sessions.
