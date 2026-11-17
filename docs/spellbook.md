# Spellbook

Each quest conversation has one active spell or none. Built-in Tasks and Brainstorm save subsequent ordinary messages to Tasks and Ideas respectively. New conversations start with no active spell.

## Customize spells

Spellbook at `/spellbook` lists built-in and own spells. The main menu links to it under Places. Search by name and combine the search with All, Built-in or Yours. Each row shows its source and message destination. View opens a built-in spell; Edit opens an own spell. Copy and Retire are on the detail page. Choose Create spell or Make a copy, then edit the name and message destination: Tasks or Ideas. Message destination appears directly below Name, followed by Spell Messages.

Each spell also owns editable reply lists for casting, saving a message, stopping and invalid messages. Each list has 1–20 replies of up to 2,000 characters, edited with the same add, edit, remove and reorder controls as Ideas. One reply is chosen randomly for each event, with equal chances; repeats are possible. The chosen reply is saved with the message result, so retries keep the same reply and add no duplicate bucket entry. Replies can use `{{spell}}`, `{{bucket}}`, `{{message}}` and `{{name}}`.

Built-ins remain read-only. The shared editor keeps browser drafts through navigation and offers Save and Cancel. Own spells can be copied or retired. Graveyard supports restoration and permanent deletion.

Use the spell picker and Cast spell in the quest sidebar’s Actions tab, or type `cast <spell name>`, such as `cast Alstorm`. Names are matched without regard to case or repeated whitespace. Duplicate names require renaming before casting. `tasks` and `brainstorm` cast the built-in spells. Commands ignore case and accept an optional leading slash. Stop beside the composer, or `stop`, ends the spell.

A cast saves a snapshot of its name, destination and replies. Editing, retiring or deleting the source never changes an active spell. Cast again to use the latest definition. The local engine uses the destination for capture and the saved reply lists for responses. Reply templates replace `{{name}}` with the user’s name. Prose Instructions fields are not offered.

Each ordinary message becomes one item of at most 200 characters. Commands bypass capture. Validation failures keep the conversation message and show feedback. Capture and its saved result commit together, so retries add no duplicate item. Tasks and Ideas have no limit on the number of entries.

## Storage

Own spells reuse the owner-scoped definition storage used by constructs, with kind `spell`. Active snapshots live in the nullable `chats.spell_snapshot` column; `chats.spell` holds the destination.

Destination identifiers and display labels are shared by the editor, spell cards, retirement details, reply placeholders and active-spell context. Capture selects a destination handler that validates and saves with the destination’s own rules inside the message transaction.

## Removed construct features and old links

`/workshop`, including old kind queries, redirects temporarily to `/spellbook`. Existing `/spellbook/ID` links keep working. There is no Constructs tab or Workshop editor. Custom construct detail URLs return not found; built-in `/constructs/vellum` and `/constructs/lumen` remain read-only without copying. `/constructs` has no collection page.

The constructs API lists and reads built-ins only. Custom construct server actions and mutation stores are removed. Graveyard reads and writes only kind `spell`, including direct requests with an old construct id. Construct API routes offer no mutation methods.

Historical custom construct rows in `own_prompts` and their artwork are preserved without retirement, conversion or deletion. Conversation snapshot parsing, artwork delivery, premade quest assignments, Start Day and Undo continue to use their retained definitions. Own spell storage, ownership checks and browser draft keys stay intact. This change needs no schema migration.
