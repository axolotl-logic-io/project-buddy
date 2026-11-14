# Graveyard

Graveyard puts aside the user's own constructs and spells without losing their definitions. The [glossary](../GLOSSARY.md#retire-graveyard-restore-delete-forever) defines the words.

## Retire

Each private definition in Workshop has Retire beside Edit and Make a copy. An own definition's editing page also has Retire. Built-in definitions cannot be retired.

Retire removes the definition from active collections and future spell casts. Stale edit, clone, and start requests cannot use it. Existing conversation snapshots and past casts keep their definitions. A completion message says the definition can be restored from Graveyard.

## Manage retired definitions

The site menu links to Graveyard at `/retirement`. The page lists the acting user's retired definitions together, most recently retired first, with a retirement date and kind. Name search and kind filters narrow the list. It distinguishes an empty collection from a search with no matches.

View opens `/retirement/ID`, with the saved instructions as read-only text. Restore makes the same definition available immediately, keeping its id, instructions, creation date and source. Nothing expires automatically.

Delete forever asks for confirmation naming the definition. Keep retired cancels. Confirming permanently removes the original, while existing conversation snapshots and past casts remain. A deletion request refuses an active definition, including one restored after the confirmation opened. Unknown and repeated requests change nothing.

Only the definition's owner can read or change it.

## Storage

The shared `own_prompts` table has a nullable `retired_at` column. Normal definition reads and edits require it to be null. Graveyard reads and permanent-deletion actions require it to be set. Retiring twice preserves the first date; restoring clears it. Ownership predicates scope every query.

Graveyard dates use the browser’s local day. On phones, names use the card width and actions wrap below them. Search uses a labelled text field with the shared input styling and touch target.
