# Personas

The conventions for these cases are in [the index](README.md#conventions).

## use_case_view_personas

The user looks over the tutor's personas: the built-in ones, and her own.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link).
- **Steps:**
  - She goes to her personas, by the header's Personas link on any signed-in page.
  - The site lists the built-in personas, then hers.
- **Outcome:** the six built-in personas are listed by name: Hippy, Mr. Tee, Fjord Tines, Span Tines, Argon Sprangler and Roland Dustchain. Under them, her own personas are listed by name, oldest first. With none of her own, the page says she has none yet. Each built-in persona offers to customize it, and each of her own offers to tweak it or clone it. Each persona's name opens its page. Another user's personas are never listed.
- **Next:**
  - `use_case_customize_persona`: make a persona of her own from one of them.
  - `use_case_edit_persona`: change the name and prompt parts of one of hers.
  - `use_case_reset_persona_part`: put one part of hers back to its default.
  - `use_case_customize_built_in_persona`: customize a built-in persona from its page, which starts a copy of her own.
  - [`use_case_private_data`](accounts.md#use_case_private_data): her personas are hers alone.

## use_case_customize_persona

The user makes a persona of her own from one she can see: she customizes a built-in one, or clones one of her own.

- **Prerequisites:** `use_case_view_personas`.
- **Steps:**
  - She chooses to customize a built-in persona from her personas. The site makes a new persona of hers from it and opens its page to edit.
  - Back on her personas, she chooses to tweak one of her own, which opens its page.
  - Back on her personas, she chooses to clone one of her own. The site makes a new persona of hers from it and shows her personas.
- **Outcome:** each new persona is named as the persona it came from, with " (clone)" after: customizing Hippy gives "Hippy (clone)", and cloning that gives "Hippy (clone) (clone)". The persona she customized or cloned is unchanged and still listed. Another user never sees the new one.
- **Next:**
  - `use_case_edit_persona`: change the new persona.
  - `use_case_view_personas`: look over her personas again.

## use_case_edit_persona

The user changes one of her personas: its name and the parts of its prompt.

- **Prerequisites:** `use_case_customize_persona`.
- **Steps:**
  - She opens her persona's page from her personas.
  - The page shows its name and the parts of its prompt that are the persona's own, each labelled: voice, teaching rules and role. The parts the app relies on (shared rules, citations, the project interview, the memory's lines, the three tools' descriptions, the kickoffs and the answer-now note) are hidden until she switches on "Persona prompt mechanics" in Settings, which starts off.
  - She edits the name and parts, and saves. Parts that are hidden are saved unchanged.
  - She switches on "Persona prompt mechanics" in Settings and opens the page again: every part shows, and the parts the app relies on warn that changing them can break citations, the project's memory or search.
  - She saves a voice that says `{{name}}`, then chats in the persona.
- **Outcome:** the page shows the persona with her changes, and her personas list it by its new name. Chats started before keep the persona as it was. The hint of each part the system prompt reads (voice, teaching rules, role, shared rules, citations, the interview and the memory's lines) says `{{name}}` is replaced with her name. A part that says `{{name}}` reaches her chat's system prompt with her name ([`use_case_set_name`](accounts.md#use_case_set_name)), or "the user" when she has none, while the page and the saved persona still say `{{name}}`. The page also shows, read-only, what no persona changes: the parts filled in for each chat (the project's memory, the project's name, the date and the manual's version), the tools' input fields with their descriptions, and the `<project_memory>` tags around the memory.
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

## use_case_customize_built_in_persona

The user customizes a built-in persona from its page: she can't change it, so the site makes her a copy to edit.

- **Prerequisites:** `use_case_view_personas`.
- **Steps:**
  - She opens a built-in persona's page from her personas. Its name and every part show read-only, with the parts no persona changes.
  - She chooses to customize it.
- **Outcome:** the site makes a persona of hers named as the built-in one with " (clone)" after, as customizing from her personas does, and opens its page to edit. The built-in persona is unchanged.
- **Next:**
  - `use_case_edit_persona`: change the copy.
