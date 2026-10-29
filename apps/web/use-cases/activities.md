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
  - She chooses Start beside Brainstorming. The new chat page opens with Brainstorming chosen.
  - She leaves the project at "No project", picks a buddy and starts the chat.
  - Another time, she tries to start a chat in the project interview with no project.
- **Outcome:** the chat opens in Brainstorming, with the buddy's opening, which asks what idea she wants to explore. Every reply follows Brainstorming's instructions until the activity changes. The chat page shows its activity. Start beside the project interview leads to the new project form instead, since every project starts with its interview. The new chat page never offers the interview, and a chat with no project can't start in it: the form says the interview needs a project, and no chat is saved.
- **Variations:**
  - With no activity chosen, as from the Chats page's form, the chat starts in the open chat.
- **Next:**
  - `use_case_buddy_changes_activity`: the buddy moves the chat into another activity.
  - `use_case_change_activity`: she changes the activity herself.
  - `use_case_customize_activity`: make an activity of her own.

## use_case_buddy_changes_activity

The buddy moves a chat into another activity when she asks for one, or when another one clearly suits what she is doing.

- **Prerequisites:** [`use_case_send_message`](chats.md#use_case_send_message).
- **Steps:**
  - In an open chat, she asks the buddy to break her project down.
  - Another time, in a chat with no project, she asks the buddy to interview her about a new project.
- **Outcome:** the buddy moves the chat into Project breakdown, and follows its instructions in the same reply. The chat shows a line where the change happened, and the chat page shows the new activity once the reply has finished. Later replies follow Project breakdown until the activity changes again. A chat with no project can't enter the interview, which needs a project's memory: the buddy starts a project instead ([`use_case_project_from_standalone_chat`](chats.md#use_case_project_from_standalone_chat)), and the interview carries on in the new project's chat. An activity she doesn't have changes nothing.
- **Next:**
  - `use_case_change_activity`: she changes it back.

## use_case_change_activity

The user changes her chat's activity herself.

- **Prerequisites:** [`use_case_send_message`](chats.md#use_case_send_message).
- **Steps:**
  - On the chat page, below the chat's name, she picks another activity and chooses "Change activity".
  - She sends her next message.
- **Outcome:** the chat page shows the activity she picked, and the buddy's next reply follows it. A chat with no project doesn't offer the interview. Another user's chat can't be changed, and nothing of hers changes.
- **Next:**
  - `use_case_buddy_changes_activity`: the buddy moves the chat on again.

## use_case_customize_activity

The user makes an activity of her own from a built-in one, and changes it.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link).
- **Steps:**
  - On Activities, she chooses Customize beside Brainstorming. The site makes an activity of hers named "Brainstorming (clone)" and opens its page.
  - She renames it and edits its two parts: its instructions, which set the scene, and its opening request, which says how the buddy opens a chat that starts in it. She saves.
  - She starts a chat in it, then edits it again.
  - Back on Activities, she clones it. On its page, she resets one part.
- **Outcome:** her activity has her name and text, and the chat follows her text, with any `{{name}}` replaced by her name. The chat keeps the activity as it was when the chat entered it, so her later edit changes only chats that enter it afterwards. The clone is named as its source with " (clone)" after, with the same text. A reset part goes back to the built-in activity's text, and the other part is unchanged. The built-in activities never change. Her activities are hers alone: another user's activity is not found. The buddy offers her own activities beside the built-in ones.
- **Next:**
  - `use_case_start_chat_in_activity`: start a chat in it.
