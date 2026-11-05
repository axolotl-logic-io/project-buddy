# Constructs

The Constructs page lists AI characters with a name and a prompt, built in or the user's own.

The conventions for these cases are in [the index](README.md#conventions).

## use_case_view_constructs

The user looks over the Constructs page: the built-in constructs, and her own.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link).
- **Steps:**
  - She goes to the Constructs, by the header's Constructs link on any signed-in page, or by an old link to the Constructs page.
  - The site explains that her constructs are constructs, then lists the built-in constructs, then hers.
- **Outcome:** an old link to the Constructs page, or to a construct's page there, opens the Constructs or that construct's page in it. The two built-in constructs are listed by name: Vellum and Lumen. Under them, her own constructs are listed by name, oldest first. With none of her own, the page says she has none yet. Each built-in construct offers to customize it, and each of her own offers to tweak it or clone it. Her own constructs also offer a new construct, written from scratch. Each construct's name opens the New adventure modal with that construct fixed and no construct picker. The user chooses an activity and no quest or an existing quest, then starts the adventure. Closing the modal creates nothing and returns focus to the construct's name. A new quest keeps the selected construct and activity. Another user's constructs are never listed.
- **Next:**
  - `use_case_customize_construct`: make a construct of her own from one of them.
  - `use_case_new_construct`: write a construct of her own from scratch.
  - `use_case_edit_construct`: change the name and prompt of one of hers.
  - `use_case_reset_construct_part`: put her prompt back to its default.
  - `use_case_customize_built_in_construct`: customize a built-in construct from its page, which starts a copy of her own.
  - [`use_case_private_data`](accounts.md#use_case_private_data): her constructs are hers alone.

## use_case_customize_construct

The user makes a construct of her own from one she can see: she customizes a built-in one, or clones one of her own.

- **Prerequisites:** `use_case_view_constructs`.
- **Steps:**
  - She chooses to customize a built-in construct from the Constructs page. The site makes a new construct of hers from it and opens its page to edit.
  - Back in the Constructs page, she chooses to tweak one of her own, which opens its page.
  - Back in the Constructs page, she chooses to clone one of her own. The site makes a new construct of hers from it and shows the Constructs page.
- **Outcome:** each new construct is named as the construct it came from, with " (clone)" after: customizing Vellum gives "Vellum (clone)", and cloning that gives "Vellum (clone) (clone)". The construct she customized or cloned is unchanged and still listed. Another user never sees the new one.
- **Next:**
  - `use_case_edit_construct`: change the new construct.
  - `use_case_view_constructs`: look over the Constructs page again.

## use_case_new_construct

The user writes a construct of her own from scratch, without starting from one she can see.

- **Prerequisites:** `use_case_view_constructs`.
- **Steps:**
  - In the Constructs page, she chooses New construct. The site makes a new construct of hers and opens its page to edit.
  - She names it, writes one prompt describing its voice and habits, and saves.
  - She resets its prompt, then starts an adventure with the construct.
  - Back in the Constructs, she clones it.
- **Outcome:** the new construct is named "New construct" and starts with Vellum's prompt, so resetting the prompt gives back what it started with. The Constructs lists it with her own, and it works as any construct of hers does: she can tweak, rename and clone it, and choose it for a new adventure. Choosing New construct again makes another construct named "New construct". Another user never sees it.
- **Next:**
  - `use_case_edit_construct`: change it again.
  - `use_case_view_constructs`: look over the Constructs page again.

## use_case_edit_construct

The user changes one of her constructs: its name and prompt.

- **Prerequisites:** `use_case_customize_construct` or `use_case_new_construct`.
- **Steps:**
  - She opens her construct's page from the Constructs page.
  - The page shows its name and one prompt editor. Voice describes how it talks, and habits describe how it works with her; they can be headings in the prompt.
  - She edits the name, prompt and separate Visual description, and saves. Leaving and returning restores unsaved description changes; Discard changes restores the saved fields.
  - She saves a prompt that says `{{name}}`, then adventures in the construct.
- **Outcome:** the page shows the construct with her changes, and the Constructs lists it by its new name. Adventures started before keep the construct as it was. The prompt's hint says `{{name}}` is replaced with her name. A prompt that says `{{name}}` reaches her adventure's system prompt with her name ([`use_case_set_name`](accounts.md#use_case_set_name)), or "the user" when she has none, while the page and the saved construct still say `{{name}}`. The rest of the construct's instructions, such as how to use the Blender manual and the quest's Journal, are the same for every construct, and no construct changes them.
- **Variations:**
  - Another user's construct, or an id that is no construct's, is not found, and nothing changes.
- **Next:**
  - `use_case_reset_construct_part`: reset the whole prompt.
  - `use_case_view_constructs`: look over the Constructs page again.

## use_case_reset_construct_part

The user puts her construct's prompt back to its default.

- **Prerequisites:** `use_case_edit_construct`.
- **Steps:**
  - On her construct's page she chooses Reset prompt to default. The draft changes; Undo reset restores the previous text. She chooses Save to keep it.
- **Outcome:** the whole prompt returns to that of the built-in construct hers was cloned from, or to Vellum's when it was cloned from one of her own or written from scratch.
- **Variations:**
  - Bought copies and clones of bought copies have no built-in instructions to restore. Their pages explain this and offer no reset; a direct reset request is refused without changing their instructions. For other copies, Reset changes only the draft prompt. Undo reset restores its previous text; Save commits the changes. Reset preserves the Visual description and images, the saved name, an activity’s saved opening request and a spell’s saved when-to-use description. Unsaved names and other fields are preserved.
- **Next:**
  - `use_case_edit_construct`: change it again.

## use_case_customize_built_in_construct

The user customizes a built-in construct from its page: she can't change it, so the site makes her a copy to edit.

- **Prerequisites:** `use_case_view_constructs`.
- **Steps:**
  - She opens a built-in construct's page from the Constructs page. Its name, Visual description and artwork show read-only. Its prompt appears as rendered Markdown with headings and help text, and the Markdown's own headings sit below the prompt's heading; literal placeholders such as `{{name}}` stay visible.
  - She chooses to customize it.
- **Outcome:** the site makes a construct of hers named as the built-in one with " (clone)" after, as customizing from the Constructs page does, and opens its page to edit the original Markdown source in one textarea. The built-in construct is unchanged.
- **Next:**
  - `use_case_edit_construct`: change the copy.

## use_case_generate_construct_images

The user generates images for an own construct in the Workshop.

- **Prerequisites:** `use_case_edit_construct`.
- **Steps:**
  - The user saves a Visual description. Unsaved name, prompt or description edits disable Generate Images with a save-first explanation.
  - The page shows the current gold reservation and whether generation is available.
  - The user chooses Generate Images. Avatar, portrait, opening and working previews show each role’s state.
  - While a request is pending, the user can check its status or reload without starting another paid request.
- **Outcome:** a successful generation updates previews without resetting drafts. One canonical image supplies the roles through framing. Existing adventures keep their snapshots. Changed descriptions or prompts mark saved generated art outdated.
- **Variations:** unavailable generation, lack of gold, failed requests and stale results keep existing good images and edits. A lost response requires a status check before another request. Retry after a confirmed terminal failure uses a new UUID and may spend gold. Built-ins offer Customize instead of generation. Missing art uses initials. Controls and previews fit 320 px and work with reduced motion.
