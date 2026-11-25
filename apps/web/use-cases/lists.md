# Lists

The conventions for these cases are in [the index](README.md#conventions). A list is a named, ordered collection of list items in a quest. Each list has one type, plain, task or quick note, and every list item in it has that type. The type names the list's items on screen: items, tasks or notes. Every new quest, Life included, has a Tasks list, a task list, and an Ideas list, a plain list.

## use_case_quest_lists

The user keeps a list's list items by hand.

- **Prerequisites:** [`use_case_open_quest`](quests.md#use_case_open_quest).
- **Steps:**
  - The user opens one of the quest's lists from Overview.
  - They add a list item, edit one, reorder them, move one to another list of the quest, or remove one.
- **Outcome:** the list lists its list items in their saved order, named for the list's type, such as "Add item" and "Remove task". Clicking a list item's text opens the shared inline editor. Enter, Save or clicking outside saves and closes it; clicking another list item saves the previous edit and opens that editor. Escape or Cancel discards the draft. Failed saves retain the draft and feedback. Drag a handle to reorder list items, or focus it and use the arrow keys. The action menu offers Move up, Move down, Move to another list and Remove. A moved list item keeps its text and takes the destination list's type, as `use_case_list_types` describes. A refused change keeps the list as it was and shows the reason. Everyone in the quest shares its lists; other users cannot read or change them. These controls make no model request.
- **Next:**
  - `use_case_list_types`: change a list's type.
  - [`use_case_change_tasks`](tasks.md#use_case_change_tasks): check off tasks.
  - [`use_case_perform_rite`](performances.md#use_case_perform_rite): fill a list by sending messages.

## use_case_set_up_list

The user adds a list to a quest and sets it up.

- **Prerequisites:** [`use_case_open_quest`](quests.md#use_case_open_quest).
- **Steps:**
  - The user chooses Add list on Overview, names the list and chooses its type.
  - Later, they open the list's settings and change any of these.
- **Outcome:** the new list appears on Overview after the quest's other lists, and can be chosen for a performance. Its pages, menus, feedback and the site's messages during a performance name its items for its type. A name that is empty, longer than one line or too long is refused with the reason, and the draft stays. Everyone in the quest sees the same list.

## use_case_list_types

The user changes a list's type, or moves a list item to a list of another type.

- **Prerequisites:** `use_case_quest_lists`, with a list item in a list.
- **Steps:**
  - The user opens the list's settings, chooses another type and saves.
  - Or the user moves a list item to a list of another type.
- **Outcome:** every list item in the list, or the moved list item, takes the new type and keeps its text and place. A task has a square check-off control and a task number, and counts toward the quest's next task. A quick note shows the date it was added. A tally shows its counts, as `use_case_tally_lists` describes, and gets them back on becoming a tally again. A plain list item shows only its text. A checked-off task that stops being a task takes back its experience, as unchecking does. A plain list item, task or tally holds one line of 1 to 200 characters; a quick note holds 1 to 1000 characters across lines. When any list item is too long for the new type, the site refuses the change, says why and changes nothing.

## use_case_tally_lists

The user counts something every day, such as words written, mantras recited or books read.

- **Prerequisites:** `use_case_set_up_list`, with a list of the type Tallies.
- **Steps:**
  - They add a tally to the list, named for what it counts.
  - They choose Increment on its card, enter an amount and add it.
  - They choose Edit today, enter today's new day total and save it.
- **Outcome:** each tally is a card: its name, its day total for today in large type, a bar for each of its last seven quest days by the size of that day's total, and its total over every day. Increment adds the amount to today's day total; Edit today replaces it. Both take any number with up to 12 digits before the decimal point and 6 after, fractional or negative; anything else is refused with the reason, and the field keeps it. Numbers show decimal places only when they aren't 0, so 2.50 shows as 2.5 and 3.0 as 3. A below-zero day's bar has the danger color. Escape or Cancel closes the field without saving. The card's menu offers Move up, Move down, Move to another list and Remove, and its name can be edited like any list item's. A removed tally that is restored by Undo has its counts again. Changing a tally earns no experience; adding one earns the experience of adding a list item. Everyone in the quest shares its tallies, with days in the owner's time zone; other users cannot read or change them.
- **Next:**
  - [`use_case_home_tallies`](home.md#use_case_home_tallies): keep every tally up to date from Home.

## use_case_quick_add

The user adds a short thought to a quest from the site panel.

- **Prerequisites:** [`use_case_life`](quests.md#use_case_life) or another Active quest open to the signed-in user, their own or one they are a member of.
- **Steps:**
  - They open the site panel and choose Quick Add. On a phone the panel closes; docked beside the page on a wide screen, it stays open. The Quick Add dialog opens.
  - They choose the quest and one of its lists, write the text and choose Add.
- **Outcome:** the dialog offers their Active quests, newest first. On a quest's page that quest is chosen; elsewhere the newest is. With no Active quest, the dialog says so and links to Quests. The text becomes a list item at the top of the chosen list, with the list's type. Saving clears the text, keeps the quest and list chosen and says where the text went. Quick Add takes 1 to 1000 characters once trimmed, and a plain or task list takes one line of up to 200; empty or longer text is refused with the reason, and the text stays. Closing the dialog returns focus to the site panel's button, or to Quick Add when the panel is docked. Another user can't add to the quest. Saving makes no model request.
