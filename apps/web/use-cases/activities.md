# Activities

The conventions for these cases are in [the index](README.md#conventions).

An activity sets the scene a chat plays out. The site has four built-in activities:

- **Open chat:** no set scene. The buddy follows her lead.
- **Project interview:** the buddy asks about a new project, then saves its first goals and milestones to the project's memory ([`use_case_project_interview`](projects.md#use_case_project_interview)).
- **Brainstorming:** the buddy helps her explore an idea, question her assumptions and make decisions.
- **Project breakdown:** the buddy helps her split a goal into milestones and the next small steps.

## use_case_start_chat_in_activity

The user starts a chat in the activity she wants.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link).
- **Steps:**
  - She opens Activities from any signed-in page's menu. The page lists the built-in activities, each with what it is, then her own.
  - She chooses Start beside Brainstorming. The New chat modal opens on Activities with Brainstorming fixed and no Activity field.
  - She leaves the project at "No project", picks a buddy and starts the chat.
  - Another time, she chooses Start beside Project interview and selects a new or existing project.
- **Outcome:** the chat opens in Brainstorming, with the buddy's prepared opening, which asks what idea or plan she wants to explore ([`use_case_prepared_opening`](chats.md#use_case_prepared_opening)). Every reply follows Brainstorming's instructions until the activity changes. Start beside the project interview opens the New chat modal with a new project chosen, since every project starts with its interview ([`use_case_new_project_from_new_chat`](projects.md#use_case_new_project_from_new_chat)). The interview offers no standalone option. Other activities offer no project or an existing project; creating a project starts with its interview. Closing the modal creates nothing and returns focus to Start.
- **Variations:**
  - With no activity chosen, as from the Chats page's "New chat" dialog, the chat starts in the open chat.
- **Next:**
  - `use_case_buddy_changes_activity`: the buddy moves the chat into another activity.
  - `use_case_customize_activity`: make an activity of her own.
  - `use_case_new_activity`: write an activity of her own from scratch.

## use_case_buddy_changes_activity

The buddy moves a chat into another activity when she asks for one, or when another one clearly suits what she is doing.

- **Prerequisites:** [`use_case_send_message`](chats.md#use_case_send_message).
- **Steps:**
  - In an open chat, she asks the buddy to break her project down.
  - Another time, in a chat with no project, she asks the buddy to interview her about a new project.
- **Outcome:** the buddy moves the chat into Project breakdown, and follows its instructions in the same reply. The chat shows a line where the change happened, including while the reply streams and after reopening the chat. Later replies follow Project breakdown until the activity changes again. A chat with no project can't enter the interview, which needs a project's memory: the buddy starts a project instead ([`use_case_project_from_standalone_chat`](chats.md#use_case_project_from_standalone_chat)), and the interview carries on in the new project's chat. An activity she doesn't have changes nothing.

## use_case_customize_activity

The user makes an activity of her own from a built-in one, and changes it.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link).
- **Steps:**
  - She opens the built-in Project breakdown activity. Its instructions and opening request appear as read-only Markdown, each with a heading and help text, and the Markdown's own headings sit below the field's heading. Literal placeholders such as `{{name}}` stay visible.
  - On Activities, she chooses Customize beside Brainstorming. The site makes an activity of hers named "Brainstorming (clone)" and opens its page.
  - She renames it and edits its prompt, which guides the activity. She edits the separate opening request, which tells the buddy how to open a new chat when the activity has no prepared opening. She saves. The editable fields show the original Markdown source.
  - She starts a chat in it, then edits it again.
  - Back on Activities, she clones it. On its page, she resets its prompt, then saves it.
- **Outcome:** her activity has her name and text, and the chat follows her text, with any `{{name}}` replaced by her name. The chat keeps the activity as it was when the chat entered it, so her later edit changes only chats that enter it afterwards. The clone is named as its source with " (clone)" after, with the same text. Reset restores the prompt from the built-in activity, preserving the separate opening request. The built-in activities never change. Her activities are hers alone: another user's activity is not found. The buddy offers her own activities beside the built-in ones.
- **Variations:**
  - Bought copies and clones of bought copies have no built-in instructions to restore. Their pages explain this and offer no reset; a direct reset request is refused without changing their instructions. For other copies, Reset changes only the draft prompt. Undo reset restores its previous text; Save commits the changes. Reset preserves the name, an activity’s opening request and a spell’s when-to-use description.
  - On an own activity’s page, Delete asks for confirmation and names what will be removed. Existing chats keep their saved instructions. A listed copy’s dialog explains that its listing stays available until unlisted. A bought copy’s dialog explains that deletion gives no refund and buying again can cost gold. Cancelling keeps the copy.
- **Next:**
  - `use_case_start_chat_in_activity`: start a chat in it.
  - `use_case_new_activity`: write an activity of her own from scratch.

## use_case_new_activity

The user writes an activity of her own from scratch, without starting from one she can see.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link).
- **Steps:**
  - On Activities, she chooses New activity. The site makes a new activity of hers and opens its page to edit.
  - She names it, writes its instructions and opening request, and saves.
  - She resets its prompt, then starts a chat in the activity.
  - In another chat, the buddy moves the chat into it.
- **Outcome:** the new activity is named "New activity" and starts with the open chat's prompt and separate opening request. Reset restores only the prompt and preserves an edited opening request. Activities lists it with her own, and it works as any activity of hers does: she can tweak, rename and clone it, start a chat in it, and the buddy can move a chat into it. Choosing New activity again makes another activity named "New activity". Another user never sees it.
- **Next:**
  - `use_case_start_chat_in_activity`: start a chat in it.
