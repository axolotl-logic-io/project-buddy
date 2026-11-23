# Grimoire

The Grimoire offers the built-in rites, Capture and Brainstorm, and the user's own rites. Capture confirms each conjuration. Brainstorm replies with brainstorming cues that help the user think of more. Either can be performed on any space. Built-in pages are read-only and offer Make a copy. Own rites can be created, edited, copied and forgotten.

## use_case_grimoire_page

- **Goal:** Find built-in and own rites from the main menu.
- **Steps:** Open the Grimoire under Places. Search by name and choose All, Built-in, Yours or Forgotten. Choose View on a built-in rite or Edit on an own rite. Choose Create rite to make a private rite.
- **Outcome:** Only built-ins and the acting user's own active rites appear. Search and source filters combine; empty collections and unmatched searches are explained. There is no Workshop or Constructs tab.

## use_case_customize_rite

- **Goal:** Write an own rite's replies without changing performances already under way.
- **Steps:** Create a rite in the Grimoire, or open a rite and make a copy. Edit its name and its reply list. Save, or Cancel to restore the saved fields. Try the rite by performing it on a space ([`use_case_perform_rite`](performances.md#use_case_perform_rite)).
- **Outcome:** Only the owner can edit the rite. A rite has one reply list, which supports adding, editing, removing and reordering, with at least one reply. Each reply can prompt the user with a brainstorming or planning cue. Replies can use placeholders for the rite's name, the space's name and nouns, the conjuration's text and the acting user's name ([`use_case_set_name`](accounts.md#use_case_set_name)). The rite writes no messages for starting, stopping or failed conjurations: the site writes those from the rite's name and the space's words. Browser drafts survive navigation until saved or cancelled, unless a newer save makes them outdated. Save reveals and focuses invalid fields. The active performance keeps its rite snapshot when the source changes. Copy and Forget remain on the detail page; the Grimoire's Forgotten tab restores or deletes forgotten rites. Breadcrumbs lead directly from the Grimoire to the rite's name.
