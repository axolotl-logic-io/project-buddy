# Journal

The conventions for these cases are in [the index](README.md#conventions).

## use_case_construct_updates_memory

The construct records goals, knowledge, purpose, constraints, progress, preferences and agreed plans in the quest's Journal, in every activity. A new quest or an empty Journal needs no interview: the construct initializes it from useful information and preserves unrelated content on later edits.

- **Prerequisites:** [`use_case_send_message`](chats.md#use_case_send_message), in an adventure where she reports progress, changes a goal or states a preference.
- **Steps:**
  - She says something worth remembering, such as "I finished the roof" or "I'd rather use keyboard shortcuts".
  - The construct updates the quest's Journal and shows the change in the adventure.
- **Outcome:** the adventure shows a notice, set apart from the construct's words, with what changed in the Journal: the text removed and the text added, each formatted from its Markdown as the Journal shows it, its headings kept below the page's. The quest's Journal shows the change, and its history lists it as a new version made by the construct. Every adventure in the quest, present and future, works from the changed Journal from its next reply on (see `use_case_ask_whats_next`). Steps she agrees to, and so her next step, go into the quest's plan rather than the Journal ([`use_case_construct_changes_plan`](#use_case_construct_changes_plan)).
- **Variations:**
  - The construct's edit is malformed: the adventure shows that the Journal update failed, and the Journal is unchanged.
- **Next:**
  - `use_case_view_memory`: look at the whole Journal.
  - `use_case_undo_memory_change`: the construct got it wrong.

## use_case_view_memory

The user reads the quest's Journal.

- **Prerequisites:** [`use_case_open_project`](projects.md#use_case_open_project).
- **Steps:**
  - She opens the quest's Journal.
  - The site shows her goals, milestones, progress and preferences as the construct and she have written them.
- **Outcome:** the page shows the newest version of the Journal, formatted, exactly as it was last saved, with an Edit button and no editor. The Versions selection lists every version, newest first, with when it was made and who saved it: "you" for her own versions, "a construct" for the construct's, and, in a team quest, another person's name, or their email address when they have none. A version saved before the site recorded who saved it, or by a person whose account is gone, says "a person (name not recorded)". She never sees another person's version as hers. If nothing has been saved yet, the page says so and lets her write the Journal herself.
- **Next:**
  - `use_case_edit_memory`: fix or add something.
  - `use_case_undo_memory_change`: roll back a change.
  - `use_case_ask_whats_next`: ask the construct which milestone comes next.

## use_case_edit_memory

The user changes the quest's Journal herself.

- **Prerequisites:** `use_case_view_memory`.
- **Steps:**
  - She chooses Edit, and the formatted Journal turns into an editor holding its text.
  - She edits the Journal and saves it.
  - The site keeps her version and the one before it.
- **Outcome:** the editor closes and the Journal shows her text, formatted. Its history lists her version as the newest, made by her, with the version before it still listed. Adventures in the quest work from her version from their next reply on (see `use_case_ask_whats_next`).
- **Variations:**
  - She leaves and returns: her unsaved text returns for this viewer and quest in this browser; a draft based on an older saved version is dropped. Discard changes removes it.
  - She chooses Discard changes instead of saving: the editor closes, her changes are dropped, and the Journal and its history are as they were.
- **Next:**
  - [`use_case_send_message`](chats.md#use_case_send_message): carry on with the corrected Journal.
  - `use_case_undo_memory_change`: change her mind.
  - `use_case_memory_edit_conflict`: the construct changed the Journal while she was editing.

## use_case_undo_memory_change

The user takes back a change to the quest's Journal by restoring an earlier version.

- **Prerequisites:** `use_case_construct_updates_memory` or `use_case_edit_memory`.
- **Steps:**
  - She chooses Versions in the quest workspace and looks at the earlier versions of the Journal.
  - She picks the version from before the change and restores it.
- **Outcome:** the Journal shows that earlier version's text again. A confirmation remains visible after the history updates; a later restore attempt replaces that feedback, including when it is refused as outdated. Its history lists the restore as the newest version, made by her, and every version before it is still listed, so she can restore any of them later.
- **Provenance:** future restores label the new version “Restored from version N”. Earlier history remains unchanged with unknown provenance; matching text never implies a historic restore. Owner and member attribution and conflict checks remain in effect.
- **Next:**
  - `use_case_view_memory`: check the result.

Future restores label the new version “Restored from version N”. Earlier history remains unchanged with unknown provenance; matching text never implies a historic restore. Owner and member attribution and conflict checks remain in effect.

## use_case_memory_edit_conflict

The Journal changed while the user was editing it.

- **Prerequisites:** `use_case_edit_memory` started, then `use_case_construct_updates_memory` in another adventure before she saved.
- **Steps:**
  - She saves her edit.
  - The site tells her the Journal changed since she started and does not overwrite the newer version.
- **Outcome:** the Journal and its history still show the construct's newer version as the newest, with no version from her save. The site shows her that newer version, formatted, above the editor, which stays open with her unsaved text, so she can make her edit again on top of it.
- **Next:**
  - `use_case_edit_memory`: redo her edit on the newer version.

## use_case_ask_whats_next

The user asks the construct what to work on next, and it answers from the quest's Journal.

- **Prerequisites:** a quest Journal holding milestones, saved through `use_case_construct_updates_memory` or `use_case_edit_memory`, and an adventure in the same quest. A preserved interview is not required.
- **Steps:**
  - She asks what she should work on next.
  - The construct answers from the quest's Journal, in the construct's voice.
- **Outcome:** the reply names the first milestone that the Journal does not mark as done. It names the same milestone in every adventure of the quest, whichever construct is speaking. After the Journal changes, the next reply uses the changed Journal.
- **Next:**
  - [`use_case_ask_blender_question`](chats.md#use_case_ask_blender_question): start on that milestone.
  - `use_case_construct_updates_memory`: tell the construct she has already done it.
  - `use_case_construct_changes_plan`: agree on the next step and keep it in the Plan.

## use_case_quick_note

The user saves a Quick Note to a quest between sessions, without starting an adventure, so the construct knows it next time.

- **Prerequisites:** [`use_case_new_project`](projects.md#use_case_new_project).
- **Steps:**
  - On any page of the signed-in site, she opens the Quick Note page from the header's **Quick Note** link in one tap.
  - She chooses an accessible Active quest, including a team quest, writes a short Quick Note such as "try a subdivision cage on the shell", and saves it.
- **Outcome:** the site says the Quick Note is saved to the quest's Journal, clears its text for the next one and keeps the quest chosen. The quest's Journal ends with the Quick Note, dated with the day she wrote it, and its history lists the Quick Note as a new version made by her. No model is called, so saving a Quick Note spends none of her batteries. The quest's page lists the Quick Note among its newest Quick Notes, newest first. Every adventure in the quest works from the Journal with the Quick Note from its next reply on (see `use_case_ask_whats_next`).
- **Variations:**
  - She leaves and returns: the chosen accessible Active quest and its unsaved Quick Note return in this browser. Each quest keeps its own draft; Discard changes removes it.
  - She saves an empty Quick Note: the site says a Quick Note needs some text, and nothing is saved.
  - She saves a Quick Note longer than one may be: the site says how long a Quick Note can be, and nothing is saved.
  - The Quick Note can't be saved, as when the storage can't be reached: the site says why, and her text is still there to save again.
  - She opens an Active quest's page: Add a Quick Note opens the Quick Note page with that quest chosen. Completed and Abandoned quest pages have no Add a Quick Note link; their existing Quick Notes remain available to read and delete. Restoring the quest brings the link back.
  - She has no Active quests: the Quick Note page says Quick Notes need a quest and links to her quests.
- **Next:**
  - `use_case_view_memory`: see the Quick Note in the Journal.
  - `use_case_delete_note`: take the Quick Note back.
  - [`use_case_send_message`](chats.md#use_case_send_message): talk it over with the construct.

Write and Preview share one retained draft. The heading's Save Quick Note works in either tab and returns to Write with feedback and focus on the text. Preview shows the selected quest's name as a small label above the Quick Note, and the Quick Note as the dated line it will become in the Journal, such as "Note (2026-11-02): try a subdivision cage on the shell", with its line breaks and runs of spaces made single spaces, as saving makes them.

## use_case_delete_note

The user deletes a Quick Note she no longer needs.

- **Prerequisites:** `use_case_quick_note`, then [`use_case_open_project`](projects.md#use_case_open_project).
- **Steps:**
  - She deletes a Quick Note from the quest's Quick Notes.
- **Outcome:** the Quick Note is gone from the quest's Quick Notes and from its Journal, and the rest of the Journal is as it was. The Journal's history lists the deletion as a new version made by her, so `use_case_undo_memory_change` can bring the Quick Note back. Every Quick Note the quest's page lists can be deleted, however it was written. Deleting a Quick Note that is gone already changes nothing, and the site says nothing was deleted.
- **Next:**
  - `use_case_quick_note`: write a better one.

## use_case_construct_changes_plan

The construct keeps the quest's plan: the steps she agreed to, in order.

- **Prerequisites:** [`use_case_send_message`](chats.md#use_case_send_message), in an adventure in one of her quests.
- **Steps:**
  - She agrees to the next stretch of work, or tells the construct she finished a step or changed her mind.
  - The construct changes the plan: it adds, checks off, changes, moves or removes steps.
- **Outcome:** the adventure shows a Plan change, set apart from the construct's words, with what each operation did and Undo, as soon as the construct makes it and again when she reopens the adventure. Every adventure in the quest gets the plan in its instructions from its next reply on, each step with its number and the done ones marked. The quest’s Plan section shows its remaining steps. A plan emptied or with every step done has no next step. The construct adds only steps she agreed to, checks off a step when she says she finished it, and never counts open steps or days *(checked by the real-Claude smoke test)*.
- **Variations:**
  - The construct names a step that is gone, such as one she removed meanwhile: nothing changes, and the construct gets the plan as it is to try again.
  - In an adventure with no quest, the construct has no plan to change.
- **Next:**
  - `use_case_change_plan`: change the plan herself.
  - `use_case_plan_panel`: keep it beside the adventure.

## use_case_change_plan

The user changes the quest's plan herself, without the construct.

- **Prerequisites:** [`use_case_open_project`](projects.md#use_case_open_project).
- **Steps:**
  - She opens the quest's Plan section.
  - She checks off a step, reopens a done one, adds one, edits one, moves one up or down, or removes one.
- **Outcome:** the next step shows on its own above the open steps, each numbered. Each change is saved at once, makes no model call and spends no batteries, and the page says what changed, with Undo. Undo puts the plan back as it would be without that change, keeping later ones: a step edited again since keeps its newer text, a step removed since stays removed, and a step whose old neighbour was removed since goes back at the end. When nothing that change did is left to undo, Undo says so and changes nothing. A change refused for a reason, such as the step limit below, says why in the same quiet line. A change that failed, because it couldn't be saved or the quest is no longer available, is an alert in the danger colour with the alert icon, announced at once. A step must be one line of at most 200 characters; empty text is refused with the reason, and her text stays in the field. The plan holds at most 30 open steps, counted on the plan a change leaves, so one change may add a step and remove another at the limit. Done steps fold away under Done. The Journal page shows the open steps above the Journal, with a link to the Plan section. In a team quest, every member can change the plan; anyone else's quest looks exactly like one that doesn't exist.
- **Next:**
  - `use_case_construct_changes_plan`: the construct works from the changed plan on its next reply.

## use_case_plan_panel

The user keeps the plan beside an adventure.

- **Prerequisites:** [`use_case_send_message`](chats.md#use_case_send_message), in an adventure in one of her quests.
- **Steps:**
  - On a wide screen, the Plan panel sits beside the conversation. On a narrower one, she opens it with the Plan button above the conversation, which names the next step.
  - She changes the plan there, as on the Plan section.
- **Outcome:** each change shows in the adventure as a Plan change by her, which says it spent no batteries, with Undo; the construct reads it on its next reply. The panel follows the construct's changes as they arrive. While the construct replies, here or for another member, the panel's controls wait for the reply to end. While her last message has no reply because its reply failed or stopped, they wait too and say why, so that Retry or "send again" still answers that message; she can change the plan on the quest's page meanwhile.
- **Next:**
  - `use_case_plan_commands`: change it from the message box.

## use_case_plan_commands

The user keeps the plan with commands in the message box, without the construct.

- **Prerequisites:** [`use_case_send_message`](chats.md#use_case_send_message), in an adventure in one of her quests.
- **Steps:**
  - She types "/" in the message box. A list of the commands shows above it, each with how to write it and what it does; she moves through it with the arrow keys and picks one with Tab, Enter or a click.
  - She sends a command, such as `/done`, `/add Paint the eyes`, `/move 4 1` or `/plan`.
- **Outcome:** the command runs at once, makes no model call and spends no batteries. The adventure shows what she typed and the Plan change it made, or, for `/plan`, the plan as a card with every control; only the newest card holds the controls. `/undo` undoes her last plan change in this adventure that has something left to undo, passing over one whose steps were all changed or removed since. The message box empties. The construct reads each change on its next reply, as a note rather than a request. A step is named by its number, as the plan shows it. With the mock model, the list also shows its `/mock-…` commands, which still go to the construct.
- **Variations:**
  - An unknown command, a missing step, text that's too long or a place out of range: nothing changes, the site says why under the message box, and her text stays there.
  - While her last message awaits a reply, because one is running or it failed or stopped: a plan command changes nothing and says why, so Retry and "send again" still answer that message.
  - In an adventure with no quest, plan commands say they need a quest. Any other message that starts with "/", such as "/shrug ok", goes to the construct as written, and typing "/" lists no plan commands.
- **Next:**
  - `use_case_change_plan`: see the whole plan on the quest's page.
