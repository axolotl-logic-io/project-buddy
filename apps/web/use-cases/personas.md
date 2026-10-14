# Personas

The conventions for these cases are in [the index](README.md#conventions).

## use_case_view_personas

The user looks over the tutor's personas: the built-in ones, and her own.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link).
- **Steps:**
  - She goes to her personas, by the header's Personas link on any signed-in page.
  - The site lists the built-in personas, then hers.
- **Outcome:** the six built-in personas are listed by name: Hippy, Mr. Tee, Fjord Tines, Span Tines, Argon Sprangler and Roland Dustchain. Under them, her own personas are listed by name, oldest first. With none of her own, the page says she has none yet. Each persona, built-in or her own, offers to clone it, and its name opens its page. Another user's personas are never listed.
- **Next:**
  - `use_case_clone_persona`: make a persona of her own from one of them.
  - `use_case_edit_persona`: change the name and prompt parts of one of hers.
  - `use_case_reset_persona_part`: put one part of hers back to its default.
  - `use_case_edit_built_in_persona_clones`: edit a built-in persona, which starts a copy of her own.
  - [`use_case_private_data`](accounts.md#use_case_private_data): her personas are hers alone.

## use_case_clone_persona

The user makes a persona of her own by cloning one she can see.

- **Prerequisites:** `use_case_view_personas`.
- **Steps:**
  - She chooses to clone a persona, a built-in one or one of her own.
  - The site makes a new persona of hers from it.
- **Outcome:** her personas list a new one named as the persona she cloned, with " (copy)" after: cloning Hippy gives "Hippy (copy)", and cloning that clone gives "Hippy (copy) (copy)". The persona she cloned is unchanged and still listed. Another user never sees the clone.
- **Next:**
  - `use_case_view_personas`: look over her personas again.

## use_case_edit_persona

The user changes one of her personas: its name and the parts of its prompt.

- **Prerequisites:** `use_case_clone_persona`.
- **Steps:**
  - She opens her persona's page from her personas.
  - The page shows its name and the parts of its prompt that are the persona's own, each labelled: voice, teaching rules and role. The parts the app relies on (shared rules, citations, the project interview, the memory's lines, the three tools' descriptions, the kickoffs and the answer-now note) are hidden until she switches on "Persona prompt mechanics" in Settings, which starts off.
  - She edits the name and parts, and saves. Parts that are hidden are saved unchanged.
  - She switches on "Persona prompt mechanics" in Settings and opens the page again: every part shows, and the parts the app relies on warn that changing them can break citations, the project's memory or search.
- **Outcome:** the page shows the persona with her changes, and her personas list it by its new name. Chats started before keep the persona as it was. The page also shows, read-only, what no persona changes: the parts filled in for each chat (the project's memory, the project's name, the date and the manual's version), the tools' input fields with their descriptions, and the `<project_memory>` tags around the memory.
- **Variations:**
  - Another user's persona, or an id that is no persona's, is not found, and nothing changes.
- **Next:**
  - `use_case_reset_persona_part`: undo a change to one part.
  - `use_case_view_personas`: look over her personas again.

## use_case_reset_persona_part

The user puts one part of her persona back to its default.

- **Prerequisites:** `use_case_edit_persona`.
- **Steps:**
  - With "Persona prompt mechanics" switched on in Settings, so every part shows, on her persona's page she chooses "Reset to default" beside a part. With it off, only the voice, teaching rules and role show, each with its reset.
- **Outcome:** that part shows its default and every other part is unchanged. The voice and teaching rules go back to those of the built-in persona hers was cloned from, or to Hippy's when it was cloned from one of her own; every other part goes back to the text every persona starts with.
- **Next:**
  - `use_case_edit_persona`: change it again.

## use_case_edit_built_in_persona_clones

The user edits a built-in persona, which she can't change, so the site makes her a copy to edit.

- **Prerequisites:** `use_case_view_personas`.
- **Steps:**
  - She opens a built-in persona's page from her personas. Its name and every part show read-only, with the parts no persona changes.
  - She chooses to edit it.
- **Outcome:** the site makes a persona of hers named as the built-in one with " (copy)" after, as cloning does, and opens its page to edit. The built-in persona is unchanged.
- **Next:**
  - `use_case_edit_persona`: change the copy.
