# Conversations

## Conversations

A quest has one continuing conversation (`src/conversations/`), stored as a `chats` row marked `continuing`. A partial unique index allows one per quest, so finding or making one is atomic: concurrent starts reach the same conversation, and only the request that made it writes its opening. Reading a quest's conversation (`readQuestConversation`) never starts one.

A conversation keeps the construct it started with. Casting or stopping a spell changes where subsequent ordinary messages are saved. A reply reads the conversation's newest `CONVERSATION_WINDOW` messages (60, `src/replies/conversation-to-answer.ts`), with the quest's Tasks and newest milestones in its instructions, so a long-running quest never sends its whole history.

## Start a quest

On Quests, choose Dailies, Learn a thing, Make a thing or Do a thing to open the shared start form. Each starting point assigns its construct. Edit the name and starting context, and optionally fill in Why. Confirming creates the quest and its one conversation, with the supplied context followed by the construct's opening. Tasks and Ideas start empty, with no active spell.

Failed openings save nothing and keep the form's edits for retry. Cancel, Close and Escape create nothing. Dailies resumes the existing Dailies quest when the user already has one. See [Premade quests](premade-quests.md).

## Quests landing page

Quests (`/quests`) opens after sign-in when no explicit return destination was supplied. The site name and root address lead there too. Signed-out visitors need to sign in. Opening these pages makes no model call.

Quests is laid out flush on the page, as Workshop is: its heading and introduction, then Continue, for the user's current quest, then Start a quest's four tiles, Dailies, Learn a thing, Make a thing and Do a thing, then the user's quests under Active, Completed and Abandoned tabs. Continue names the user's own Active quest whose conversation was most recently active, with its next step, and opens its conversation; with no Active quest it is absent (`src/quests/current-quest-store.ts`). Reading it makes no model call.

## Spells and constructs

A quest conversation can have Tasks or Brainstorm active, or neither. Cast one to save subsequent ordinary messages into Tasks or Ideas, and stop it with the button beside the composer or the stop command. Reopening preserves the active spell. New conversations start with no active spell. See [Spells](spellbook.md).

Workshop edits constructs and spells and explains the built-in spells.

## Behavioral evidence

The [conversation use cases](../apps/web/use-cases/chats.md) describe quest conversation behavior.

Conversation behavior stays in Vitest. Playwright covers authentication flows only. Server and authentication runs require the non-production test database and file email outbox, guarded by `checkTestEnvironment`; never substitute a production database.

## Conversation header

A quest's conversation starts below the site header's trail band, without a separate portrait bar. The trail band names the quest and keeps its rename pencil pinned. An Active Dailies quest's conversation also shows the construct's portrait above its messages. Quest status changes use `/complete`, `/abandon` and `/restore` in the composer. Scroll clearance keeps quest messages below the trail band.

## Message authors

Each user message records its author, the user who sent it, in the nullable column `messages.user_id`. A message with no author recorded belongs to the quest's owner, and the construct's messages never have one. `listMessages` reads every user message with its author in the message's metadata, and `src/chats/message-author.ts` defines the author type.

An author's name is the name they asked the construct to call them (`src/accounts/user-name.ts`). In the conversation, a user message that someone other than the viewer wrote shows its author's name, or their email address if they have no name, where the viewer's own messages show "You". The author in a message's metadata holds the email address only for an author with no name, so a named author's address never reaches anyone's browser. The name comes before the message, so a screen reader reads it first, and a long name wraps on a phone.

When a conversation's user messages have more than one author, the construct needs to know who is speaking. `src/replies/author-names.ts` starts each user turn with a header, a text part of its own, such as `[Message from "Alex"]`. The name is quoted with `JSON.stringify`, and the header is always the turn's first part, so nothing a person types, and no name, can pass for another person's header. Each author also has a label, numbered in the order they first wrote: "person 1", "person 2" and so on. A header adds the label when two authors share a name, ignoring case, and uses the label alone for an author with no name. The construct never receives an email address.

The rules for several people (`SEVERAL_AUTHORS_RULES` in `src/replies/global-prompt.ts`) say that only a turn's header says who wrote it, that a name and a colon inside a message are just what that person typed, and to address people by name. A conversation with one author sends no headers, and the saved messages never hold them. The local engine reads commands after the author header.

The quest's owner and its [members](multi-user-quests.md) can write in its conversation, each as the author of their own messages. A removed member's messages keep their author. Server tests also write other authors' messages directly through the `author` field of the test kit's exchanges (`apps/web/test/support/test-database/data-test-kit.ts`). [`use_case_quest_member_access`](../apps/web/use-cases/quest-members.md#use_case_quest_member_access) covers this behavior.

## Following messages

When a saved last message is still receiving a reply in another window, the conversation shows that the construct is replying and refreshes until the reply is saved or can be retried.

Opening a conversation or sending a message brings the latest content into view. While the user stays at the bottom, new messages and streamed reply content keep the conversation there. Scrolling up pauses following and preserves the reading position. Returning to the bottom or sending a message resumes following. Scrolling is instant to respect reduced-motion preferences.

On phones, following adapts when the keyboard changes the available space. The composer also moves above a keyboard that shrinks only the visual viewport. The browser tests in `apps/web/test/component-integration/components/chat/chat-scroll.browser.test.tsx` cover these behaviors under `use_case_follow_latest_messages`.

### Scroll ownership

`useChatScroll` owns automatic document movement. The conversation uses the page's scroll area so the pinned header, sticky composer and message jump clearance share one coordinate system. assistant-ui's automatic viewport scrolling and its initialization, run-start and thread-switch jumps stay disabled, because that viewport scrolls its own element and can't follow the document. Opening a mounted conversation and explicitly sending start following; reply completion and focus do not.

Upward wheel, touch movement or document navigation keys suspend following before the browser emits a scroll event. An actual upward document movement away from the bottom also suspends following, including scrollbar dragging. A shorter document can clamp the scroll position upward while still at the bottom; this keeps following enabled for subsequent growth. Content growth cannot resume it. A downward arrival at the bottom or sending resumes it. Scrollbar input and message links can resume following after composer focus too. Upward input at the top of a short conversation leaves following enabled because there is no earlier content to navigate to.

Input that starts after a keyboard resize invalidates that resize's pending reading position restoration. Input still awaiting its document scroll also prevents restoration, including when it arrives before the resize. Focus blocks automatic resumption independently: it does not invalidate the reading position or bypass the resize scroll guard. Resizing alone never grants permission to follow. All controller movements are instant. While reading, ordinary content layout and anchoring belong to the browser; the controller restores the document position only for keyboard and viewport changes without newer navigation.

Headless viewport tests don't validate a real phone keyboard or touch momentum on physical devices.

## Images and drafts

The composer accepts text only. Images already saved in a conversation stay visible in their messages. See [Saved images](images.md).

Unsent message text is kept in this browser per viewer and conversation until sent. It survives leaving and reopening the conversation. Draft text does not follow the user to another device, and anyone with access to this browser's storage can read it. Clear the composer to discard it on a shared device. Browser storage may be blocked or cleared.

## Construct presence

Where the conversation header shows the construct's portrait, it opens the saved character's profile, with full artwork and public personality copy. The portrait keeps a full touch target without adding another header row.

Construct messages show a 32px circular portrait beside the construct's name. User messages have no portrait. Reply text keeps the conversation's full width on narrow phones. Artwork uses the conversation's saved construct snapshot, so renaming or editing a source construct does not change existing conversations. Missing or unavailable artwork shows initials; names and compatibility ids never select built-in artwork.

The first saved message shows a larger illustration when it is a construct opening. It appears once in the conversation, including after reopening or saved-message refreshes. A conversation starting with a user message receives no invented opening. Rendering never requests new artwork or calls a model. The shared visual primitives handle artwork and fallback behavior.

While the construct is thinking or writing, Lumen's portrait gently glows and Vellum's portrait has a subtle working motion. Finish, stop and error settle the portrait. Reduced motion keeps portraits static. Readable thinking or writing status and the message's busy state remain available independently of motion. `construct-presence.browser.test.tsx` covers this behavior with fake streams under `use_case_construct_presence`.

## Reply control

While a reply runs, Stop reply takes Send's place in the composer dock, so it stays in view at the foot of the conversation. Stop reply requests cancellation on the server, which checks it before later steps. It saves available partial text and completed tool results, and records the final outcome. A pending or failed Stop never claims successful cancellation. Already-started tool effects can remain or finish. An ordinary disconnect still permits background completion.

## Header navigation

The shared site header (`src/components/site-header.tsx`) has two parts:

- **The bar** is one row of the site panel's button and the brand, in the header's ink and gold. The brand is a compass medallion and the site's name, and it leads to Quests. Below 32rem (512 CSS pixels) the brand shows only its medallion, and "Project Buddy" stays its accessible name. The bar scrolls away.
- **The trail band** sits under the bar's gold rim, as a parchment strip with a line beneath it. It shows the links to the pages above the current one, small and muted, separated by `/`, leading into the current page's name. That name is the page's one `h1`, so pages don't repeat it in their content. The band stays pinned while the page scrolls.

Signed-in pages use a trail band whose heading names the current page. Quests, Workshop, Graveyard and Settings are top-level destinations without parent breadcrumbs. Quest details lead from Quests; construct and spell details lead from Workshop; retired definitions lead from Graveyard. Explicit header-slot routes match the site panel's top-level destinations so client navigation replaces the previous header. The detail catch-all resolves names through the acting user's access checks (`src/components/header-breadcrumbs.ts`). Back and forward restore the matching trail. Unknown or inaccessible pages have no band. A page that fails under a band shows its error below the band's heading.

The **site panel** (`src/components/site-panel.tsx`) mirrors the quest sidebar on the left. Its button, a panel icon at the start of the bar, opens and closes it under the header. It holds Quick Note, the **Places** and **You** links for a signed-in user, the Light, Dark and System modes, and Credits; a visitor's has the modes and Credits only. From the lg breakpoint (64rem) it docks beside the page, which makes room for it, and stays open from page to page and after a reload until the user closes it; this browser's local storage keeps that choice. Narrower, it is a modal drawer over an undimmed page: Escape, its close button, a click beside it or following a link closes it, and focus returns to its button.

When names are long, the parent links shorten first, each with an ellipsis. They keep full 44-pixel touch targets and their whole names as accessible names. The heading keeps its words and wraps to at most two lines. On a phone, a trail with more than one parent leaves out its Quests link, because the medallion leads there.

The quest's rename pencil sits beside its name in the trail band. A page's loading state draws no heading, since the band already shows it, so moving between pages keeps the header's footprint and the content's starting point.

In a long quest conversation, the trail band stays within 112 CSS pixels on phones and 140 on wide screens, even with a two-line heading. Message jumps land below it.

Construct and spell editor breadcrumbs read Workshop → Constructs → name and Workshop → Spells → name. The collection breadcrumb opens the corresponding Workshop tab.
