# Page workspaces

The signed-in pages below group related content under a compact heading and an underlined navigation rail. Existing actions, permissions and saved data keep their meaning. Home, Workshop and Image gallery retain their layouts. The Quests index has its own workspace change.

| Page | Navigation | Actions and state |
| --- | --- | --- |
| Constructs, Activities, Spellbook | Built-in, Yours, Retired | Craft is in the heading. Existing start, customize, edit, clone, retire, restore and delete actions remain available in their sections. Retired entries are filtered to the current kind. Workshop keeps its original shared list view. |
| Marketplace | All, Constructs, Activities, Spells, Your listings | Kind and pagination links retain their URLs. Your listings uses `?view=yours`. Orb balance and purchase availability stay visible. Open Workshop leads to definitions the user can sell. |
| Library | Book links, then a chapter index beside the reading | The index opens Getting Started. Existing book routes, chapter anchors, action links and related books remain available. Chapters stack below the index on phones. |
| Quick Note | Write, Preview | The heading's Save Quick Note submits the same form from either tab. Preview shows the selected quest and the text as one line. Submitting returns to Write so feedback and focus remain visible. Switching tabs keeps the draft. |
| Settings | Profile, Appearance, New quest construct, Batteries, Security on one page | Forms and feedback stay visible. Appearance changes this browser's mode. Batteries keeps balance, purchase options and payment status. Security keeps both sign-out actions; loading and error states also offer sign-out. Old Account URLs redirect here with query and fragment intact. |
| Quest and Journal | Conversation, Quest Journal, Plan, Progress, Quick Notes, Versions, Members | The quest opens on its conversation, below the workspace at full width. Each other section appears inside the quest workspace. The title editor and visible status actions remain in the heading. Member permissions remain unchanged. |
## Navigation and drafts

Local section tabs support keyboard navigation and keep forms mounted while hidden. Settings has no local tabs: its forms and feedback remain on the page. Switching sections elsewhere does not discard a typed draft or form feedback. The composer saves its draft for its conversation, so leaving a quest's conversation for another section and coming back keeps the unsent message.

Quest overview sections use `?section=plan`, `?section=progress`, `?section=notes` and `?section=members`. The default is the conversation. The Journal uses `?section=versions` for its history and shows the current Journal by default. Unknown section values fall back to the default. These routes retain the acting user's existing access checks.

## Validation

Browser coverage checks tab navigation, retained drafts, saving a Quick Note from Preview, catalog actions, quest sections and Marketplace navigation. Phone checks include the additional sections at 320 and 390 CSS pixels, including long names, restore controls, appearance choices and security actions. Existing Home, Workshop and Image gallery tests remain part of the regression checks.
