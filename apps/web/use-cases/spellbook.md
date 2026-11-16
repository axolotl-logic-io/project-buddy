# Spells

Workshop’s Spells tab offers built-in Tasks and Brainstorm and the user's private spells. Built-in pages are read-only and offer Make a copy. Own spells can be created, edited, copied and retired.

## use_case_construct_casts_spell

The user sets the conversation's persistent spell.

- **Prerequisites:** a quest conversation open to the user, as its owner or a member; a cast or Stop applies to everyone in the quest.
- **Steps:** choose a built-in or own spell in the quest sidebar's Actions tab and cast it, which sends `cast <spell name>` to the conversation, or type that message. `tasks` and `brainstorm` cast the built-ins. Cast another spell to switch, or choose Stop [Spell] above the composer, which sends `stop`, or type `stop`.
- **Outcome:** the spell remains active after reopening. Its saved destination routes ordinary messages into open tasks or Ideas. A cast saves the name, replies and destination; subsequent definition edits or retirement do not alter the active snapshot. Unknown, foreign and retired definitions cannot be cast. A conversation without a quest refuses spells because it has no quest buckets. Spell names are matched without regard to case or repeated whitespace. Duplicate names must be renamed before casting. Casting while another spell is active replaces it; casting the active spell again keeps it.
- **Next:** [Message capture](ideas.md#use_case_spell_buckets), [custom spells](workshop.md#use_case_customize_spell).
