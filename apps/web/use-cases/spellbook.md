# Spells

Workshop’s Spells tab offers built-in Plan and Brainstorm and the user's private spells. Built-in pages are read-only and offer Make a copy. Own spells can be created, edited, copied and retired.

## use_case_construct_casts_spell

The user sets the conversation's persistent spell.

- **Prerequisites:** an owned quest conversation.
- **Steps:** choose a built-in or own spell in the sidebar and cast it, or send `cast <spell name>`. `plan` and `brainstorm` cast the built-ins. Cast another spell to switch, or choose Stop [Spell] above the composer or send `stop`.
- **Outcome:** the spell remains active after reopening. Its saved destination routes ordinary messages into open Plan steps or Ideas. A cast saves the name, replies and destination; subsequent definition edits or retirement do not alter the active snapshot. Unknown, foreign and retired definitions cannot be cast. A conversation without a quest refuses spells because it has no quest buckets. Spell names are matched without regard to case or repeated whitespace. Duplicate names must be renamed before casting.
- **Next:** [Message capture](ideas.md#use_case_spell_buckets), [custom spells](workshop.md#use_case_customize_spell).
