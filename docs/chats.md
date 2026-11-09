# Adventures

## Standalone adventure

The current `/chat` page is the signed-in user's **Adventures** hub, not a single
standalone conversation and not a standalone-only list (#472, #482). This page
describes the hub, filtering and conversation workflows.

The atlas at `/home` is the landing page after sign-in. `/` redirects there,
and so do the header's site name and the pages' "Home" links. The new-adventure form
remains at `/chats/new`, including activity and quest start links. The signed-in site menu links to Adventures and Quests. Every conversation, including the
original standalone adventure, opens at its existing `/chats/[chatId]` address. Quest
conversations link back to their quest; standalone conversations link back to
Adventures. The conversation routes use `ChatScreen` and retain their existing
history, construct and keyboard/composer behavior. `/chat` is a Server Component,
not a conversation screen, for finding an adventure again: the list of adventures and its
quest filter lead the page (#588).

Starting a standalone adventure requires no quest. The Adventures page's "New adventure"
button opens a modal dialog (`NewChatDialog`, a Radix dialog) holding the
new-adventure form. The dialog is named "New adventure", takes and keeps focus, and
closes with Escape or its close button, returning focus to the button; Escape
in the construct picker's open list closes only the list. That form, like
the new adventure page at `/chats/new`, offers a quest or "No quest", an
activity and a construct, built in or the user's own, with the open adventure and Vellum
chosen initially. Starting saves the adventure with the construct's opening; it makes no
quest, unless "New quest" is chosen.

The Constructs page and the Workshop's Constructs tab label each saved-adventure
action “Adventure with [construct name]”, using the full name in both the visible
label and accessible name. It opens the New adventure dialog with that construct
fixed. Closing creates nothing. Construct detail pages offer editing and temporary
Workshop tests rather than a saved-adventure start action.

A quest's page has its own "New adventure" button (#670, replacing the form
#536 embedded there), so the quest's adventures lead the page. The form is
closed when the page opens or reloads. The button opens the same kind of
dialog, with the form's activity and construct but no quest field: given a
`projectId`, `NewChatForm` sends that quest in a hidden field and starts
every adventure in it, in whichever activity is chosen.

The form can also start a new quest. Activity, construct and quest choices are independent: every activity, including one of the user's own, supports no quest, an existing quest or a new quest. Start adventure with a new quest opens a second dialog for its name and optional motivation. Cancel keeps the choices. The action creates the quest and first adventure together through `startProject`, in the selected activity and construct. Invalid names or failed openings save nothing.

Built-in constructs and activities have prepared openings when no motivation is supplied. Edited definitions need a generated opening. With motivation, the construct acknowledges it and follows the chosen activity; the motivation becomes the first Journal version.

Merely viewing the Adventures page, or opening and closing its dialog, creates
nothing. Standalone adventures started before they
got openings remain accessible alongside later ones, with their history and
construct unchanged.

A standalone conversation has no Journal and no [progress timeline](progress-timeline.md), so it
can't record milestones. Its construct can search and cite the Blender manual, change
the adventure's activity, and offer a quest when the user asks. The user edits and confirms a summary before the quest is created; this seeds its Journal and opening and does not
move the standalone conversation into the quest. The new quest's
first adventure opens in Project Breakdown through the link the adventure shows.

## Home atlas

Home shows the approved heading "Your projects await" and the guidance
"Don't know where to start? Try an Activity", linking to Activities. The
heading deliberately uses the user's chosen wording; the domain term for
ongoing work elsewhere is quest.

The yellowed parchment landscape is the original generated artwork, encoded
as WebP at `public/atlas/parchment.webp`. Its geography was carried forward
from the northern relief study and restyled as sepia ink engraving on aged
paper. It is a decorative CSS background, with no map labels baked into the
image. There is no compass bar or region caption.

Home has one responsive control panel, with no Map/List switch. The map
fills the background behind the heading, places, current quest and footer.
Quests, Adventures, Constructs, Activities, Workshop and Marketplace appear
in that reading and keyboard order, in two columns on phones and three on
wide screens. The map has no geographic markers, trails or separate phone
overview. It needs no panning, zooming, hovering or animation.

`src/home/places.ts` names the six destinations once. Each is a normal link
to an existing page. Descriptions show on wide screens and remain accessible
to assistive technology on phones. Spellbook and Image gallery remain
available from the menu; spells are also available in Workshop. The
Spellbook pages belong to Workshop in the header.

Strongly tinted parchment panels blur the terrain behind the title,
destination buttons, current quest and footer. Ink and muted text have known
contrast even over the darkest marks in the artwork. Browsers without
backdrop blur use opaque paper. Forced-colors mode removes the artwork and
blur. The atlas uses the same paper material in both appearance modes.

Home uses the shared site header above its content, with the site's name,
Quick Note and Menu. Quests and Adventures remain in the menu and Home's
destinations, without shortcuts beside Quick Note on any page.
Leaving a cached Home page restores the usual page background and content
column without a refresh; the shared header keeps its styling.

The atlas continues only the most recently active quest returned by
`readToday`, with its real next step and a direct link to its latest adventure.
The quest sits below all six destinations. With no quest, the same position
offers Start a quest, leading to a new quest in Project Breakdown.
The existing site header keeps Quick Note and Menu available; Settings and
Account also appear below the map. Home reads no new data source, creates
nothing and makes no model call.

## Today

The new adventure page opens with a **Today** section above the new-adventure form
(#610), so the form page shows what is waiting for the user. The page's
heading is "Today", and the form follows under its own heading, "Start a
adventure". A user with no adventures sees only the form, under the heading "Start a
adventure", with no empty Today section.

Today lists two things, both by most recent activity. An adventure is active when
it starts or gains a message, and a quest is as active as its most active
adventure:

- **Your quests:** up to three quests. Each shows its name, linking to
  the quest, its next step if its Journal records one, and a Continue link
  to its most recently active adventure. Each Continue link's accessible name
  includes the quest's name, such as "Continue Sea turtle model".
- **Recent adventures:** up to three other adventures, quest or standalone, each
  linking to its conversation with its quest's badge. An adventure that a
  Continue link already opens isn't listed again.

The next step is the Journal's first line that starts "Next step:",
read by `nextStepOf` in `src/memory/next-step.ts`. List markers, headings
and bold around the label are allowed. A Journal without such a line shows
the quest without a next step. The `update_memory` tool's description asks
the construct to keep one current "Next step:" line, and the user can write or
edit it on the Journal page.

The page stays a Server Component. `readToday` in
`src/today/today-store.ts` reads Today with owner-scoped queries, which
include the team quests the user is a member of, and makes
no model call. Unread check-ins (#609) can join Today as another part above
the quests: add a list to the `Today` type in `src/today/today.ts` and a
part to `TodaySection` in `src/components/today-section.tsx`.

## Activities

Find something to make (`find-something-to-make`) helps the user discover a small achievable creative project without needing an idea or inspiration source first. The construct explores interests, energy, available materials and constraints one manageable question at a time. It helps with uncertainty, perfectionism, missing skills and limited materials, and continues supporting the user after they choose an idea.

Use it without a quest, in an existing quest or with a new quest through the normal adventure form. Vellum and Lumen have prepared openings; edited definitions and new quests with motivation use generated openings. In a quest, the construct uses its existing Journal and the usual tool rules. A standalone adventure has no Journal or quest progress. Suggested milestones remain plans until meaningful work is reported completed.

Every adventure is in one activity at a time: the open adventure, brainstorming, Project Breakdown, Find something to make, or one of the user's own activities. Activities opens the New adventure modal with that activity fixed. Every activity offers no quest, an existing quest or a new quest, with the user's chosen construct. Closing creates nothing. The new adventure page remains available at `/chats/new?activity=ACTIVITY_ID`.

Quest interview is retired from new choices. Existing snapshots stay unchanged. Older interview links and activity requests lead to Project Breakdown. The quest creation form defaults to Project Breakdown. An adventure records each
activity it enters, with a snapshot of it, in the `activity_sessions` table. The construct changes the activity with the
`select_activity` tool. Its in-adventure result shows the activity it entered,
including while the reply streams and after reopening the adventure. Saved activity
sessions persist and apply to subsequent replies. Active standalone and quest
adventures have no Activity dropdown, label, or selection progress and error UI
(#580 supersedes the selector requirements in #561 and #562). Activity selection
on the new-adventure forms and activity management remain available. See the
[activities use cases](../apps/web/use-cases/activities.md).

## All adventures and quest filtering

The hub lists every adventure open to the viewer: their standalone adventures and the
adventures of each quest they own or are a [member](../GLOSSARY.md#member) of,
newest first by creation time (descending id breaks ties). Each links to its
existing conversation. There is no adventure-name search or separate No quest
filter.

Above the list, **Quest** offers **All** and only the viewer's quests by
name: their own and the team quests they've joined. The page loads the
viewer's complete adventure list, even when opened with a
quest filter. Selecting a quest immediately filters those loaded adventures in
the browser, without submitting a form, navigating or requesting another list.
Selecting All restores the loaded list in its original order. Each change
replaces the current address with `/chat?project=<id>` (or removes `project` for
All), so a valid choice stays selected on reload or when reopening a
saved URL. A quest of the viewer's with no adventures stays selected and shows the usual
empty-adventure message.

The page resolves the raw URL value against the viewer's quest choices.
Missing, empty, malformed, unknown, foreign or array-valued values (including
repeated parameters with either equal or different values) all mean All.
Foreign and nonexistent quest ids give the same choices and results, without
a not-found response or disclosure of another user's quest. Sharing a filter
URL does not grant access: another viewer sees their own All list unless the
selected quest is theirs or they are a member of it. Selecting All restores
the full list.

## Quest badges and phones

Only the all-adventures page opts into quest-name badges. A quest adventure displays
its quest's name outside the conversation link; a standalone adventure has no
badge. The accessible link name remains the adventure name and construct, or just the
construct when unnamed. The adventure-names extra still controls adventure-name visibility.
Quest pages keep their existing quest-only list without badges.

The selector uses the semantic theme tokens and
`--target-size` controls. Long unbroken quest names truncate in badges rather
than expanding the page. Browser tests exercise the assembled page at 320 and
390 pixels in every theme and both modes, alongside the selector's dedicated
selected-state and target-size tests.

## Behavioral evidence

The [adventure use cases](../apps/web/use-cases/chats.md) define
`use_case_list_all_chats`, `use_case_filter_chats_by_project`,
`use_case_chat_project_badge` and `use_case_today_on_landing`, with exactly
slug-titled Vitest groups.

- `apps/web/test/app/(workspace)/chat/page.server.test.ts` composes the actual
  page and stores with isolated signed-in users: mixed ordering across multiple
  quests, ordered quest filtering, empty quests, invalid URL fallbacks,
  foreign choices and shared URLs.
- `apps/web/test/component-integration/components/new-chat-dialog.browser.test.tsx`
  checks the "New adventure" dialog: its name, the form's default choices, focus
  kept inside, closing by Escape or the close button with focus returned, and
  that opening and closing it sends nothing. The phone checks
  (`phone-pages.touch.browser.test.tsx`) measure the open dialog too.
- `apps/web/test/components/chat-project-filter-behavior.browser.test.tsx`
  checks immediate local filtering, switching back to All, empty states and
  address updates without fetching another list.
- `page.touch.browser.test.tsx` checks the complete phone layout, including
  long quest badges. `test/components/chat-list.browser.test.tsx` checks
  badge visibility, accessible link names, colors and containment under
  `use_case_chat_project_badge`. The former jsdom `page.test.tsx` checks of
  controls, native GET serialization and query arguments were removed in #508.
- `apps/web/test/app/(workspace)/projects/[projectId]/page.server.test.ts`
  checks the quest page's form, with the quest chosen and no foreign
  choices, and `page.browser.test.tsx` beside it checks that the form sends
  the quest, shows progress, and stays on the page when the adventure can't
  start.
- `apps/web/test/component-integration/today/today.server.test.ts` checks
  what Today reads under `use_case_today_on_landing`: ordering by activity,
  next steps from the Journal, Continue adventures, no repeated adventures, the limit,
  another user's data and a new user's empty Today.
- `apps/web/test/component-integration/app/(workspace)/chats/new/page.browser.test.tsx`
  checks the landing page's Today section: the next step, the Continue and
  adventure links, the keyboard order, and the form alone for a new user. The
  phone checks measure Today with long names.
- `apps/web/test/component/memory/next-step.test.ts` checks reading the next
  step from the Journal.
- `apps/web/test/chats/all-chats.*.test.ts` verifies the reusable query's SQL
  predicates, ordering and row conversion, including real-database isolation.
- Existing standalone-conversation tests continue to cover starting and
  reopening adventures, history and construct preservation. The former jsdom checks of
  the quest page's badge-free output were removed in #508.

Adventure behavior stays in Vitest. Playwright covers authentication flows only.
Server and authentication runs require the non-production test database and
mock model, guarded by `checkTestEnvironment`; never substitute a production
database or a real model.

## Check-ins

A quest's construct can start an adventure on its own: a check-in. The quest's page has a Check-ins setting, saved per quest: Off, the default, Daily, A few times a week (every other day) or Weekly (`src/components/check-in-setting.tsx`, `saveCheckInSettingAction`).

Once a day, the scheduler calls `/api/check-ins` ([site operations](Site-Operations.md#check-ins)). For each due quest, `src/check-ins/check-ins.ts` does the following:

1. Claims the quest's check-in. A quest is due when its check-ins are on and nothing has happened in it for its interval: no check-in claimed, no adventure started and no message sent. The interval is the schedule's days less one hour, so a daily run at about the same time each day still finds a daily quest due. A quest whose last check-in is still unread for its owner isn't due either; another user's mark doesn't hold it. The claim is one conditional update, so of two runs at once only one claims the quest, and a run soon after finds it claimed.
2. Starts the check-in (`startCheckIn` in `src/chats/start-chat.ts`). It checks the owner's batteries, and skips the quest without error when they are out of batteries. The new adventure is in the open adventure, with the construct of the quest's newest adventure. Instead of the activity's opening kickoff, the check-in kickoff (`src/check-ins/check-in-kickoff.ts`) asks the construct for two or three sentences, from the quest's Journal, about where the user left off and one small next step, so the construct always writes it. The adventure is saved with its opening and activity session in one transaction, and then marked unread for the owner and each of the quest's [members](team-projects.md) (`markChatUnreadFor`). Each clears only their own mark by opening it.
3. Emails the owner the construct's message, with a link to the adventure and a link to turn the quest's check-ins off (`src/email/check-in-email.ts`). A failed email is logged; the adventure stays.

When the owner is out of batteries, the run keeps the claim, so the quest waits its interval like any other instead of going first in every run. When Claude is unavailable or something fails, the run gives the claim up, so the next run tries again.

The link to turn check-ins off names the user and the quest, signed with `SESSION_SECRET` (`src/check-ins/check-ins-off-link.ts`). It works without signing in and never expires. It opens `/check-ins/off`, which changes nothing until the user confirms, so a mail scanner that opens the link leaves check-ins on.

### Unread adventures

Unread marks are per user. A row in `chat_unreads` marks one adventure unread for one user, and `src/chats/unread-marks.ts` holds the SQL that reads and writes the rows. Only a check-in marks an adventure. After saving the adventure, `startCheckIn` calls `markChatUnreadFor` with the users to mark: the quest's owner and every member. A user who can't read the adventure gets no mark, and a user named twice or already marked keeps one mark.

Adventure lists show the viewer's own marks: the Adventures page, a quest's page and Today. Each list shows an "Unread" mark beside the adventure's link, outside its accessible name. The link names the mark as its description (`aria-describedby`), so a screen reader that moves from link to link still announces it. Opening the adventure's page clears the viewer's mark and no one else's (`markChatRead`).

The column `chats.unread` held a single mark for everyone before. Migration 0028 copied each unread adventure to a mark for its owner. The release that added 0028 (#638) kept writing the column, for a rollback; the release of #665 stopped, and migration 0034 drops it (#637). The [site operations](Site-Operations.md#check-ins) say why a rollback past that release is unsafe.

The use cases are in [the adventure use cases](../apps/web/use-cases/chats.md#use_case_check_in) and [the quest use cases](../apps/web/use-cases/projects.md#use_case_set_check_ins). `apps/web/test/component-integration/check-ins/check-ins.server.test.ts` runs the route against the test database with the mock model and the email outbox; `chat-list.browser.test.tsx` checks the Unread mark. `apps/web/test/component-integration/chats/unread-marks.server.test.ts` checks that two users' marks on one adventure stay apart.

## Adventure names

The pencil replaces the adventure title with a focused inline name field and
Save name and Cancel icon buttons on the same row. The construct stays below
the editor. Saving or cancelling restores the title and pencil. Names have at most 60 characters. Empty or whitespace-only
names show a validation message and keep the entered text. Cancel discards the
draft. Saving updates the title and adventure lists, persists across reloads, and
prevents automatic naming from changing the name again. The pencil and editor
work with a keyboard and on narrow phone screens.

The conversation header uses compact spacing and a smaller title, with quest
navigation (or Adventures for standalone adventures) above the title and construct identity.
Long names truncate visually on phones while retaining their full accessible
names. The navigation and rename pencil keep 44-pixel touch targets. The pinned
header's scroll clearance follows its compact size.

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

The quest owner and current members can write in a team quest adventure. Replies, generated images and automatic adventure names charge the acting user; generated openings charge the starter, while check-ins charge the quest owner.
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

## Adventure image attachments

Select or paste up to four JPEG, PNG, GIF or WebP images per message, each at most 2 MiB. Preview and remove images before sending, with or without text. Images persist in the adventure and remain available to the construct for follow-up questions. Phone image selection works through the image picker; export HEIC images as JPEG or PNG first.

See [image storage and operations](Site-Operations.md#chat-image-attachments) for setup, private delivery, deletion and testing.

Unsent message text is kept in this browser per viewer and adventure until sent. It survives leaving and reopening the adventure; unsent images are not stored. Draft text does not follow you to another device, and anyone with access to this browser’s storage can read it. Clear the composer to discard it on a shared device. Browser storage may be blocked or cleared.

When an unsent message included images, returning to the adventure shows a reminder to attach them again. Browser drafts store text and that reminder, never image files or image URLs.

## New quest details

New quest asks for a quest name and optional motivation: why the user wants to complete it. It uses the account's **New quest construct** in Settings, initially Vellum, rather than offering a construct picker. Settings offers built-in constructs and the user's own constructs. The choice applies to future quests across devices; existing adventure snapshots stay unchanged. If the chosen construct is deleted or unavailable, Vellum starts the adventure.

New adventure and activity start pages keep their visible construct picker when **New quest** is selected. Their name dialog also collects motivation. The quest uses the selected construct, independently of the Settings preference used by the dedicated New quest form. Quests created by a construct from an existing adventure keep that adventure's construct.

When motivation is supplied, the construct writes an opening using the name and motivation, briefly acknowledges the reason and follows Project Breakdown. This opening requires a model call, even for built-in constructs. The motivation is saved as the user's first Journal version in the same transaction as the quest, adventure and opening. If the opening fails, nothing is saved. Without motivation, a built-in construct still uses its prepared opening.

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

Home explains Project Buddy and offers Start a quest when the account has no adventures or Active quests. Returning users keep the Continue guidance. The site menu orders Quests and Adventures before definitions and Workshop, then gallery and management destinations.

## Reply control and batteries

Stop reply requests cancellation on the server, which passes cancellation to the provider and checks it before later model and tool steps. It saves available partial text and completed tool results, and records the final outcome. A pending or failed Stop never claims successful cancellation. Already-started tool effects can remain or finish, and charged use is not refunded. An ordinary disconnect still permits background completion.

The composer shows the acting user's battery balance. Reply costs retain fractions and include retries, image charges and any automatic adventure name. Only the payer sees their costs. Pending and unknown costs have explicit labels; old replies have unknown costs. Model charges associated with a reply settle idempotently with their durable accounting operation. Provider details stay out of product copy.
