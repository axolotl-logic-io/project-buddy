# Project memory

The conventions for these cases are in [the index](README.md#conventions).

## use_case_buddy_updates_memory

The buddy records progress or a change of plan in the project's memory.

- **Prerequisites:** [`use_case_send_message`](chats.md#use_case_send_message), in a chat where she reports progress, changes a goal or states a preference.
- **Steps:**
  - She says something worth remembering, such as "I finished the roof" or "I'd rather use keyboard shortcuts".
  - The buddy updates the project's memory and shows the change in the chat.
- **Outcome:** the chat shows a notice, set apart from the buddy's words, with what changed in the memory. The project's memory shows the change, and its history lists it as a new version made by the buddy. Every chat in the project, present and future, works from the changed memory from its next reply on (see `use_case_ask_whats_next`). When she agrees on a next step, or finishes the one recorded, the buddy keeps one line starting "Next step:" in the memory, which the landing page shows as the project's next step ([`use_case_today_on_landing`](chats.md#use_case_today_on_landing)) *(checked by the real-Claude smoke test)*.
- **Variations:**
  - The buddy's edit is malformed: the chat shows that the memory update failed, and the memory is unchanged.
- **Next:**
  - `use_case_view_memory`: look at the whole memory.
  - `use_case_undo_memory_change`: the buddy got it wrong.

## use_case_view_memory

The user reads the project's memory.

- **Prerequisites:** [`use_case_open_project`](projects.md#use_case_open_project).
- **Steps:**
  - She opens the project's memory.
  - The site shows her goals, milestones, progress and preferences as the buddy and she have written them.
- **Outcome:** the page shows the newest version of the memory, formatted, exactly as it was last saved, with an Edit button and no editor. Its history lists every version, newest first, with when it was made and whether she or the buddy made it. If nothing has been saved yet, the page says so and lets her write the memory herself.
- **Next:**
  - `use_case_edit_memory`: fix or add something.
  - `use_case_undo_memory_change`: roll back a change.
  - `use_case_ask_whats_next`: ask the buddy which milestone comes next.

## use_case_edit_memory

The user changes the project's memory herself.

- **Prerequisites:** `use_case_view_memory`.
- **Steps:**
  - She chooses Edit, and the formatted memory turns into an editor holding its text.
  - She edits the memory and saves it.
  - The site keeps her version and the one before it.
- **Outcome:** the editor closes and the memory shows her text, formatted. Its history lists her version as the newest, made by her, with the version before it still listed. Chats in the project work from her version from their next reply on (see `use_case_ask_whats_next`).
- **Variations:**
  - She cancels instead of saving: the editor closes, her changes are dropped, and the memory and its history are as they were.
- **Next:**
  - [`use_case_send_message`](chats.md#use_case_send_message): carry on with the corrected memory.
  - `use_case_undo_memory_change`: change her mind.
  - `use_case_memory_edit_conflict`: the buddy changed the memory while she was editing.

## use_case_undo_memory_change

The user takes back a change to the project's memory by restoring an earlier version.

- **Prerequisites:** `use_case_buddy_updates_memory` or `use_case_edit_memory`.
- **Steps:**
  - She looks at the earlier versions of the memory.
  - She picks the version from before the change and restores it.
- **Outcome:** the memory shows that earlier version's text again. Its history lists the restore as the newest version, made by her, and every version before it is still listed, so she can restore any of them later.
- **Next:**
  - `use_case_view_memory`: check the result.

## use_case_memory_edit_conflict

The memory changed while the user was editing it.

- **Prerequisites:** `use_case_edit_memory` started, then `use_case_buddy_updates_memory` in another chat before she saved.
- **Steps:**
  - She saves her edit.
  - The site tells her the memory changed since she started and does not overwrite the newer version.
- **Outcome:** the memory and its history still show the buddy's newer version as the newest, with no version from her save. The site shows her that newer version, formatted, above the editor, which stays open with her unsaved text, so she can make her edit again on top of it.
- **Next:**
  - `use_case_edit_memory`: redo her edit on the newer version.

## use_case_ask_whats_next

The user asks the buddy what to work on next, and it answers from the project's memory.

- **Prerequisites:** [`use_case_project_interview`](projects.md#use_case_project_interview), so the memory holds milestones, then another chat in [`use_case_new_chat`](chats.md#use_case_new_chat) or [`use_case_reopen_chat`](chats.md#use_case_reopen_chat) in the same project.
- **Steps:**
  - She asks what she should work on next.
  - The buddy answers from the project's memory, in the buddy's voice.
- **Outcome:** the reply names the first milestone that the memory does not mark as done. It names the same milestone in every chat of the project, whichever buddy is speaking. After the memory changes, the next reply uses the changed memory.
- **Next:**
  - [`use_case_ask_blender_question`](chats.md#use_case_ask_blender_question): start on that milestone.
  - `use_case_buddy_updates_memory`: tell the buddy she has already done it.
  - [`use_case_today_on_landing`](chats.md#use_case_today_on_landing): agree on the next step, and find it on the landing page next time.

## use_case_quick_note

The user saves a Quick Note to a project between sessions, without starting a chat, so the buddy knows it next time.

- **Prerequisites:** [`use_case_new_project`](projects.md#use_case_new_project).
- **Steps:**
  - On any page of the signed-in site, she opens the Quick Note page from the header's **Quick Note** link in one tap.
  - She chooses the project, writes a short Quick Note such as "try a subdivision cage on the shell", and saves it.
- **Outcome:** the site says the Quick Note is saved to the project's memory, clears its text for the next one and keeps the project chosen. The project's memory ends with the Quick Note, dated with the day she wrote it, and its history lists the Quick Note as a new version made by her. No model is called, so saving a Quick Note spends none of her gold. The project's page lists the Quick Note among its newest Quick Notes, newest first. Every chat in the project works from the memory with the Quick Note from its next reply on (see `use_case_ask_whats_next`).
- **Variations:**
  - She saves an empty Quick Note: the site says a Quick Note needs some text, and nothing is saved.
  - She saves a Quick Note longer than one may be: the site says how long a Quick Note can be, and nothing is saved.
  - The Quick Note can't be saved, as when the storage can't be reached: the site says why, and her text is still there to save again.
  - She has no projects yet: the Quick Note page says Quick Notes need a project and links to her projects.
- **Next:**
  - `use_case_view_memory`: see the Quick Note in the memory.
  - `use_case_delete_note`: take the Quick Note back.
  - [`use_case_send_message`](chats.md#use_case_send_message): talk it over with the buddy.

## use_case_delete_note

The user deletes a Quick Note she no longer needs.

- **Prerequisites:** `use_case_quick_note`, then [`use_case_open_project`](projects.md#use_case_open_project).
- **Steps:**
  - She deletes a Quick Note from the project's Quick Notes.
- **Outcome:** the Quick Note is gone from the project's Quick Notes and from its memory, and the rest of the memory is as it was. The memory's history lists the deletion as a new version made by her, so `use_case_undo_memory_change` can bring the Quick Note back. Every Quick Note the project's page lists can be deleted, however it was written. Deleting a Quick Note that is gone already changes nothing, and the site says nothing was deleted.
- **Next:**
  - `use_case_quick_note`: write a better one.
