# Prompts

A construct has a name and a prompt describing its voice and habits. Its editor shows the Prompt field under Instructions. The Character Sheet heading organizes that text. The separate Visual description describes its appearance. Built-in constructs are read-only; Make a copy creates an editable own construct.

Workshop offers Constructs and Spells. Only constructs have editable definitions. Plan and Brainstorm are fixed conversation modes with descriptions, not prompts or custom definitions. See [Spells](spellbook.md).

Reset prompt to default changes the editor draft and offers Undo reset. Only Save changes the stored prompt. Reset restores the source built-in prompt or the default construct prompt. Unsaved names and visual descriptions stay intact. Browser drafts preserve unsaved edits for that user and definition until Save or Cancel.

Saving instructions makes no model call and spends no batteries. A conversation keeps the construct snapshot chosen at its start; later edits apply to future conversations. `{{name}}` stays literal in storage and is replaced with the user’s name when assembling reply context.

`own_prompts` stores own constructs. Its JSON codec validates their prompt and optional visual metadata. There is no activity definition, custom spell definition or historical built-in matching layer. Quest openings use a shared brief greeting request with the selected construct and quest context, and new conversations have no active spell.

The local command engine interprets explicit commands, not prompt prose. [Local constructs](local-constructs.md) describes the available behavior; [Library](library.md) maps the reply context and tool protocol to their sources.
