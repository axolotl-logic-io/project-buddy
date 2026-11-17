# Spell definitions

Spells have editable names, message destinations and reply lists. The editor shows Message destination directly below Name, followed by **Spell Messages**. Cast a spell by its name, such as `cast Alstorm`. Matching ignores case and repeated whitespace. If several available spells have the same name, rename one before casting.

The spell editor has no prose Instructions, Prompt or Character Sheet field, because the local engine does not interpret them. Stored construct prompt text is not editable or included in reply context.

`own_prompts` stores owner-scoped spells and historical custom construct records. Removing custom constructs does not delete these rows or change their schema. Built-in constructs and saved conversation snapshots still use the construct definition parser. The local command engine interprets explicit commands and uses spell destinations and reply templates. See [Spells](spellbook.md) for snapshot and reply-list behavior.

New accounts require a name when confirming the emailed signup link from Login. Profile can change the name but cannot clear it. Existing accounts sign in without repeating the name step.
