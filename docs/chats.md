# Conversations

## Conversations

A quest has one continuing conversation, and each user has one private Chat (`src/conversations/`). Both are `chats` rows marked `continuing`. Partial unique indexes allow one per quest and one per user, so finding or making one is atomic: concurrent starts reach the same conversation, and only the request that made it writes its opening. Reading a quest's conversation (`readQuestConversation`) never starts one. Starting it (`startQuestConversation`) is free when it exists, and charges the acting user for an opening only when the construct writes one.

A conversation keeps the construct it started with. Its activity changes only when the construct enters another with its activity tool, which records the change at its place in the history. A reply reads the conversation's newest `CONVERSATION_WINDOW` messages (60, `src/replies/conversation-to-answer.ts`), with the quest's Journal, plan and newest milestones in its instructions, so a long-running quest never sends its whole history. Adventures, several conversations per quest with automatic names, were removed; the [design note](design/simplification-892.md) lists what went and the release order.

## Start a quest

On Quests, Start Quest opens a dialog with two fields: Construct and Why.
Construct defaults to the account's New quest construct preference. The visible
explanation makes clear that this construct joins the first adventure; later
adventures in the same quest can use other constructs. Why is optional and
becomes the quest motivation in the opening and first Journal version.

Starting gives the quest the default name New quest and opens its first adventure
in Break Down a Project. With no motivation, the existing prepared opening is used
when available. Failed openings save nothing and keep the construct choice and
Why for retry. Cancel, Close and Escape create nothing. The premade quest
previews remain separate and keep their editable name, Journal and activity.

## Chat

`/chat` is the signed-in user's **Chat**: one private conversation for talking without a goal. It has no list, chooser, conversation name or New adventure button. `privateChat` gets or creates the conversation atomically, without an opening or a model call, so opening Chat spends nothing. Chat uses the default construct and the Chat activity; the construct can still change activity with `select_activity`. Chat is never shared: quest members can't open it, and old addresses of it reveal nothing to anyone else.

Chat has no Journal, plan or [progress timeline](progress-timeline.md), so its construct has no tools that write them. It can search and cite the Blender manual, change activity and offer a quest.

### Start a quest from this

Chat's header offers **Start a quest from this**. It opens the shared quest start on Do a thing, with the user's latest Chat messages as a draft Journal (`chatSummaryDraft`, built without the model). The user edits the name and Journal and confirms; closing the dialog creates nothing and spends nothing. The new quest gets only the confirmed Journal. No Chat message is copied or moved, so people later invited to the quest see nothing of the Chat.

The construct can also propose a quest with `create_project`. The user edits and confirms the proposed summary in the conversation, and the result links to the new quest.

### Old addresses

`/chats/[chatId]` is a redirect kept for links, bookmarks and emails. `resolveConversation` sends the viewer to the quest that owns the conversation when they can open it, to `/chat` for their own Chat, and otherwise to not found. A foreign, removed or malformed id is not found, so the address reveals nothing. `/chats/new` redirects to `/chat` and makes nothing.

## Quests landing page

Quests (`/projects`) opens after sign-in when no explicit return destination
was supplied. The site name and root address lead there too; old `/home`
bookmarks redirect to Quests. Signed-out visitors still need to sign in.
Opening these pages makes no model call and spends no batteries.

Quests lists existing work and offers Dailies, Learn a thing, Make a thing
and Do a thing. Open a quest to continue its conversation. The Home atlas,
duplicate destination panels and recent-quest summary are removed.

## Activities and constructs

Every conversation is in one activity at a time: Chat, Brainstorm, Break Down a Project, Find something to make, or one of the user's own activities. The construct changes it with the `select_activity` tool, and its result shows the activity it entered. An activity's saved snapshot applies to the replies that follow.

On Activities, each activity's name, and a built-in activity's page, open the shared quest start with that activity chosen. On Constructs, “Start a quest with [construct name]” opens it with that construct chosen. The start opens on the starting point built on the chosen activity, such as Make a thing for Find something to make, and otherwise on Do a thing, so most starts need only a name. These are the only start actions: there is no separate chooser of quest, conversation, activity and construct. Closing the dialog creates nothing.

Quest interview is retired from new choices. Existing snapshots stay unchanged, and older interview activity requests lead to Break Down a Project. See the [activities use cases](../apps/web/use-cases/activities.md).

## Behavioral evidence

The [conversation use cases](../apps/web/use-cases/chats.md) define `use_case_standalone_chat`, `use_case_talk_idea_through` and `use_case_project_from_standalone_chat`, with exactly slug-titled Vitest groups.

- `apps/web/test/component-integration/app/(workspace)/chat/page.server.test.ts` opens Chat repeatedly as two users with the real stores: one conversation each, nothing spent on the way in, no other user sees it, and old addresses redirect or are not found as above.
- `apps/web/test/component/start-work/chat-summary-draft.test.ts` checks the draft Journal.

Conversation behavior stays in Vitest. Playwright covers authentication flows only. Server and authentication runs require the non-production test database and mock model, guarded by `checkTestEnvironment`; never substitute a production database or a real model.

## Removed check-ins

Automatic check-ins were removed in [#903](https://github.com/axolotl-logic-io/project-buddy/issues/903). No scheduler, page or reply writes a message into a conversation on its own, so every model call starts from something a user did. Dailies continues only when the user writes or chooses Start the day. The [design note](design/simplification-903.md) lists what went and the columns kept for the live build.

## Conversation header

A conversation's pinned header (`src/components/chat-screen.tsx`) holds its construct's portrait, which opens the construct's profile, and any page action: Chat adds its heading and Start a quest from this. A quest's title, status and sections sit in the quest's frame above it and scroll away; the shared site header's breadcrumbs stay. The header wraps on phones, and its scroll clearance follows its compact size.

## Message authors

Each user message records its author, the user who sent it, in the
nullable column `messages.user_id` (#629). A message with no author recorded
belongs to the adventure's owner: the quest's owner, or the standalone adventure's
user. Messages saved before authors were recorded have no author, and the
construct's messages never have one. `listMessages` reads every user message
with its author in the message's metadata, and `src/chats/message-author.ts`
defines the author type.

An author's name is the name they asked the construct to call them
(`src/accounts/user-name.ts`). On the adventure screen, a user message that
someone other than the viewer wrote shows its author's name, or their email
address if they have no name, where the viewer's own messages show "You".
The author in a message's metadata holds the email address only for an
author with no name, so a named author's address never reaches anyone's
browser, as with the members list ([team quests](team-projects.md)).
The name comes before the message, so a screen reader reads it first, and a
long name wraps on a phone. An adventure that only the viewer writes in looks as
it did before authors were recorded.

When an adventure's user messages have more than one author, the construct needs to
know who is speaking. `src/replies/author-names.ts` starts each user turn
sent to the model with a header, a text part of its own, such as
`[Message from "Alex"]`. The name is quoted with `JSON.stringify`, and the
header is always the turn's first part, so nothing a person types, and no
name, can pass for another person's header. Each author in the adventure also
has a label, numbered in the order they first wrote: "person 1", "person 2"
and so on. A header adds the label when two authors share a name, ignoring
case, and uses the label alone for an author with no name. The model never
receives an email address.

The adventure's part of the system prompt adds the rules for several people
(`SEVERAL_AUTHORS_RULES` in `src/replies/global-prompt.ts`). They tell the
construct that only a turn's header says who wrote it, that a name and a colon
inside a message are just what that person typed, and to address people by
name. The rules stay out of the prompt's shared, cached part. An adventure with
one author sends the model exactly what it sent before, and the saved
messages never hold the headers. The mock model reads a command past the
header, and `/mock-recall` also searches it.

The quest owner and current members can write in a team quest adventure. Replies, generated images and automatic adventure names charge the acting user; and generated openings charge the starter.
Server tests write other authors' messages through the `author` field of
the test kit's exchanges (`apps/web/test/support/test-database/data-test-kit.ts`).
`use_case_chat_with_several_people` covers this behavior.

## Following messages

When a saved last message is still receiving a reply in another window, the adventure shows that the construct is replying and refreshes until the reply is saved or can be retried.

Opening an adventure or sending a message brings the latest content into view.
While the user stays at the bottom, new messages and streamed reply content
keep the adventure there. Scrolling up pauses following and preserves the reading
position. Returning to the bottom or sending a message resumes following.
Scrolling is instant to respect reduced-motion preferences.

On phones, following adapts when the keyboard changes the available space.
The composer also moves above a keyboard that shrinks only the visual viewport.
The browser tests in `apps/web/test/component-integration/components/chat/chat-scroll.browser.test.tsx`
cover these behaviors under `use_case_follow_latest_messages`.

### Scroll ownership and alternatives

`useChatScroll` owns automatic document movement. The adventure uses the
page's scroll area so the pinned header, sticky composer and message jump
clearance share one coordinate system. assistant-ui's automatic viewport
scrolling and its initialization, run-start and thread-switch jumps stay
disabled. Opening a mounted adventure and explicitly sending start following;
reply completion and focus do not.

Upward wheel, touch movement or document navigation keys suspend following
before the browser emits a scroll event. An actual upward document movement
away from the bottom also suspends following, including scrollbar dragging.
A shorter document can clamp the scroll position upward while still at the
bottom; this keeps following enabled for subsequent growth. Content growth cannot
resume it. A downward arrival at the bottom or sending resumes it. Scrollbar
input and message links can resume following after composer focus too. Upward input at
the top of a short adventure leaves following enabled because there is no
earlier content to navigate to.

Input that starts after a keyboard resize invalidates that resize's pending reading
position restoration. Input still awaiting its document scroll also prevents
restoration, including when it arrives before the resize. Focus blocks automatic
resumption independently: it does not invalidate the reading position or bypass
the resize scroll guard. Resizing alone never grants permission to follow.
All controller movements are instant. While reading, ordinary content layout
and anchoring belong to the browser; the controller restores the document
position only for keyboard/viewport changes without newer navigation.

The alternatives considered for #771 were:

- **assistant-ui's supported viewport:** the installed 0.15.27 implementation
  handles input intent, content resize and message anchoring, but scrolls its
  own element. Enabling it on the current unbounded viewport cannot follow
  the document. It would require the bounded container change below.
- **A bounded conversation container:** isolates scroll ownership and could
  use assistant-ui's controller. It also changes the page layout, sticky
  composer, keyboard sizing and document jump targets. Retaining document
  scrolling avoids that broader change; the tradeoff is maintaining the small
  document controller and its browser interaction coverage.
- **Browser behavior alone:** anchoring helps retain earlier content, but
  cannot provide the required follow-on-stream and send behavior. Keep native
  scrolling and anchoring, with explicit permission for automatic bottom moves.

### Regression evidence and limits

The original #565 implementation (PR #569) inferred reading intent from a
later document scroll event. Its resize restoration could ignore intervening
scroll events. Commit `f21c93c6` fixed Firefox 149's fractional visual viewport
wheel offsets by comparing whole-pixel keyboard insets. That addresses the
reported jitter sequence, but does not establish intent before document scroll.
The old tests explicitly awaited that scroll event before incoming content;
the Firefox test covered only unchanged-inset jitter.

The #771 tests deliver upward input and delayed content growth in the same
turn as a queued viewport resize, before any document scroll event. They also
exercise content shrink followed by growth, focused-composer keyboard resizing
with controlled browser focus scroll, native browser wheel and PageUp navigation,
stream growth, send and return-to-bottom, and keyboard sizing in Chromium and
WebKit. Controlled touch
and visual viewport events isolate ordering without sleeps. Native wheel tests
assert no downward pull while the gesture may still be moving upward; exact
reading-position invariance is asserted with controlled settled navigation.
WebKit can emit scrollend between native wheel segments, so scrollend alone
does not prove that the gesture is finished. The wheel command moves the pointer
within the visible iframe without a locator hover that could scroll the list.
These reproduce a failure mode of the previous controller; the new report's exact device and
timing remain unknown. Firefox's fractional-offset sequence is covered through
controlled viewport events, not a Firefox browser run. Headless viewport tests
do not validate a real phone keyboard or touch momentum on physical devices.

## Adventure image attachments

Select or paste up to four JPEG, PNG, GIF or WebP images per message, each at most 2 MiB. Preview and remove images before sending, with or without text. Images persist in the adventure and remain available to the construct for follow-up questions. Phone image selection works through the image picker; export HEIC images as JPEG or PNG first.

See [image storage and operations](Site-Operations.md#chat-image-attachments) for setup, private delivery, deletion and testing.

Unsent message text is kept in this browser per viewer and adventure until sent. It survives leaving and reopening the adventure; unsent images are not stored. Draft text does not follow you to another device, and anyone with access to this browser’s storage can read it. Clear the composer to discard it on a shared device. Browser storage may be blocked or cleared.

When an unsent message included images, returning to the adventure shows a reminder to attach them again. Browser drafts store text and that reminder, never image files or image URLs.

## Quest creation details

Start Quest offers a construct picker and optional Why: why the user wants to complete the quest. The picker defaults to the account's **New quest construct** in Settings, initially Vellum. Settings offers built-in constructs and the user's own constructs. The preference applies to the first adventure of future quests across devices; the user can change the choice before starting.

Existing adventure snapshots stay unchanged. If the preferred construct is deleted or unavailable, the picker defaults to Vellum.

New adventure and activity start pages keep their visible construct picker when **New quest** is selected. Their name dialog also collects motivation. The quest uses the selected construct, independently of the Settings preference that defaults the dedicated Start Quest picker. Quests created by a construct from an existing adventure keep that adventure's construct.

When motivation is supplied, the construct writes an opening using the name and motivation, briefly acknowledges the reason and follows Break Down a Project. This opening requires a model call, even for built-in constructs. The motivation is saved as the user's first Journal version in the same transaction as the quest, adventure and opening. If the opening fails, nothing is saved. Without motivation, a built-in construct still uses its prepared opening.

## Construct presence

The adventure header's portrait opens the saved character's profile, with full
artwork and public personality copy. Its name remains visible in the heading.
The portrait keeps a full touch target without adding another header row.

Construct messages show a 32px circular portrait beside the construct's name.
User messages have no portrait. Reply text keeps the conversation's full width
on narrow phones. Artwork uses the adventure's saved construct snapshot, so
renaming or editing a source construct does not change existing adventures.
Missing or unavailable artwork shows initials; names and compatibility ids
never select built-in artwork.

The first saved message shows a larger illustration when it is a construct
opening. It appears once in the conversation, including after reopening or
saved-message refreshes. Legacy conversations starting with a user message
receive no invented opening. Rendering never requests new artwork or calls a
model. The shared visual primitives handle artwork and fallback behavior.

While the construct is thinking or writing, Lumen's portrait gently glows and
Vellum's portrait has a subtle working motion. Finish, stop and error settle the
portrait. Reduced motion keeps portraits static. Readable thinking/writing
status and the message's busy state remain available independently of motion.
`construct-presence.browser.test.tsx` covers this behavior with fake streams
under `use_case_construct_presence`.

Quests offers the four premade starting points before the first quest and lists existing quests on later visits. The site menu keeps Quests and Chat available.

## Reply control and batteries

While a reply runs, Stop reply takes Send's place in the composer dock, so it stays in view at the foot of the conversation. Stop reply requests cancellation on the server, which passes cancellation to the provider and checks it before later model and tool steps. It saves available partial text and completed tool results, and records the final outcome. A pending or failed Stop never claims successful cancellation. Already-started tool effects can remain or finish, and charged use is not refunded. An ordinary disconnect still permits background completion.

The composer shows the acting user's battery balance. A reply's cost shows one decimal place and includes retries, image charges and any automatic adventure name; the Library's Getting Started book says so, rather than every reply. Only the payer sees their costs. Pending and unknown costs have explicit labels; old replies have unknown costs. Model charges associated with a reply settle idempotently with their durable accounting operation. Provider details stay out of product copy.

## Header navigation

The shared site header holds the breadcrumb trail. Quest adventures link through All quests and the quest; standalone adventures link through Adventures. The current adventure’s name is marked as the current page. The adventure heading and rename action remain with the conversation. Parent links keep full touch targets, and long names shorten visually without changing their accessible labels. The brand, Menu and Quick Note row scrolls away. The breadcrumb row remains visible, with adventure controls directly below it. The combined visible pinned stack stays within 112 CSS pixels on phones and 140 on wide screens. Both headers stay above message jump targets.

Other parent trails also live in the shared header: quest and Journal pages, constructs, activities, spells, Marketplace listings, retired definitions, and account and list pages. Page actions, including Retirement links, stay in page content. The header route resolves names through acting-user access checks on each navigation. Quests has one current-page label, without a parent link. Its location row keeps the same footprint as other signed-in pages and follows the same pinned-row behavior. Unknown or inaccessible pages have no breadcrumb trail.
