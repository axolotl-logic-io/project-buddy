# Activities

The conventions for these cases are in [the index](README.md#conventions).

An activity sets the scene an adventure plays out. The site has three built-in activities:

- **Open adventure:** no set scene. The construct follows her lead.
- **Brainstorming:** the construct helps her explore an idea, question her assumptions and make decisions.
- **Project Breakdown:** the construct helps her split a goal into milestones and the next small steps.

## use_case_start_chat_in_activity

The user starts an adventure in the activity she wants.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link).
- **Steps:**
  - She opens Activities from any signed-in page's menu. The page lists the built-in activities, each with what it is, then her own.
  - She chooses the Brainstorming title. The New adventure modal opens on Activities with Brainstorming fixed and no Activity field.
  - She leaves the quest at "No quest", picks a construct and starts the adventure.
  - Another time, she chooses Project Breakdown and selects a new or existing quest.
- **Outcome:** the adventure opens in Brainstorming, with the construct's prepared opening, which asks what idea or plan she wants to explore ([`use_case_prepared_opening`](chats.md#use_case_prepared_opening)). Every reply follows Brainstorming's instructions until the activity changes. Every activity offers no quest, an existing quest or a new quest. A new quest keeps the chosen activity and construct. Closing the modal creates nothing and returns focus to the activity title.
- **Variations:**
  - With no activity chosen, as from the Adventures page's "New adventure" dialog, the adventure starts in the open adventure.
- **Next:**
  - `use_case_construct_changes_activity`: the construct moves the adventure into another activity.
  - `use_case_customize_activity`: make an activity of her own.
  - `use_case_new_activity`: write an activity of her own from scratch.

## use_case_construct_changes_activity

The construct moves an adventure into another activity when she asks for one, or when another one clearly suits what she is doing.

- **Prerequisites:** [`use_case_send_message`](chats.md#use_case_send_message).
- **Steps:**
  - In an open adventure, she asks the construct to break her quest down.
  - Another time, in an adventure with no quest, she asks to break down an idea.
- **Outcome:** the construct moves the adventure into Project Breakdown, and follows its instructions in the same reply. The adventure shows a line where the change happened, including while the reply streams and after reopening the adventure. Later replies follow Project Breakdown until the activity changes again. Older requests for the retired interview enter Project Breakdown, with or without a quest. An activity she doesn't have changes nothing.

## use_case_customize_activity

The user makes an activity of her own from a built-in one, and changes it.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link).
- **Steps:**
  - She opens the built-in Project Breakdown activity. Its instructions and opening request appear as read-only Markdown, each with a heading and help text, and the Markdown's own headings sit below the field's heading. Literal placeholders such as `{{name}}` stay visible.
  - On Activities, she chooses Customize beside Brainstorming. The site makes an activity of hers named "Brainstorming (clone)" and opens its page.
  - She renames it and edits its prompt, which guides the activity. She edits the separate opening request, which tells the construct how to open a new adventure when the activity has no prepared opening. She saves. The editable fields show the original Markdown source.
  - She starts an adventure in it, then edits it again.
  - Back on Activities, she clones it. On its page, she resets its prompt, then saves it.
- **Outcome:** her activity has her name and text, and the adventure follows her text, with any `{{name}}` replaced by her name. The adventure keeps the activity as it was when the adventure entered it, so her later edit changes only adventures that enter it afterwards. The clone is named as its source with " (clone)" after, with the same text. Reset restores the prompt from the built-in activity, preserving the separate opening request. The built-in activities never change. Her activities are hers alone: another user's activity is not found. The construct offers her own activities beside the built-in ones.
- **Variations:**
  - Bought copies and clones of bought copies have no built-in instructions to restore. Their pages explain this and offer no reset; a direct reset request is refused without changing their instructions. For other copies, Reset changes only the draft prompt. Undo reset restores its previous text; Save commits the changes. Reset preserves the name, an activity’s opening request and a spell’s when-to-use description.
- **Next:**
  - `use_case_start_chat_in_activity`: start an adventure in it.
  - `use_case_new_activity`: write an activity of her own from scratch.

## use_case_new_activity

The user writes an activity of her own from scratch, without starting from one she can see.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link).
- **Steps:**
  - On Activities, she chooses New activity. The site makes a new activity of hers and opens its page to edit.
  - She names it, writes its instructions and opening request, and saves.
  - She resets its prompt, then starts an adventure in the activity.
  - In another adventure, the construct moves the adventure into it.
- **Outcome:** the new activity is named "New activity" and starts with the open adventure's prompt and separate opening request. Reset restores only the prompt and preserves an edited opening request. Activities lists it with her own, and it works as any activity of hers does: she can tweak, rename and clone it, start an adventure in it, and the construct can move an adventure into it. Choosing New activity again makes another activity named "New activity". Another user never sees it.
- **Next:**
  - `use_case_start_chat_in_activity`: start an adventure in it.
