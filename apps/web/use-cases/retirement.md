# Grimoire’s Forgotten tab

The conventions for these cases are in [the index](README.md#conventions).

## use_case_retire_definitions

The user puts aside an own rite.

- **Prerequisites:** the user is signed in and has an own rite.
- **Steps:** on its editing page, the user chooses Forget.
- **Outcome:** the rite disappears from active lists, choices and new performances. Stale edits, copies and starts cannot use it. The Grimoire’s Forgotten tab keeps its name, replies, source, identity and date forgotten. The active performance and past performances keep their rite snapshots. Built-in rites and other users’ rites cannot be forgotten.

## use_case_view_retirement

The user finds a forgotten rite by name.

- **Prerequisites:** the user is signed in.
- **Steps:** open the Grimoire and select Forgotten. Find it by name or first message, and choose its row.
- **Outcome:** the page lists only the user's forgotten rites, most recently forgotten first. Empty collections and searches with no matches are explained. Its page shows the saved first message and reply list as read-only text. The Grimoire's other tabs list active rites; its Forgotten tab keeps forgotten rites and their restore and delete controls.

## use_case_restore_retired_definition

The user makes a forgotten rite available again.

- **Prerequisites:** the user owns a forgotten rite.
- **Steps:** choose Restore from the Grimoire’s Forgotten tab or its read-only view.
- **Outcome:** the same rite is active again, with its id, replies and source intact. Restoration costs nothing. Another user cannot restore the original.

## use_case_delete_retired_definition

The user permanently removes a forgotten rite.

- **Prerequisites:** the user owns a forgotten rite.
- **Steps:** choose Delete forever, then confirm the dialog naming the rite, or choose Keep forgotten to cancel.
- **Outcome:** cancellation keeps the rite. Confirmation permanently removes the original; rite snapshots and past performances stay intact. An active rite cannot be deleted by this action, including after restoration while the dialog is open. A repeated or unknown-id request changes nothing. Another user cannot delete the original.

The Forgotten tab's dates use the browser’s local day. On phones, names wrap beside the reply count and actions wrap below them. Search uses the Grimoire's labelled finder search, shared with Quests.

The Forgotten tab's forgetting, restoration and permanent-deletion feedback use the shared page notice treatment, distinct from explanatory copy. Completing an action there retains keyboard focus after its row disappears. Notices persist, wrap at 320 px in Light and Dark modes, and keep links and actions keyboard-accessible.
