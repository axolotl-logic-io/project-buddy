# Retirement

The conventions for these cases are in [the index](README.md#conventions).

## use_case_retire_definitions

The user puts aside an own construct, activity, or spell.

- **Prerequisites:** the user is signed in and has an own definition.
- **Steps:** on its collection card or editing page, the user chooses Retire.
- **Outcome:** the definition disappears from active lists, choices, future spell casts, and new activity entries. Stale edits, clones, and starts cannot use it. The central Retirement page preserves its name, instructions, source, identity, and retirement date. Existing adventures keep their snapshots and past casts. A retired preferred interview construct falls back to Vellum. Built-in and foreign definitions cannot be retired; team quest membership does not grant access to originals.

## use_case_view_retirement

The user finds a retired definition across all three kinds.

- **Prerequisites:** the user is signed in.
- **Steps:** open Retirement from the site menu or a collection page. Filter by kind, search by name, and choose View.
- **Outcome:** the page lists only the user's retired definitions, most recently retired first. Filters combine with the name search. Empty collections and searches with no matches are explained. View shows saved instructions as read-only text. The Retired tab of Constructs or Spellbook lists only that kind, with the name search and no kind filter; retired activities are on the Retirement page alone.

## use_case_restore_retired_definition

The user makes a retired definition available again.

- **Prerequisites:** the user owns a retired definition.
- **Steps:** choose Restore from the Retirement list or its read-only view.
- **Outcome:** the same definition is active again, with its id, instructions and source intact. Restoration costs nothing. A restored preferred interview construct is available as the saved preference again. Another user cannot restore the original.

## use_case_delete_retired_definition

The user permanently removes a retired definition.

- **Prerequisites:** the user owns a retired definition.
- **Steps:** choose Delete forever, then confirm the dialog naming the definition, or choose Keep retired to cancel.
- **Outcome:** cancellation keeps the definition. Confirmation permanently removes the original; snapshots and past casts stay intact. An active definition cannot be deleted by this action, including after restoration while the dialog is open. A repeated or unknown-id request changes nothing. Another user cannot delete the original.

Retirement dates use the browser’s local day. On phones, names use the card width and actions wrap below them. Search uses a labelled text field with the shared input styling and touch target.

Retirement, restoration and permanent-deletion feedback uses the shared page notice treatment, distinct from explanatory copy. Retirement completion retains keyboard focus after its card disappears. Notices persist, wrap at 320 px in Light and Dark modes, and keep links and actions keyboard-accessible. Static fallback state is a notice without a live announcement.
