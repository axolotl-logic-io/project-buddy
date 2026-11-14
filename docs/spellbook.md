# Spells

Each quest conversation has one active spell or none. Built-in Plan and Brainstorm save subsequent ordinary messages to Plan and Ideas respectively. New conversations start with no active spell.

## Customize spells

Workshop’s Spells tab lists built-in and own spells. Choose Create spell or Make a copy, then edit the name and message destination: Plan or Ideas. Message destination appears directly below Name, followed by Spell Messages.

Each spell also owns editable reply lists for casting, saving a message, stopping and invalid messages. Each list has 1–20 replies of up to 2,000 characters, edited with the same add, edit, remove and reorder controls as Ideas. One reply is chosen randomly for each event, with equal chances; repeats are possible. The chosen reply is saved with the message result, so retries keep the same reply and add no duplicate bucket entry. Replies can use `{{spell}}`, `{{bucket}}`, `{{message}}` and `{{name}}`.

Built-ins remain read-only. The shared editor keeps browser drafts through navigation and offers Save and Cancel. Own spells can be copied or retired. Graveyard supports restoration and permanent deletion.

Use the quest sidebar’s spell picker and Cast spell, or type `cast <spell name>`, such as `cast Alstorm`. Names are matched without regard to case or repeated whitespace. Duplicate names require renaming before casting. `plan` and `brainstorm` cast the built-in spells. Commands ignore case and accept an optional leading slash. Stop beside the composer, or `stop`, ends the spell.

A cast saves a snapshot of its name, destination and replies. Editing, retiring or deleting the source never changes an active spell. Cast again to use the latest definition. The local engine uses the destination for capture and the saved reply lists for responses. Reply templates replace `{{name}}` with the user’s name. Prose Instructions fields are not offered.

Each ordinary message becomes one item of at most 200 characters. Commands bypass capture. Validation failures keep the conversation message and show feedback. Capture and its saved result commit together, so retries add no duplicate item. Plan and Ideas have no limit on the number of entries.

## Storage and migration

Own spells reuse the owner-scoped definition storage used by constructs, with kind `spell`. Active snapshots live in the nullable `chats.spell_snapshot` column; `chats.spell` retains the destination. Migration 0065 adds that column and preserves the definition and listing kind constraints, including historical activity records. It adds no destructive change; the previous build can read the existing destination column during deployment. Built-in spells already active before migration continue using their definitions.

Destination identifiers and display labels are shared by the editor, spell cards, retirement details, reply placeholders and active-spell context. Capture selects a destination handler that validates and saves with the destination’s own rules inside the message transaction.
