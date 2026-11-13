# Spells

Workshop’s Spells tab offers only Plan and Brainstorm. Their pages explain the modes and are read-only. There are no custom spell creation, copy or editing controls. The old /spellbook collection URL redirects to this tab.

## use_case_construct_casts_spell

- **Intent:** Set the conversation’s persistent spell.
- **Prerequisites:** An owned quest conversation.
- **Interaction:** Cast Plan or Brainstorm by id. Cast the other spell to switch, or choose Stop beside the composer.
- **Outcome:** The spell remains active after reopening the conversation. Plan routes ordinary messages into open Plan steps; Brainstorm routes them into Ideas. Reply instructions list only these two spells. Cast results save the spell’s identity. Unknown ids cannot be cast. Chat refuses these spells because it has no quest buckets.
- **Related:** [Message capture](ideas.md#use_case_spell_buckets).
