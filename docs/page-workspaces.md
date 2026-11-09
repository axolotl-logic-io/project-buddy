# Page workspaces

The signed-in pages below group related content under a compact heading and an underlined navigation rail. Existing actions, permissions and saved data keep their meaning. Home, Workshop and Image gallery retain their layouts. The Quests index has its own workspace change.

| Page | Navigation | Actions and state |
| --- | --- | --- |
| Adventures | All adventures, Quest adventures, Standalone | New adventure stays in the heading. The quest filter is shared between All and Quest adventures; Standalone shows adventures without a quest. |
| Adventure | Conversation, Quest Journal, Quick Notes, Progress | Quest links navigate to the existing quest routes. Standalone adventures have only Conversation. The conversation and composer keep their scrolling behavior. |
| Constructs, Activities, Spellbook | Built-in, Yours, Retired | Craft is in the heading. Existing start, customize, edit, clone, retire, restore and delete actions remain available in their sections. Retired entries are filtered to the current kind. Workshop keeps its original shared list view. |
| Marketplace | All, Constructs, Activities, Spells, Your listings | Kind and pagination links retain their URLs. Your listings uses `?view=yours`. Orb balance and purchase availability stay visible. Open Workshop leads to definitions the user can sell. |
| Library | Book links, then a chapter index beside the reading | The index opens Getting Started. Existing book routes, chapter anchors, action links and related books remain available. Chapters stack below the index on phones. |
| Quick Note | Write, Preview | The heading's Save Quick Note submits the same form from either tab. Preview shows the selected quest and the text as one line. Submitting returns to Write so feedback and focus remain visible. Switching tabs keeps the draft. |
| Settings | General, Appearance, Extras, Notifications | General keeps the New quest construct form. Appearance changes this browser's mode. Extras retain their immediate saves. Notifications appears only when configured and applies to the current device. |
| Account | Profile, Batteries, Security | Profile keeps the name form. Batteries keeps the balance, purchase options and payment status. Checkout returns and Buy batteries links select Batteries. Security keeps both sign-out actions; loading and error states also offer sign-out. |
| Quest and Journal | Adventures, Quest Journal, Progress, Quick Notes, Versions, Members and check-ins | One selected section appears inside the quest workspace. The title editor and visible status actions remain in the heading. Member and check-in permissions remain unchanged. |

## Navigation and drafts

Local section tabs support keyboard navigation and keep forms mounted while hidden. Switching sections does not discard a typed name, Quick Note or form feedback. The Adventures list unmounts inactive lists to keep each adventure's accessible identifiers unique; its filter selection belongs to the containing page and survives tab switches.

Quest overview sections use `?section=progress`, `?section=notes` and `?section=members`. The default remains Adventures. The Journal uses `?section=versions` for its history and shows the current Journal by default. Unknown section values fall back to the default. These routes retain the acting user's existing access checks.

## Validation

Browser coverage checks tab navigation, retained drafts, saving a Quick Note from Preview, catalog actions, quest sections and Marketplace navigation. Phone checks include the additional sections at 320 and 390 CSS pixels, including long names, restore controls, appearance choices and security actions. Existing Home, Workshop and Image gallery tests remain part of the regression checks.
