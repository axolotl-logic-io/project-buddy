# Forgotten spells

Spellbook's **Forgotten** tab puts aside the user's own spells without losing their definitions. The [glossary](../GLOSSARY.md#forget-forgotten-spells-restore-delete-forever) defines the words.

## Forget

Each own spell’s editing page has **Forget** alongside Copy. Built-in spells cannot be forgotten.

Forget removes the spell from active collections and future casts. Stale edit and clone requests cannot use it. Existing conversation snapshots and past casts keep their definitions. A completion message explains how to restore the spell.

## Manage forgotten spells

Open **Forgotten** in Spellbook at `/spellbook`. The tab lists only the acting user's forgotten spells, most recently forgotten first. Name search distinguishes an empty collection from a search with no matches. Rows share the Quests list styling, with restore and delete actions below the name.

View opens the spell's existing `/spellbook/ID` address with its saved destination and reply lists as read-only text. Restore makes the same spell available immediately, keeping its id, instructions, creation date and source. Nothing expires automatically.

Delete forever asks for confirmation naming the spell. Keep forgotten cancels. Confirming permanently removes the original; existing conversation snapshots and past casts remain. A deletion request refuses an active spell, including one restored after the confirmation opened. Unknown and repeated requests change nothing.

Only the spell's owner can read or change it. Restore and delete return to the Forgotten tab with completion feedback. The standalone `/retirement` pages and site-panel link have been removed.

## Storage

The shared `own_prompts` table retains its nullable `retired_at` column. Active reads and edits require it to be null. Forgotten spell reads and permanent deletion require it to be set. Forgetting twice preserves the first date; restoring clears it. Ownership predicates scope every query.

Dates use the browser’s local day. On phones, names wrap and actions appear below them. Search uses a labelled text field with the shared input styling and touch target.

Historical custom construct records remain excluded. Old construct ids cannot be restored or deleted through these actions. Their records and existing conversation snapshots remain stored.
