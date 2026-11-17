# Spellbook’s Forgotten tab

The conventions for these cases are in [the index](README.md#conventions).

## use_case_retire_definitions

The user puts aside an own spell.

- **Prerequisites:** the user is signed in and has an own definition.
- **Steps:** on its editing page, the user chooses Forget.
- **Outcome:** the definition disappears from active lists, choices, and future spell casts. Stale edits, clones, and starts cannot use it. Spellbook’s Forgotten tab preserves its name, instructions, source, identity, and date forgotten. Existing conversations keep their snapshots and past casts. Built-in and foreign definitions cannot be forgotten.

## use_case_view_retirement

The user finds a forgotten definition by name.

- **Prerequisites:** the user is signed in.
- **Steps:** open Spellbook and select Forgotten. Search by name, and choose View.
- **Outcome:** the page lists only the user's forgotten definitions, most recently forgotten first. Empty collections and searches with no matches are explained. View shows saved destination and reply lists as read-only text. Spellbook lists active spells; Spellbook’s Forgotten tab keeps forgotten definitions and their restore and delete controls.

## use_case_restore_retired_definition

The user makes a forgotten definition available again.

- **Prerequisites:** the user owns a forgotten definition.
- **Steps:** choose Restore from Spellbook’s Forgotten tab or its read-only view.
- **Outcome:** the same definition is active again, with its id, instructions and source intact. Restoration costs nothing. Another user cannot restore the original.

## use_case_delete_retired_definition

The user permanently removes a forgotten definition.

- **Prerequisites:** the user owns a forgotten definition.
- **Steps:** choose Delete forever, then confirm the dialog naming the definition, or choose Keep forgotten to cancel.
- **Outcome:** cancellation keeps the definition. Confirmation permanently removes the original; snapshots and past casts stay intact. An active definition cannot be deleted by this action, including after restoration while the dialog is open. A repeated or unknown-id request changes nothing. Another user cannot delete the original.

Spellbook’s Forgotten tab dates use the browser’s local day. On phones, names use the card width and actions wrap below them. Search uses a labelled text field with the shared input styling and touch target.

Spellbook’s Forgotten tab, restoration and permanent-deletion feedback use the shared page notice treatment, distinct from explanatory copy. Spellbook’s Forgotten tab completion retains keyboard focus after its card disappears. Notices persist, wrap at 320 px in Light and Dark modes, and keep links and actions keyboard-accessible. Historical custom constructs are unavailable here, and cannot be retired, restored or deleted. Their records and conversation snapshots remain intact.
