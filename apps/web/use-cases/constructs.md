# Constructs

The Workshop’s Constructs tab lists local characters with a name and a prompt, built in or the user's own.

Built-in, starter, customized and reset prompts use `# Character Sheet`. The separate name identifies the definition; renaming leaves the sheet heading alone. Edited instructions and existing conversation snapshots keep their text.

The conventions for these cases are in [the index](README.md#conventions).

## use_case_view_constructs

Workshop’s Constructs tab lists built-ins and private constructs. An introduction and Create construct button appear above the collections. Create construct makes a private definition. Graveyard remains a separate destination for restore and permanent deletion.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link).
- **Steps:**
  - The user goes to Workshop, by the menu's Workshop link on any signed-in page.
  - Workshop lists the built-in constructs, then their private constructs.
- **Outcome:** The two built-in constructs are listed by name: Vellum and Lumen. Under them, their own constructs are listed by name, oldest first. With none of their own, the page says the user has none yet. Each built-in construct offers to make a copy of it, and each of their own offers to edit it or make a copy. Their own constructs also offer Create construct to make one without copying another. Each construct name opens its instructions for inspection or editing. Choose a construct when starting a quest from Quests. Another user's constructs are never listed.
- **Next:**
  - `use_case_customize_construct`: make a construct of their own from one of them.
  - `use_case_new_construct`: create a construct of their own.
  - `use_case_edit_construct`: change the name and prompt of one of theirs.
  - `use_case_customize_built_in_construct`: make a copy of a built-in construct from its page, which starts a copy of their own.
  - [`use_case_private_data`](accounts.md#use_case_private_data): their constructs are theirs alone.

## use_case_customize_construct

The user makes a construct of their own from one the user can see: the user chooses Make a copy on a built-in or private definition.

- **Prerequisites:** `use_case_view_constructs`.
- **Steps:**
  - The user chooses to make a copy of a built-in construct from the Workshop’s Constructs tab. The site makes a new construct of theirs from it and opens its page to edit.
  - Back in the Workshop’s Constructs tab, the user chooses Edit on one of their own, which opens its page.
  - Back in the Workshop’s Constructs tab, the user chooses Make a copy on one of their own. The site makes a new construct of theirs from it and opens the copy’s editor.
- **Outcome:** each new construct is named as the construct it came from, with " (copy)" after: copying Vellum gives "Vellum (copy)", and copying that gives "Vellum (copy) (copy)". The construct the user copied is unchanged and still listed. Another user never sees the new one.
- **Next:**
  - `use_case_edit_construct`: change the new construct.
  - `use_case_view_constructs`: look over the Workshop’s Constructs tab again.

## use_case_new_construct

- **Goal:** Create an own construct without copying.
- **Prerequisites:** `use_case_view_constructs`.
- **Steps:** Choose Create construct in Workshop, then edit its Name and Visual description and save.
- **Outcome:** A new private construct is created each time. It has no generated artwork or prose Instructions field. It can be chosen when starting a quest, copied, renamed or retired.
- **Next:** `use_case_edit_construct`.

## use_case_edit_construct

- **Goal:** Change an own construct’s name and appearance.
- **Prerequisites:** an own construct from `use_case_customize_construct` or `use_case_new_construct`.
- **Steps:** Edit Name and Visual description in Workshop, then Save. Leaving and returning restores browser drafts; Cancel restores the saved fields.
- **Outcome:** The list and editor show the saved name and appearance. The local look command uses the Visual description saved in the conversation’s snapshot. Existing quests retain their snapshot. Invalid names or descriptions keep the draft with feedback. Existing artwork is retained. There is no Prompt, Instructions or reset control, and submitted legacy prompt fields cannot change stored text. Foreign definitions are not found.

## use_case_customize_built_in_construct

- **Goal:** Make an editable private copy of a built-in construct.
- **Prerequisites:** `use_case_view_constructs`.
- **Steps:** Open a built-in construct’s read-only name, Visual description and artwork, then choose Make a copy.
- **Outcome:** The copy opens with editable Name and Visual description. Built-ins have no prose Instructions field and cannot be edited directly. The source stays unchanged.
- **Next:** `use_case_edit_construct`.

## use_case_view_character_profile

The user meets the construct saved in a conversation.

- **Prerequisites:** a conversation.
- **Steps:** open the portrait and name control in the conversation header.
- **Outcome:** a named profile shows the saved character's artwork, temperament, approach to quests and a representative sample line. Own characters without public personality copy show useful generic copy and initials when no art is available. Private conversational instructions and Visual descriptions never appear. The profile uses the conversation snapshot, so source edits do not change it. Opening it makes no model call. Keyboard focus stays inside the profile; Escape and Close return focus to its trigger. The profile fits a 320px phone, scrolls when needed and leaves the composer usable after closing.

### Look command

The user reads the construct’s appearance in their conversation.

- **Prerequisites:** a signed-in user and a conversation.
- **Steps:** the user sends `look` or `/look`.
- **Outcome:** the reply shows the Visual description from the conversation’s saved construct, preserving literal placeholders. It shows neither starting context nor Character Sheet instructions. A construct without a description explains that none is available. The command makes no model request.
