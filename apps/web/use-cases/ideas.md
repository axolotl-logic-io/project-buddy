# Ideas

## use_case_quest_ideas

- **Intent:** Keep possibilities apart from agreed tasks.
- **Prerequisites:** A quest owned by the signed-in user.
- **Interaction:**
  - Open the quest's Ideas section.
  - Ideas use the same compact editable list as Plan, without completion controls. Click an idea’s text to edit it; Enter, Save idea or clicking outside saves and closes it. Clicking another idea saves the previous edit and opens that editor. Escape or Cancel idea edit discards the draft. Failed saves retain the draft and feedback. Add idea opens a new row and saves it at the top of the list. Drag a handle to reorder ideas, or focus it and use the arrow keys. The action menu offers Move to Plan and Remove idea. Order persists after reopening the quest.
  - Choose Move to Plan when ready to commit to it.
- **Outcome:** Ideas persist separately from Plan. Moving adds the saved text as one open step and removes the idea in one save. A refused move keeps the idea. Each idea holds 1–200 characters. Empty or longer text saves nothing. Other users cannot read or change these ideas. These controls make no model request.

## use_case_spell_buckets

- **Intent:** Route messages using the active spell.
- **Interaction:** Enter `brainstorm`, send ideas, enter `plan`, send agreed steps, then use Stop [Spell] beside the composer.
- **Outcome:** Each ordinary message goes into its current bucket. Commands accept a leading slash and ignore case. Stop returns to Chat. Switching spells preserves earlier items. Retrying a captured message creates no duplicate. Other users cannot route messages into this conversation's buckets. Plan and Ideas have no entry-count limit. The 200-character limit for each entry applies without losing the conversation message.
