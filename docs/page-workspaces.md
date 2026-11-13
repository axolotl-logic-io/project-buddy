# Page workspaces

The signed-in pages below group related content under the site header's trail band, whose heading names the page, and an underlined navigation rail. Existing actions, permissions and saved data keep their meaning. Workshop and Image gallery retain their layouts. The Quests index has its own workspace change.

| Page | Navigation | Actions and state |
| --- | --- | --- |
| Workshop | Constructs, Spells | Constructs keeps Create, Make a copy, Edit and Retire. Spells explains only Plan and Brainstorm, with no creation or editing controls. Retirement remains the destination for restore and permanent deletion. Old collection URLs redirect to Workshop. |
| Library | Book links, then a chapter index beside the reading | The index opens Getting Started. Existing book routes, chapter anchors, action links and related books remain available. Chapters stack below the index on phones. |
| Settings | Profile, Appearance, New quest construct, Batteries, Security on one page | Forms and feedback stay visible. Appearance changes this browser's mode. Batteries keeps balance, purchase options and payment status. Security keeps both sign-out actions; loading and error states also offer sign-out. Old Account URLs preserve queries and reach the corresponding content. |
| Quest | Conversation with an accordion side menu | Plan, Ideas and Progress share a side menu, with Minimize, Medium and Full screen controls. On phones the menu sits above the conversation. Full screen opens a modal with keyboard focus contained; Escape returns to Medium. Accordion sections and size changes keep drafts mounted. The construct portrait and Quest actions remain in the compact header; the section navigation rail is removed. |

## Navigation and drafts

Local section tabs support keyboard navigation and keep forms mounted while hidden. Settings has no local tabs: its forms and feedback remain on the page. Switching sections elsewhere does not discard a typed draft or form feedback. The composer saves its draft for its conversation, so leaving a quest's conversation for another section and coming back keeps the unsent message.

Existing `?section=plan`, `?section=ideas` and `?section=progress` links open that accordion section beside the conversation. The default opens Plan. Unknown section values fall back to the default. These routes retain the acting user's existing access checks.

## Validation

Browser coverage checks tab navigation, retained drafts, catalog actions, and quest sections. Phone checks include the additional sections at 320 and 390 CSS pixels, including long names, restore controls, appearance choices and security actions. Existing Workshop and Image gallery tests remain part of the regression checks.
