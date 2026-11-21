# Spellbook

Each quest conversation has one active spell or none. Built-in Tasks and Brainstorm save subsequent ordinary messages to Tasks and Ideas respectively. New conversations start with no active spell.

## Customize spells

Spellbook at `/spellbook` lists built-in and own spells. Search by name and combine the search with All, Built-in, Yours or Forgotten. Each row shows its source and message destination. View opens a built-in spell; Edit opens an own spell. Copy and Forget are on the detail page. Choose Create spell or Make a copy, then edit the name and message destination: Tasks or Ideas. Message destination appears directly below Name, followed by Spell Messages.

Each spell also owns editable reply lists for casting, saving a message, stopping and invalid messages. Each list has 1–20 replies of up to 2,000 characters, edited with the same add, edit, remove and reorder controls as Ideas. One reply is chosen randomly for each event, with equal chances; repeats are possible. The chosen reply is saved with the message result, so retries keep the same reply and add no duplicate bucket entry. Replies can use `{{spell}}`, `{{bucket}}`, `{{message}}` and `{{name}}`.

Built-ins remain read-only. The shared editor keeps browser drafts through navigation and offers Save and Cancel. Own spells can be copied or forgotten. See [Forgotten spells](retirement.md) for restoration and permanent deletion.

Open **Spells & status** from the quest overview, then choose **Cast** beside a built-in or own spell. The cast opens its transcript and composer below the workspace. Cast another spell to switch destinations. Choose **Stop** beside the spell conversation to close it.

A cast saves a snapshot of its name, destination and replies. Editing, forgetting or deleting the source never changes an active spell. Cast again to use the latest definition. The local engine uses the destination for capture and the saved reply lists for responses. Reply templates replace `{{name}}` with the user’s name. Prose Instructions fields are not offered.

Each ordinary message becomes one item of at most 200 characters. Commands bypass capture. Validation failures keep the conversation message and show feedback. Capture and its saved result commit together, so retries add no duplicate item. Tasks and Ideas have no limit on the number of entries.

## Storage

Own spells reuse the owner-scoped definition storage used by constructs, with kind `spell`. Active snapshots live in `chats.spell_snapshot`. The `spell` column holds the destination and `spell_started_at` marks the first instant of the active transcript. A cast starts a fresh transcript. Earlier messages remain in storage.

Capture validates and saves with the destination's own rules inside the message transaction.

## Constructs and old links

`/workshop` redirects to `/spellbook`. Existing `/spellbook/ID` links open the spell. The built-in constructs `/constructs/vellum` and `/constructs/lumen` are read-only; every other construct id returns not found, and `/constructs` has no collection page.

The constructs API lists and reads built-ins only and offers no mutation methods. Spellbook's Forgotten tab reads and writes only spells.
