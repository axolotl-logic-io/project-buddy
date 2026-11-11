# Activities

The conventions for these cases are in [the index](README.md#conventions).

An activity is a set of instructions that sets the scene of a conversation. It isn't a place in the site or a choice the user makes before starting: each starting point of a quest begins in its own activity ([`use_case_new_project`](projects.md#use_case_new_project)), Chat begins in Chat, and after that only the construct changes it. The user customizes activities in the Workshop's Activities tab; the old Activities address opens that tab and makes nothing. The built-in activities include:

- **Chat:** no set scene. The construct follows her lead.
- **Brainstorm:** the construct helps her explore an idea, question her assumptions and make decisions.
- **Find something to make:** the construct helps the user discover a small achievable creative project and supports uncertainty and challenges while they make it. No idea or inspiration source is required.
- **Break Down a Project:** the construct helps her split a goal into milestones and the next small steps.

Successful saves in an own activity’s Workshop show an accessible “Saved.” confirmation. The creation action is labelled “Craft activity” to distinguish it from an own definition named “New activity”.

Built-in, starter, customized and reset prompts use `# Activity Sheet`. The separate name identifies the activity; renaming leaves the sheet heading alone. Edited instructions and existing activity snapshots keep their text.

## use_case_construct_changes_activity

The construct moves an adventure into another activity when she asks for one, or when another one clearly suits what she is doing.

- **Prerequisites:** [`use_case_send_message`](chats.md#use_case_send_message).
- **Steps:**
  - In Chat, she asks the construct to break her quest down.
  - Another time, in an adventure with no quest, she asks to break down an idea.
- **Outcome:** the construct moves the adventure into Break Down a Project, and follows its instructions in the same reply. The adventure shows a line where the change happened, including while the reply streams and after reopening the adventure. Later replies follow Break Down a Project until the activity changes again. Older requests for the retired interview enter Break Down a Project, with or without a quest. An activity she doesn't have changes nothing.

## use_case_customize_activity

The user makes an activity of her own from a built-in one, and changes it.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link).
- **Steps:**
  - She opens the built-in Break Down a Project activity. Its instructions and opening request appear as read-only Markdown, each with a heading and help text, and the Markdown's own headings sit below the field's heading. Literal placeholders such as `{{name}}` stay visible.
  - In the Workshop's Activities tab, she chooses Customize beside Brainstorm. The site makes an activity of hers named "Brainstorm (clone)" and opens its page.
  - She renames it and edits its prompt, which guides the activity. She edits the separate opening request, which tells the construct how to open a new adventure when the activity has no prepared opening. She saves. The editable fields show the original Markdown source.
  - She asks the construct to move a conversation into it, then edits it again.
  - Back in the Workshop's Activities tab, she clones it. On its page, she resets its prompt, then saves it.
- **Outcome:** her activity has her name and text, and the adventure follows her text, with any `{{name}}` replaced by her name. The adventure keeps the activity as it was when the adventure entered it, so her later edit changes only adventures that enter it afterwards. The clone is named as its source with " (clone)" after, with the same text. Reset restores the prompt from the built-in activity, preserving the separate opening request. The built-in activities never change. Her activities are hers alone: another user's activity is not found. The construct offers her own activities beside the built-in ones.
- **Variations:**
  - Bought copies and clones of bought copies have no built-in instructions to restore. Their pages explain this and offer no reset; a direct reset request is refused without changing their instructions. For other copies, Reset changes only the draft prompt. Undo reset restores its previous text; Save commits the changes. Reset preserves the name, an activity’s opening request and a spell’s when-to-use description.
- **Next:**
  - `use_case_construct_changes_activity`: ask the construct to move a conversation into it.
  - `use_case_new_activity`: craft an activity of her own.

## use_case_new_activity

The user crafts an activity of her own without copying another.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link).
- **Steps:**
  - In the Workshop's Activities tab, she chooses Craft activity. The site makes a new activity of hers and opens its page to edit.
  - She names it, writes its instructions and opening request, and saves.
  - She resets its prompt.
  - In a conversation, the construct moves the conversation into it.
- **Outcome:** the new activity is named "New activity" and starts with Chat's prompt and separate opening request. Reset restores only the prompt and preserves an edited opening request. The Workshop's Activities tab lists it with her own, and it works as any activity of hers does: she can tweak, rename and clone it, and the construct can move a conversation into it. Choosing Craft activity again makes another activity named "New activity". Another user never sees it.
- **Next:**
  - `use_case_construct_changes_activity`: the construct moves a conversation into it.
