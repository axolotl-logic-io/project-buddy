# Quick Notes

## use_case_quick_note

- **Intent:** Save a short thought to a quest without opening it.
- **Prerequisites:** [`use_case_dailies`](quests.md#use_case_dailies) or another Active quest open to the signed-in user, their own or one they are a member of.
- **Steps:**
  - They open the site panel and choose Quick Note. On a phone the panel closes; docked beside the page on a wide screen, it stays open. The Quick Note dialog opens.
  - They choose the quest, write the Quick Note and choose Save Quick Note.
  - Later, they open the quest's sidebar and choose Quick Notes from its Buckets menu, and may edit or delete a Quick Note there.
- **Outcome:** the dialog offers their Active quests, newest first. On a quest's page that quest is chosen; elsewhere the newest is. With no Active quest, the dialog says so and links to Quests. A saved Quick Note clears the text, keeps the quest chosen and says which quest it went to. A Quick Note holds 1 to 1000 characters once trimmed; empty or longer text is refused with the reason, and the text stays. Closing the dialog returns focus to the site panel's button, or to Quick Note when the panel is docked. The quest's Quick Notes bucket lists its notes newest first, each with its day, an editable text control and a Delete action; selecting the text opens a multiline text area where Enter inserts a line break, Save persists through `/edit-note NOTE TEXT`, and Cancel discards the draft. Edits keep the saved date, order and experience, and the conversation records the change. Empty, overlong or refused edits keep the draft and explain the problem; Delete sends `/drop-note NOTE` to the quest's conversation, naming the note by its place, newest first; the conversation notes which Quick Note was deleted, and the note is gone from the list. Completed and Abandoned quests take no new Quick Note but keep theirs to read, edit and delete. Another user can neither save to, read, edit nor delete a quest's Quick Notes. Saving, editing and deleting make no model request.
