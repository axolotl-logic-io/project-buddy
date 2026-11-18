# Spellbook

Each quest conversation has one active spell or none. Built-in Tasks and Brainstorm save subsequent ordinary messages to Tasks and Ideas respectively. New conversations start with no active spell.

## Customize spells

Spellbook at `/spellbook` lists built-in and own spells. The main menu links to it under Places. Search by name and combine the search with All, Built-in, Yours or Forgotten. The filters, count badges, bordered content area and compact linked rows share the Quests list styling. Each row shows its source and message destination. View opens a built-in spell; Edit opens an own spell. Copy and Forget are on the detail page. Choose Create spell or Make a copy, then edit the name and message destination: Tasks or Ideas. Message destination appears directly below Name, followed by Spell Messages.

Each spell also owns editable reply lists for casting, saving a message, stopping and invalid messages. Each list has 1–20 replies of up to 2,000 characters, edited with the same add, edit, remove and reorder controls as Ideas. One reply is chosen randomly for each event, with equal chances; repeats are possible. The chosen reply is saved with the message result, so retries keep the same reply and add no duplicate bucket entry. Replies can use `{{spell}}`, `{{bucket}}`, `{{message}}` and `{{name}}`.

Built-ins remain read-only. The shared editor keeps browser drafts through navigation and offers Save and Cancel. Own spells can be copied or forgotten. Spellbook’s Forgotten tab supports restoration and permanent deletion.

Open **Spells & status** from the quest overview, then choose **Cast** beside a built-in or own spell. The cast opens its transcript and composer below the workspace. Cast another spell to switch destinations. Choose **Stop** beside the spell conversation to close it.

A cast saves a snapshot of its name, destination and replies. Editing, forgetting or deleting the source never changes an active spell. Cast again to use the latest definition. The local engine uses the destination for capture and the saved reply lists for responses. Reply templates replace `{{name}}` with the user’s name. Prose Instructions fields are not offered.

Each ordinary message becomes one item of at most 200 characters. Commands bypass capture. Validation failures keep the conversation message and show feedback. Capture and its saved result commit together, so retries add no duplicate item. Tasks and Ideas have no limit on the number of entries.

## Storage

Own spells reuse the owner-scoped definition storage used by constructs, with kind `spell`. Active snapshots live in `chats.spell_snapshot`. The `spell` column holds the destination and `spell_started_at` marks the first instant of the active transcript. A cast starts a fresh transcript. Earlier messages remain in storage.

Destination identifiers and display labels are shared by the editor, spell cards, forgotten spell details, reply placeholders and active-spell context. Capture selects a destination handler that validates and saves with the destination’s own rules inside the message transaction.

## Removed construct features and old links

`/workshop`, including old kind queries, redirects temporarily to `/spellbook`. Existing `/spellbook/ID` links keep working. There is no Constructs tab or Workshop editor. Custom construct detail URLs return not found; built-in `/constructs/vellum` and `/constructs/lumen` remain read-only without copying. `/constructs` has no collection page.

The constructs API lists and reads built-ins only. Custom construct server actions and mutation stores are removed. Spellbook’s Forgotten tab reads and writes only kind `spell`, including direct requests with an old construct id. Construct API routes offer no mutation methods.

Historical custom construct rows in `own_prompts` and their artwork are preserved without retirement, conversion or deletion. Conversation snapshot parsing, artwork delivery, premade quest assignments, Start Day and Undo continue to use their retained definitions. Own spell storage, ownership checks and browser draft keys stay intact. This change needs no schema migration.
