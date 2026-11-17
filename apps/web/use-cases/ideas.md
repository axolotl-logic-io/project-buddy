# Ideas

## use_case_quest_ideas

- **Intent:** Keep possibilities apart from agreed tasks.
- **Prerequisites:** A quest open to the signed-in user: their own, or one they are a member of.
- **Interaction:**
  - Open the quest's Ideas section.
  - Ideas use the same compact editable list as Tasks, without completion controls. Click an idea’s text to edit it; Enter, Save idea or clicking outside saves and closes it. Clicking another idea saves the previous edit and opens that editor. Escape or Cancel idea edit discards the draft. Failed saves retain the draft and feedback. Add idea opens a new row and saves it at the top of the list. Drag a handle to reorder ideas, or focus it and use the arrow keys. The action menu offers Move to Tasks and Remove idea. Order persists after reopening the quest.
  - Choose the visible Move to Tasks action beneath the idea when ready to commit to it. Save or cancel an inline edit before moving it. The action remains available in the menu too.
  - Or send `/idea TEXT`, `/edit-idea IDEA TEXT`, `/move-idea IDEA PLACE`, `/drop-idea IDEA` or `/idea-to-tasks IDEA` in the conversation, naming an idea by its place in Ideas.
- **Outcome:** Ideas persist separately from Tasks. Each control sends its command to the quest's conversation, as if the user had typed it, so the conversation shows the command and a note of what changed, and the construct reads the note on its next reply. Moving adds the saved text as one open task and removes the idea in one save. A refused change keeps Ideas as they were and shows the command's reason, as a typed command does. Each idea holds 1–200 characters. Empty or longer text saves nothing. Everyone in the quest shares these ideas; other users cannot read or change them. These controls and commands make no model request.

## use_case_spell_buckets

- **Intent:** Route messages using the active spell.
- **Interaction:** Enter `brainstorm`, send ideas, enter `tasks`, send agreed tasks, then use Stop [Spell] beside the composer.
- **Outcome:** Each ordinary message goes into its current bucket. Commands accept a leading slash and ignore case. Stop returns to Chat. Switching spells preserves earlier items. Retrying a captured message creates no duplicate. Other users cannot route messages into this conversation's buckets. Tasks and Ideas have no entry-count limit. The 200-character limit for each entry applies without losing the conversation message.
