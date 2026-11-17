# Page workspaces

The signed-in pages below group related content under the site header's trail band, whose heading names the page, and an underlined navigation rail. The Quests index has its own layout; see [Conversations](chats.md#quests-landing-page).

| Page | Navigation | Actions and state |
| --- | --- | --- |
| Spellbook | All, Built-in, Yours filters | Search active built-in and own spells by name. Create spell opens a new private spell; each row opens View or Edit. Detail pages keep copying and retirement. Graveyard restores or deletes retired spells. |
| Profile | Name and Experience on one page | The name form's draft and feedback stay visible. Experience shows the user's circle, title and points in each ability. |
| Settings | Appearance and Security on one page | Appearance changes this browser's mode. Security has both sign-out actions; loading and error states also offer sign-out. Old Account URLs reach the corresponding content. |
| Quest | Conversation with a tailored sidebar | Ordinary quests put the live Next task above direct Tasks, Ideas, Quick Notes and Progress tabs. Dailies puts Start Day and its available Undo above Tasks, Day grid, Quick Notes, Ideas and Progress. Spells & status and Members are disclosures below the collections. The shared shell docks on wide screens and opens as a modal phone drawer. Its heading and close control align with the trail band. Editors stay mounted across collection changes, disclosures and collapse. |

## Navigation and drafts

Local section tabs support keyboard navigation and keep forms mounted while hidden. Profile and Settings have no local tabs: their forms and feedback remain on the page. Switching sections elsewhere does not discard a typed draft or form feedback. The composer saves its draft for its conversation, so leaving a quest's conversation for another section and coming back keeps the unsent message.

The `?section=tasks`, `?section=ideas`, `?section=progress`, `?section=notes`, `?section=members` and `?section=actions` links still open that collection or disclosure. Dailies also accepts `?section=days` for its Day grid. Unknown values fall back to the conversation. The sidebar defaults to Tasks when opened. These routes keep the acting user's access checks.

`questConversation` selects DailiesPanel using the quest's persisted Dailies mark, never its editable name. DailiesPanel owns the day controls and recurring history; QuestPanel owns live next-task context and ongoing collections. ConversationPanel owns docking, the dialog, header controls and focus restoration. PanelCollections shares tab mounting and bucket metadata; the Control desk editors keep their own behavior. The chat runtime and its scroll controller stay outside these domain compositions.

## Validation

Browser coverage checks tab navigation, retained drafts, catalog actions, and quest sections. Phone checks include the additional sections at 320 and 390 CSS pixels, including long names, restore controls, appearance choices and security actions.
