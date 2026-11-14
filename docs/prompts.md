# Workshop definitions

Constructs have editable names and Visual descriptions. Their saved name and appearance are used when starting a quest. The local `look` command reads the Visual description from that conversation’s snapshot. Built-in constructs are read-only; Make a copy opens an editable own construct.

Spells have editable names, message destinations and reply lists. The editor shows Message destination directly below Name, followed by **Spell Messages**. Cast a spell by its name, such as `cast Alstorm`. Matching ignores case and repeated whitespace. If several available spells have the same name, rename one before casting.

Prose Instructions, Prompt and Character Sheet fields and their reset controls have been removed from both editors because the local engine does not interpret them. Old construct prompt text may remain in storage, but it is not editable or included in reply context. Spell definitions discard that field.

`own_prompts` stores owner-scoped constructs and spells. The local command engine interprets explicit commands and uses spell destinations and reply templates. See [Spells](spellbook.md) for snapshot and reply-list behavior.

New accounts require a name when confirming the emailed signup link from Login. Settings can change the name but cannot clear it. Existing accounts sign in without repeating the name step.
