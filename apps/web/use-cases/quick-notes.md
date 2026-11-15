# Quick Notes

## use_case_quick_note

- **Intent:** Save a short thought to a quest without opening it.
- **Prerequisites:** [`use_case_dailies`](quests.md#use_case_dailies) or another Active quest open to the signed-in user, their own or one they are a member of.
- **Steps:**
  - They open the site menu and choose Quick Note. The menu closes and the Quick Note dialog opens.
  - They choose the quest, write the Quick Note and choose Save Quick Note.
  - Later, they open the quest's sidebar and choose its Quick Notes tab, and may delete a Quick Note there.
- **Outcome:** the dialog offers their Active quests, newest first. On a quest's page that quest is chosen; elsewhere the newest is. With no Active quest, the dialog says so and links to Quests. A saved Quick Note clears the text, keeps the quest chosen and says which quest it went to. A Quick Note holds 1 to 1000 characters once trimmed; empty or longer text is refused with the reason, and the text stays. Closing the dialog returns focus to the menu button. The quest's Quick Notes tab lists its notes newest first, each with its day and a Delete button; a deleted note is gone from the list and the page says so. Completed and Abandoned quests take no new Quick Note but keep theirs to read and delete. Another user can neither save to, read nor delete a quest's Quick Notes. Saving and deleting make no model request.
