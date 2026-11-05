# Journal

The conventions for these cases are in [the index](README.md#conventions).

## use_case_construct_updates_memory

The construct records goals, knowledge, purpose, constraints, progress, preferences and agreed plans in the quest's Journal, in every activity. A new quest or an empty Journal needs no interview: the construct initializes it from useful information and preserves unrelated content on later edits.

- **Prerequisites:** [`use_case_send_message`](chats.md#use_case_send_message), in an adventure where she reports progress, changes a goal or states a preference.
- **Steps:**
  - She says something worth remembering, such as "I finished the roof" or "I'd rather use keyboard shortcuts".
  - The construct updates the quest's Journal and shows the change in the adventure.
- **Outcome:** the adventure shows a notice, set apart from the construct's words, with what changed in the Journal. The quest's Journal shows the change, and its history lists it as a new version made by the construct. Every adventure in the quest, present and future, works from the changed Journal from its next reply on (see `use_case_ask_whats_next`). When she agrees on a next step, or finishes the one recorded, the construct keeps one line starting "Next step:" in the Journal, which the landing page shows as the quest's next step ([`use_case_today_on_landing`](chats.md#use_case_today_on_landing)) *(checked by the real-Claude smoke test)*.
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
- **Outcome:** the page shows the newest version of the Journal, formatted, exactly as it was last saved, with an Edit button and no editor. Its history lists every version, newest first, with when it was made and who saved it: "you" for her own versions, "the construct" for the construct's, and, in a team quest, another person's name, or their email address when they have none. A version saved before the site recorded who saved it, or by a person whose account is gone, says "a person (name not recorded)". She never sees another person's version as hers. If nothing has been saved yet, the page says so and lets her write the Journal herself.
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
  - She cancels instead of saving: the editor closes, her changes are dropped, and the Journal and its history are as they were.
- **Next:**
  - [`use_case_send_message`](chats.md#use_case_send_message): carry on with the corrected Journal.
  - `use_case_undo_memory_change`: change her mind.
  - `use_case_memory_edit_conflict`: the construct changed the Journal while she was editing.

## use_case_undo_memory_change

The user takes back a change to the quest's Journal by restoring an earlier version.

- **Prerequisites:** `use_case_construct_updates_memory` or `use_case_edit_memory`.
- **Steps:**
  - She looks at the earlier versions of the Journal.
  - She picks the version from before the change and restores it.
- **Outcome:** the Journal shows that earlier version's text again. A confirmation remains visible after the history updates; a later restore attempt replaces that feedback, including when it is refused as outdated. Its history lists the restore as the newest version, made by her, and every version before it is still listed, so she can restore any of them later.
- **Next:**
  - `use_case_view_memory`: check the result.

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

- **Prerequisites:** a quest Journal holding milestones, saved through `use_case_construct_updates_memory` or `use_case_edit_memory`, and an open adventure in the same quest. A preserved interview is not required.
- **Steps:**
  - She asks what she should work on next.
  - The construct answers from the quest's Journal, in the construct's voice.
- **Outcome:** the reply names the first milestone that the Journal does not mark as done. It names the same milestone in every adventure of the quest, whichever construct is speaking. After the Journal changes, the next reply uses the changed Journal.
- **Next:**
  - [`use_case_ask_blender_question`](chats.md#use_case_ask_blender_question): start on that milestone.
  - `use_case_construct_updates_memory`: tell the construct she has already done it.
  - [`use_case_today_on_landing`](chats.md#use_case_today_on_landing): agree on the next step, and find it on the landing page next time.

## use_case_quick_note

The user saves a Quick Note to a quest between sessions, without starting an adventure, so the construct knows it next time.

- **Prerequisites:** [`use_case_new_project`](projects.md#use_case_new_project).
- **Steps:**
  - On any page of the signed-in site, she opens the Quick Note page from the header's **Quick Note** link in one tap.
  - She chooses the quest, writes a short Quick Note such as "try a subdivision cage on the shell", and saves it.
- **Outcome:** the site says the Quick Note is saved to the quest's Journal, clears its text for the next one and keeps the quest chosen. The quest's Journal ends with the Quick Note, dated with the day she wrote it, and its history lists the Quick Note as a new version made by her. No model is called, so saving a Quick Note spends none of her gold. The quest's page lists the Quick Note among its newest Quick Notes, newest first. Every adventure in the quest works from the Journal with the Quick Note from its next reply on (see `use_case_ask_whats_next`).
- **Variations:**
  - She leaves and returns: the chosen accessible quest and its unsaved Quick Note return in this browser. Each quest keeps its own draft; Discard changes removes it.
  - She saves an empty Quick Note: the site says a Quick Note needs some text, and nothing is saved.
  - She saves a Quick Note longer than one may be: the site says how long a Quick Note can be, and nothing is saved.
  - The Quick Note can't be saved, as when the storage can't be reached: the site says why, and her text is still there to save again.
  - She has no quests yet: the Quick Note page says Quick Notes need a quest and links to her quests.
- **Next:**
  - `use_case_view_memory`: see the Quick Note in the Journal.
  - `use_case_delete_note`: take the Quick Note back.
  - [`use_case_send_message`](chats.md#use_case_send_message): talk it over with the construct.

## use_case_delete_note

The user deletes a Quick Note she no longer needs.

- **Prerequisites:** `use_case_quick_note`, then [`use_case_open_project`](projects.md#use_case_open_project).
- **Steps:**
  - She deletes a Quick Note from the quest's Quick Notes.
- **Outcome:** the Quick Note is gone from the quest's Quick Notes and from its Journal, and the rest of the Journal is as it was. The Journal's history lists the deletion as a new version made by her, so `use_case_undo_memory_change` can bring the Quick Note back. Every Quick Note the quest's page lists can be deleted, however it was written. Deleting a Quick Note that is gone already changes nothing, and the site says nothing was deleted.
- **Next:**
  - `use_case_quick_note`: write a better one.
