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
- **Outcome:** the page lists only the user's retired definitions, most recently retired first. Filters combine with the name search. Empty collections and searches with no matches are explained. View shows saved instructions as read-only text.

## use_case_restore_retired_definition

The user makes a retired definition available again.

- **Prerequisites:** the user owns a retired definition.
- **Steps:** choose Restore from the Retirement list or its read-only view.
- **Outcome:** the same definition is active again, with its id, instructions, source, and bought-copy ownership intact. Restoration costs no gold. A retired bought copy remains held and cannot be bought again for a second charge. A restored preferred interview construct is available as the saved preference again. Another user cannot restore the original.

## use_case_delete_retired_definition

The user permanently removes a retired definition.

- **Prerequisites:** the user owns a retired definition.
- **Steps:** choose Delete forever, then confirm the dialog naming the definition, or choose Keep retired to cancel.
- **Outcome:** cancellation keeps the definition. Confirmation permanently removes the original; snapshots and past casts stay intact. An active definition cannot be deleted by this action, including after restoration while the dialog is open. A repeated or unknown-id request changes nothing. Another user cannot delete the original. Listings remain available until unlisted separately. Permanent deletion gives no refund; buying another copy may cost gold.
