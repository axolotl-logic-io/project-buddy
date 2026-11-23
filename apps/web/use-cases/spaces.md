# Spaces

The conventions for these cases are in [the index](README.md#conventions). A space is a named, ordered collection of murmlings in a quest. Every starting point creates a Tasks space, which adds tasks, and an Ideas space, which adds plain murmlings. Each space shows its contents in its own words: a singular and plural noun, and for tasks, the verbs for checking off and unchecking.

## use_case_quest_spaces

The user keeps a space's murmlings by hand.

- **Prerequisites:** [`use_case_open_quest`](quests.md#use_case_open_quest).
- **Steps:**
  - The user opens one of the quest's spaces from Overview.
  - They add a murmling, edit one, reorder them, move one to another space of the quest, or remove one.
- **Outcome:** the space lists its murmlings in their saved order, named with the space's noun, such as "Add idea" and "Remove idea". Clicking a murmling's text opens the shared inline editor. Enter, Save or clicking outside saves and closes it; clicking another murmling saves the previous edit and opens that editor. Escape or Cancel discards the draft. Failed saves retain the draft and feedback. Drag a handle to reorder murmlings, or focus it and use the arrow keys. The action menu offers Move up, Move down, Move to another space and Remove. A moved murmling keeps its type and text, and a task keeps its task number. A refused change keeps the space as it was and shows the reason. Everyone in the quest shares its spaces; other users cannot read or change them. These controls make no model request.
- **Next:**
  - `use_case_murmling_types`: mark a murmling as a task or a quick note.
  - [`use_case_change_tasks`](tasks.md#use_case_change_tasks): check off tasks.
  - [`use_case_perform_rite`](performances.md#use_case_perform_rite): fill a space by conjuring.

## use_case_set_up_space

The user adds a space to a quest and sets its words.

- **Prerequisites:** [`use_case_open_quest`](quests.md#use_case_open_quest).
- **Steps:**
  - The user chooses Add space on Overview, names the space, and sets its singular and plural nouns, its verbs for checking off and unchecking tasks, and the type a conjuration gives each new murmling.
  - Later, they open the space's settings and change any of these.
- **Outcome:** the new space appears on Overview after the quest's other spaces, and can be chosen for a performance. Its pages, menus, feedback and the site's messages during a performance use its words. Changing the words changes how existing murmlings are named, not their contents. A name or word that is empty, longer than one line or too long is refused with the reason, and the draft stays. Everyone in the quest sees the same space.

## use_case_murmling_types

The user marks a murmling as plain, a task or a quick note.

- **Prerequisites:** `use_case_quest_spaces`, with a murmling in a space.
- **Steps:** the user opens a murmling's menu and chooses Mark as task, Mark as quick note or Mark as plain.
- **Outcome:** a task gains a square check-off control and a task number, and counts toward the quest's next task. A quick note shows the date it was added. A plain murmling shows only its text. Changing the type keeps the text and place in the space. Unmarking a checked-off task takes back its experience, as unchecking does. A plain murmling or task holds one line of 1 to 200 characters; a quick note holds 1 to 1000 characters across lines. A murmling too long for the new type keeps its type, and the space says why.

## use_case_quick_note

The user saves a short thought to a quest from the site panel.

- **Prerequisites:** [`use_case_dailies`](quests.md#use_case_dailies) or another Active quest open to the signed-in user, their own or one they are a member of.
- **Steps:**
  - They open the site panel and choose Quick Note. On a phone the panel closes; docked beside the page on a wide screen, it stays open. The Quick Note dialog opens.
  - They choose the quest and one of its spaces, write the note and choose Save Quick Note.
- **Outcome:** the dialog offers their Active quests, newest first. On a quest's page that quest is chosen; elsewhere the newest is. With no Active quest, the dialog says so and links to Quests. The saved note is a quick note murmling at the top of the chosen space, showing the date it was added. Saving clears the text, keeps the quest and space chosen and says where the note went. A quick note holds 1 to 1000 characters once trimmed; empty or longer text is refused with the reason, and the text stays. Closing the dialog returns focus to the site panel's button, or to Quick Note when the panel is docked. Another user can't save to the quest. Saving makes no model request.
