# Spell definitions

Spells have editable names, message destinations and reply lists. Cast a spell by its name, such as `cast Alstorm`. Matching ignores case and repeated whitespace. If several available spells have the same name, rename one before casting.

The spell editor has no prose Instructions, Prompt or Character Sheet field, because the local engine does not interpret them.

`own_prompts` stores owner-scoped spells. Every stored spell has all four reply lists. Constructs are built in, and each conversation stores only its construct id. The local command engine interprets explicit commands and uses spell destinations and reply templates. See [Spells](spellbook.md) for snapshot and reply-list behavior.

New accounts require a name when confirming the emailed signup link from Login. Profile can change the name but cannot clear it.
