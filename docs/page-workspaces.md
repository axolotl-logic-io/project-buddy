# Page workspaces

The signed-in pages below group related content under a compact heading and an underlined navigation rail. Existing actions, permissions and saved data keep their meaning. Workshop and Image gallery retain their layouts. The Quests index has its own workspace change.

| Page | Navigation | Actions and state |
| --- | --- | --- |
| Constructs, Activities, Spellbook | Built-in, Yours, Retired | Craft is in the heading. Existing start, customize, edit, clone, retire, restore and delete actions remain available in their sections. Retired entries are filtered to the current kind. Workshop keeps its original shared list view. |
| Library | Book links, then a chapter index beside the reading | The index opens Getting Started. Existing book routes, chapter anchors, action links and related books remain available. Chapters stack below the index on phones. |
| Settings | Profile, Appearance, New quest construct, Batteries, Security on one page | Forms and feedback stay visible. Appearance changes this browser's mode. Batteries keeps balance, purchase options and payment status. Security keeps both sign-out actions; loading and error states also offer sign-out. Old Account URLs preserve queries and reach the corresponding content. |
| Quest and Journal | Conversation, Quest Journal, Plan, Progress, Versions | The quest opens on its conversation, below the workspace at full width. Each other section appears inside the quest workspace. The title editor and visible status actions remain in the heading. |

## Navigation and drafts

Local section tabs support keyboard navigation and keep forms mounted while hidden. Settings has no local tabs: its forms and feedback remain on the page. Switching sections elsewhere does not discard a typed draft or form feedback. The composer saves its draft for its conversation, so leaving a quest's conversation for another section and coming back keeps the unsent message.

Quest overview sections use `?section=plan` and `?section=progress`. The default is the conversation. The Journal uses `?section=versions` for its history and shows the current Journal by default. Unknown section values fall back to the default. These routes retain the acting user's existing access checks.

## Validation

Browser coverage checks tab navigation, retained drafts, catalog actions, and quest sections. Phone checks include the additional sections at 320 and 390 CSS pixels, including long names, restore controls, appearance choices and security actions. Existing Workshop and Image gallery tests remain part of the regression checks.
