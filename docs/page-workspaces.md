# Page workspaces

The signed-in pages below group related content under the site header's trail band, whose heading names the page, and an underlined navigation rail. The Quests index has its own layout; see [Conversations](chats.md#quests-landing-page).

| Page | Navigation | Actions and state |
| --- | --- | --- |
| Spellbook | All, Built-in, Yours filters | Search active built-in and own spells by name. Create spell opens a new private spell; each row opens View or Edit. Detail pages keep copying and retirement. Graveyard restores or deletes retired spells. |
| Profile | Name and Experience on one page | The name form's draft and feedback stay visible. Experience shows the user's circle, title and points in each ability. |
| Settings | Appearance and Security on one page | Appearance changes this browser's mode. Security has both sign-out actions; loading and error states also offer sign-out. Old Account URLs reach the corresponding content. |
| Quest | Overview and linked sections | Overview links to Tasks, Ideas, Quick Notes, Progress, Spells & status, and Members. Ordinary quests show Next task. Dailies shows Start Day, its available Undo, and Day grid. An active spell adds a conversation below the workspace. The Timer panel docks on wide screens and opens as a modal drawer on phones. |

## Navigation and drafts

Local section tabs support keyboard navigation and keep forms mounted while hidden. Profile and Settings have no local tabs: their forms and feedback remain on the page. The spell composer keeps its draft for the active cast across quest sections.

The `?section=tasks`, `?section=ideas`, `?section=progress`, `?section=notes`, `?section=members` and `?section=spells` links open their corresponding sections. Dailies also accepts `?section=days` for its Day grid. Unknown section values fall back to Overview. Each section links back to Overview. These routes keep the acting user's access checks.

The workspace uses the quest's persisted Dailies mark to choose the overview controls. Each section calls authenticated Server Actions backed by the quest stores. The Timer shares setup and display components with the standalone Timer.

## Validation

Browser coverage checks tab navigation, retained drafts, catalog actions, and quest sections. Phone checks include the additional sections at 320 and 390 CSS pixels, including long names, restore controls, appearance choices and security actions.
