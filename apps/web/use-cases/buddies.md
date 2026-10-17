# Buddies

The conventions for these cases are in [the index](README.md#conventions).

## use_case_view_buddies

The user looks over the tutor's buddies: the built-in ones, and her own.

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
  - The page shows its name and the parts of its prompt that are the buddy's own, each labelled: voice, teaching rules and role. The parts the app relies on (shared rules, citations, the project interview, the memory's lines, the three tools' descriptions, the kickoffs and the answer-now note) are hidden until she switches on "Buddy prompt mechanics" in Settings, which starts off.
  - She edits the name and parts, and saves. Parts that are hidden are saved unchanged.
  - She switches on "Buddy prompt mechanics" in Settings and opens the page again: every part shows, and the parts the app relies on warn that changing them can break citations, the project's memory or search.
  - She saves a voice that says `{{name}}`, then chats in the buddy.
- **Outcome:** the page shows the buddy with her changes, and her buddies list it by its new name. Chats started before keep the buddy as it was. The hint of each part the system prompt reads (voice, teaching rules, role, shared rules, citations, the interview, the central chat and the memory's lines) says `{{name}}` is replaced with her name. A part that says `{{name}}` reaches her chat's system prompt with her name ([`use_case_set_name`](accounts.md#use_case_set_name)), or "the user" when she has none, while the page and the saved buddy still say `{{name}}`. The page also shows, read-only, what no buddy changes: the parts filled in for each chat (the project's memory, the project's name, the date and the manual's version), the tools' input fields with their descriptions, and the `<project_memory>` tags around the memory.
- **Variations:**
  - Another user's buddy, or an id that is no buddy's, is not found, and nothing changes.
- **Next:**
  - `use_case_reset_buddy_part`: undo a change to one part.
  - `use_case_view_buddies`: look over her buddies again.

## use_case_reset_buddy_part

The user puts one part of her buddy back to its default.

- **Prerequisites:** `use_case_edit_buddy`.
- **Steps:**
  - With "Buddy prompt mechanics" switched on in Settings, so every part shows, on her buddy's page she chooses "Reset to default" beside a part. With it off, only the voice, teaching rules and role show, each with its reset.
- **Outcome:** that part shows its default and every other part is unchanged. The voice and teaching rules go back to those of the built-in buddy hers was cloned from, or to Hippy's when it was cloned from one of her own; every other part goes back to the text every buddy starts with.
- **Next:**
  - `use_case_edit_buddy`: change it again.

## use_case_customize_built_in_buddy

The user customizes a built-in buddy from its page: she can't change it, so the site makes her a copy to edit.

- **Prerequisites:** `use_case_view_buddies`.
- **Steps:**
  - She opens a built-in buddy's page from her buddies. Its name and every part show read-only, with the parts no buddy changes.
  - She chooses to customize it.
- **Outcome:** the site makes a buddy of hers named as the built-in one with " (clone)" after, as customizing from her buddies does, and opens its page to edit. The built-in buddy is unchanged.
- **Next:**
  - `use_case_edit_buddy`: change the copy.
