# Page workspaces

The signed-in pages below group related content under the site header's trail band, whose heading names the page, and an underlined navigation rail. The Quests index has its own layout; see [Conversations](chats.md#quests-landing-page).

| Page | Navigation | Actions and state |
| --- | --- | --- |
| Workshop | Constructs, Spells | Constructs keeps Create, Make a copy, Edit and Retire. Spells explains only Tasks and Brainstorm, with no creation or editing controls. Retirement remains the destination for restore and permanent deletion. |
| Profile | Name and Experience on one page | The name form's draft and feedback stay visible. Experience shows the user's circle, title and points in each ability. |
| Settings | Appearance and Security on one page | Appearance changes this browser's mode. Security has both sign-out actions; loading and error states also offer sign-out. Old Account URLs reach the corresponding content. |
| Quest | Conversation with a tabbed sidebar | Tasks, Ideas, Progress, Quick Notes, Actions and Members share a collapsible sidebar flush with the right page edge. Its top row, as tall as the trail band so the lines under them meet, holds three tabs: Buckets, Actions and Members. Buckets opens a menu of Tasks, Ideas, Quick Notes and Progress, which hangs from the tab and checks the open bucket; the chosen bucket's name heads the panel. The three tabs fit one row at 320 px, so the row neither wraps nor scrolls. Its top edge follows the visible bottom of the full site header as the page scrolls, keeping the title band clear. One panel icon opens or collapses it. Wide screens show it beside the conversation; phones start collapsed and open a modal drawer. Escape closes the drawer and returns focus to the toggle. Switching tabs or buckets, or collapsing the sidebar, preserves drafts. The conversation starts below the site header’s trail band. The Actions tab holds the spell picker and, for an Active Dailies quest, Start Day; nothing sits above the tabs. Quest status changes use composer commands. |

## Navigation and drafts

Local section tabs support keyboard navigation and keep forms mounted while hidden. Profile and Settings have no local tabs: their forms and feedback remain on the page. Switching sections elsewhere does not discard a typed draft or form feedback. The composer saves its draft for its conversation, so leaving a quest's conversation for another section and coming back keeps the unsent message.

The `?section=tasks`, `?section=ideas`, `?section=progress`, `?section=notes`, `?section=members` and `?section=actions` links open that sidebar section beside the conversation; a bucket's link opens the Buckets tab with that bucket chosen. The default opens Tasks. Start Day begins a new day in the Dailies quest, as [Dailies](dailies.md) describes. Unknown section values fall back to the default. These routes keep the acting user's access checks.

## Validation

Browser coverage checks tab navigation, retained drafts, catalog actions, and quest sections. Phone checks include the additional sections at 320 and 390 CSS pixels, including long names, restore controls, appearance choices and security actions.
