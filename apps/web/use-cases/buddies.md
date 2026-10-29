# Buddies

The conventions for these cases are in [the index](README.md#conventions).

## use_case_view_buddies

The user looks over the buddies: the built-in ones, and her own.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link).
- **Steps:**
  - She goes to her buddies, by the header's Buddies link on any signed-in page.
  - The site lists the built-in buddies, then hers.
- **Outcome:** the six built-in buddies are listed by name: Hippy, Mr. Tee, Fjord Tines, Span Tines, Argon Sprangler and Roland Dustchain. Under them, her own buddies are listed by name, oldest first. With none of her own, the page says she has none yet. Each built-in buddy offers to customize it, and each of her own offers to tweak it or clone it. Each buddy's name opens its page. Another user's buddies are never listed.
- **Variations:**
  - She follows an old link or bookmark to `/personas`, or to a buddy's page under it: the site sends her, permanently, to the same page under `/buddies`, with the same query.
- **Next:**
  - `use_case_customize_buddy`: make a buddy of her own from one of them.
  - `use_case_edit_buddy`: change the name and prompt parts of one of hers.
  - `use_case_reset_buddy_part`: put one part of hers back to its default.
  - `use_case_customize_built_in_buddy`: customize a built-in buddy from its page, which starts a copy of her own.
  - [`use_case_private_data`](accounts.md#use_case_private_data): her buddies are hers alone.

## use_case_customize_buddy

The user makes a buddy of her own from one she can see: she customizes a built-in one, or clones one of her own.

- **Prerequisites:** `use_case_view_buddies`.
- **Steps:**
  - She chooses to customize a built-in buddy from her buddies. The site makes a new buddy of hers from it and opens its page to edit.
  - Back on her buddies, she chooses to tweak one of her own, which opens its page.
  - Back on her buddies, she chooses to clone one of her own. The site makes a new buddy of hers from it and shows her buddies.
- **Outcome:** each new buddy is named as the buddy it came from, with " (clone)" after: customizing Hippy gives "Hippy (clone)", and cloning that gives "Hippy (clone) (clone)". The buddy she customized or cloned is unchanged and still listed. Another user never sees the new one.
- **Next:**
  - `use_case_edit_buddy`: change the new buddy.
  - `use_case_view_buddies`: look over her buddies again.

## use_case_edit_buddy

The user changes one of her buddies: its name and the parts of its prompt.

- **Prerequisites:** `use_case_customize_buddy`.
- **Steps:**
  - She opens her buddy's page from her buddies.
  - The page shows its name and the two parts of its prompt, each labelled: its voice, which is how it talks, and its habits, which are how it works with her.
  - She edits the name and parts, and saves.
  - She saves a voice that says `{{name}}`, then chats in the buddy.
- **Outcome:** the page shows the buddy with her changes, and her buddies list it by its new name. Chats started before keep the buddy as it was. Each part's hint says `{{name}}` is replaced with her name. A part that says `{{name}}` reaches her chat's system prompt with her name ([`use_case_set_name`](accounts.md#use_case_set_name)), or "the user" when she has none, while the page and the saved buddy still say `{{name}}`. The rest of the buddy's instructions, such as how to use the Blender manual and the project's memory, are the same for every buddy, and no buddy changes them.
- **Variations:**
  - Another user's buddy, or an id that is no buddy's, is not found, and nothing changes.
- **Next:**
  - `use_case_reset_buddy_part`: undo a change to one part.
  - `use_case_view_buddies`: look over her buddies again.

## use_case_reset_buddy_part

The user puts one part of her buddy back to its default.

- **Prerequisites:** `use_case_edit_buddy`.
- **Steps:**
  - On her buddy's page she chooses "Reset to default" beside a part.
- **Outcome:** that part shows its default and the other part is unchanged. The voice and habits go back to those of the built-in buddy hers was cloned from, or to Hippy's when it was cloned from one of her own.
- **Next:**
  - `use_case_edit_buddy`: change it again.

## use_case_customize_built_in_buddy

The user customizes a built-in buddy from its page: she can't change it, so the site makes her a copy to edit.

- **Prerequisites:** `use_case_view_buddies`.
- **Steps:**
  - She opens a built-in buddy's page from her buddies. Its name and both parts show read-only.
  - She chooses to customize it.
- **Outcome:** the site makes a buddy of hers named as the built-in one with " (clone)" after, as customizing from her buddies does, and opens its page to edit. The built-in buddy is unchanged.
- **Next:**
  - `use_case_edit_buddy`: change the copy.
