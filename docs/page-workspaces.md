# Page workspaces

The signed-in pages below group related content under a compact heading and an underlined navigation rail. Existing actions, permissions and saved data keep their meaning. Home, Workshop and Image gallery retain their layouts. The Quests index has its own workspace change.

| Page | Navigation | Actions and state |
| --- | --- | --- |
| Workshop | Constructs, Activities, Spells | Each kind lists built-ins and private definitions with inspection, Create, Make a copy, Edit and Retire. Retirement remains the destination for restore and permanent deletion. Old collection URLs redirect to Workshop. |
| Library | Book links, then a chapter index beside the reading | The index opens Getting Started. Existing book routes, chapter anchors, action links and related books remain available. Chapters stack below the index on phones. |
| Settings | General, Appearance | General keeps the New quest construct form. Appearance changes this browser's mode. |
| Account | Profile, Batteries, Security | Profile keeps the name form. Batteries keeps the balance, purchase options and payment status. Checkout returns and Buy batteries links select Batteries. Security keeps both sign-out actions; loading and error states also offer sign-out. |
| Quest and Journal | Conversation, Quest Journal, Plan, Progress, Versions | The quest opens on its conversation, below the workspace at full width. Each other section appears inside the quest workspace. The title editor and visible status actions remain in the heading. |

## Navigation and drafts

Local section tabs support keyboard navigation and keep forms mounted while hidden. Switching sections does not discard a typed name or form feedback. The composer saves its draft for its conversation, so leaving a quest's conversation for another section and coming back keeps the unsent message.

Quest overview sections use `?section=plan` and `?section=progress`. The default is the conversation. The Journal uses `?section=versions` for its history and shows the current Journal by default. Unknown section values fall back to the default. These routes retain the acting user's existing access checks.

## Validation

Browser coverage checks tab navigation, retained drafts, catalog actions, and quest sections. Phone checks include the additional sections at 320 and 390 CSS pixels, including long names, restore controls, appearance choices and security actions. Existing Home, Workshop and Image gallery tests remain part of the regression checks.
