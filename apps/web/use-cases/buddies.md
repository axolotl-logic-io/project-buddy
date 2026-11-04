# Buddies

The conventions for these cases are in [the index](README.md#conventions).

## use_case_view_buddies

The user looks over the buddies: the built-in ones, and her own.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link).
- **Steps:**
  - She goes to her buddies, by the header's Buddies link on any signed-in page.
  - The site lists the built-in buddies, then hers.
- **Outcome:** the six built-in buddies are listed by name: Hippy, Mr. Tee, Fjord Tines, Span Tines, Argon Sprangler and Roland Dustchain. Under them, her own buddies are listed by name, oldest first. With none of her own, the page says she has none yet. Each built-in buddy offers to customize it, and each of her own offers to tweak it or clone it. Her own buddies also offer a new buddy, written from scratch. Each buddy's name opens its page. Another user's buddies are never listed.
- **Next:**
  - `use_case_customize_buddy`: make a buddy of her own from one of them.
  - `use_case_new_buddy`: write a buddy of her own from scratch.
  - `use_case_edit_buddy`: change the name and prompt of one of hers.
  - `use_case_reset_buddy_part`: put her prompt back to its default.
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

## use_case_new_buddy

The user writes a buddy of her own from scratch, without starting from one she can see.

- **Prerequisites:** `use_case_view_buddies`.
- **Steps:**
  - On her buddies, she chooses New buddy. The site makes a new buddy of hers and opens its page to edit.
  - She names it, writes one prompt describing its voice and habits, and saves.
  - She resets its prompt, then starts a chat with the buddy.
  - Back on her buddies, she clones it.
- **Outcome:** the new buddy is named "New buddy" and starts with Hippy's prompt, so resetting the prompt gives back what it started with. Her buddies list it with her own, and it works as any buddy of hers does: she can tweak, rename and clone it, and choose it for a new chat. Choosing New buddy again makes another buddy named "New buddy". Another user never sees it.
- **Next:**
  - `use_case_edit_buddy`: change it again.
  - `use_case_view_buddies`: look over her buddies again.

## use_case_edit_buddy

The user changes one of her buddies: its name and prompt.

- **Prerequisites:** `use_case_customize_buddy` or `use_case_new_buddy`.
- **Steps:**
  - She opens her buddy's page from her buddies.
  - The page shows its name and one prompt editor. Voice describes how it talks, and habits describe how it works with her; they can be headings in the prompt.
  - She edits the name and prompt, and saves.
  - She saves a prompt that says `{{name}}`, then chats in the buddy.
- **Outcome:** the page shows the buddy with her changes, and her buddies list it by its new name. Chats started before keep the buddy as it was. The prompt's hint says `{{name}}` is replaced with her name. A prompt that says `{{name}}` reaches her chat's system prompt with her name ([`use_case_set_name`](accounts.md#use_case_set_name)), or "the user" when she has none, while the page and the saved buddy still say `{{name}}`. The rest of the buddy's instructions, such as how to use the Blender manual and the project's memory, are the same for every buddy, and no buddy changes them.
- **Variations:**
  - Another user's buddy, or an id that is no buddy's, is not found, and nothing changes.
- **Next:**
  - `use_case_reset_buddy_part`: reset the whole prompt.
  - `use_case_view_buddies`: look over her buddies again.

## use_case_reset_buddy_part

The user puts her buddy's prompt back to its default.

- **Prerequisites:** `use_case_edit_buddy`.
- **Steps:**
  - On her buddy's page she chooses Reset prompt to default. The draft changes; Undo reset restores the previous text. She chooses Save to keep it.
- **Outcome:** the whole prompt returns to that of the built-in buddy hers was cloned from, or to Hippy's when it was cloned from one of her own or written from scratch.
- **Variations:**
  - Bought copies and clones of bought copies have no built-in instructions to restore. Their pages explain this and offer no reset; a direct reset request is refused without changing their instructions. For other copies, Reset changes only the draft prompt. Undo reset restores its previous text; Save commits the changes. Reset preserves the saved name, an activity’s saved opening request and a spell’s saved when-to-use description. Unsaved names and other fields are preserved.
  - On an own buddy’s page, Delete asks for confirmation and names what will be removed. Existing chats keep their saved instructions. A listed copy’s dialog explains that its listing stays available until unlisted. A bought copy’s dialog explains that deletion gives no refund and buying again can cost gold. Cancelling keeps the copy.
- **Next:**
  - `use_case_edit_buddy`: change it again.

## use_case_customize_built_in_buddy

The user customizes a built-in buddy from its page: she can't change it, so the site makes her a copy to edit.

- **Prerequisites:** `use_case_view_buddies`.
- **Steps:**
  - She opens a built-in buddy's page from her buddies. Its name shows read-only. Its prompt appears as rendered Markdown with headings and help text, and the Markdown's own headings sit below the prompt's heading; literal placeholders such as `{{name}}` stay visible.
  - She chooses to customize it.
- **Outcome:** the site makes a buddy of hers named as the built-in one with " (clone)" after, as customizing from her buddies does, and opens its page to edit the original Markdown source in one textarea. The built-in buddy is unchanged.
- **Next:**
  - `use_case_edit_buddy`: change the copy.
