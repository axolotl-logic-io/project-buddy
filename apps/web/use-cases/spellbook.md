# Spells

Spellbook offers built-in Tasks and Brainstorm and the user's private spells. Built-in pages are read-only and offer Make a copy. Own spells can be created, edited, copied and forgotten.

## use_case_construct_casts_spell

The user sets the conversation's persistent spell.

- **Prerequisites:** a quest conversation open to the user, as its owner or a member; a cast or Stop applies to everyone in the quest.
- **Steps:** choose a built-in or own spell in the quest sidebar's Spells & status disclosure and cast it, which sends `cast <spell name>` to the conversation, or type that message. `tasks` and `brainstorm` cast the built-ins. Cast another spell to switch, or choose Stop [Spell] above the composer, which sends `stop`, or type `stop`.
- **Outcome:** the spell remains active after reopening. Its saved destination routes ordinary messages into open tasks or Ideas. A cast saves the name, replies and destination; subsequent definition edits or forgetting do not alter the active snapshot. Unknown, foreign and forgotten spells cannot be cast. A conversation without a quest refuses spells because it has no quest buckets. Spell names are matched without regard to case or repeated whitespace. Duplicate names must be renamed before casting. Casting while another spell is active replaces it; casting the active spell again keeps it.
- **Next:** [Message capture](ideas.md#use_case_spell_buckets), [custom spells](spellbook.md#use_case_customize_spell).

## use_case_spellbook_page

- **Goal:** Find built-in and own spells from the main menu.
- **Steps:** Open Spellbook under Places. Search by name and choose All, Built-in, Yours or Forgotten. Choose View on a built-in spell or Edit on an own spell. Choose Create spell to make a private spell.
- **Outcome:** Only built-ins and the acting user’s own active spells appear. Search and source filters combine; empty collections and unmatched searches are explained. Each row names its message destination. There is no Workshop or Constructs tab. Old Workshop bookmarks redirect to Spellbook.

## use_case_customize_spell

- **Goal:** Customize an own spell without changing existing casts.
- **Steps:** Create a spell in Spellbook or open a spell and make a copy. Edit its name, Tasks or Ideas destination, and casting, saved-message, stopping and invalid-message reply lists. Save, or Cancel to restore the saved fields. Try the spell in a quest using the picker or `cast <name>`.
- **Outcome:** Only the owner can edit the spell. Browser drafts survive navigation until saved or cancelled, unless a newer save makes them outdated. Save includes hidden sections and reveals and focuses invalid fields. Reply lists support adding, editing, removing and reordering, with at least one reply. The active cast keeps its snapshot when the source changes. Copy and Forget remain on the detail page; Spellbook’s Forgotten tab restores or deletes forgotten spells. Breadcrumbs lead directly from Spellbook to the spell name.
