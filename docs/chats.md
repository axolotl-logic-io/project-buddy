# Chats

## Standalone chat

The current `/chat` page is the signed-in user's **Chats** hub, not a single
standalone conversation and not a standalone-only list (#472, #482). This page
describes the hub, filtering and conversation workflows.

The new chat page, `/chats/new`, is the landing page after sign-in (#587):
`/` redirects there, and so do the header's site name and the pages' "Home"
links. The signed-in site menu links to Chats and Projects. Every conversation, including the
original standalone chat, opens at its existing `/chats/[chatId]` address. Project
conversations link back to their project; standalone conversations link back to
Chats. The conversation routes use `ChatScreen` and retain their existing
history, buddy and keyboard/composer behavior. `/chat` is a Server Component,
not a conversation screen, for finding a chat again: the list of chats and its
project filter lead the page (#588).

Starting a standalone chat requires no project. The Chats page's "New chat"
button opens a modal dialog (`NewChatDialog`, a Radix dialog) holding the
new-chat form. The dialog is named "New chat", takes and keeps focus, and
closes with Escape or its close button, returning focus to the button; Escape
in the buddy picker's open list closes only the list. That form, like
the new chat page at `/chats/new`, offers a project or "No project", an
activity and a buddy, built in or the user's own, with the open chat and Hippy
chosen initially. A project's page shows the same form above its chats, with
that project chosen initially (#536). Starting saves the chat with the buddy's opening; it makes no
project, unless "New project" is chosen.

The form can also start a new project (#586). Its activities always include
"Project interview", and its projects include "New project". The two choose
each other (`src/chats/new-chat-selection.ts`): the interview selects a new
project, a new project selects the interview, another activity sets the
project back to "No project", and an existing project sets the activity back
to the open chat. With a new project chosen, Start chat opens a second dialog
that asks for the project's name; its field and Start project button belong
to the form by its id. Cancel closes it and keeps the form's choices. The
action creates the project and its interview chat through `startProject`, the
same path as the new project form, and a blank name is refused in the name
dialog. A built-in buddy in a built-in activity, or an unedited copy of one,
has a prepared opening (`src/activities/prepared-openings.ts`), so the chat
starts without a model call. With an edited buddy or activity of the user's
own, the buddy writes its opening, as the activity asks, which takes a model
call.
Merely viewing the Chats page, or opening and closing its dialog, creates
nothing. Standalone chats started before they
got openings remain accessible alongside later ones, with their history and
buddy unchanged.

A standalone conversation has no project memory, so it can't enter the
project interview, and no [progress timeline](progress-timeline.md), so it
can't record milestones. Its buddy can search and cite the Blender manual, change
the chat's activity, and create a project when the user asks; that does not
move the standalone conversation into the project. The new project's
interview opens through the link the chat shows.

## Today

The new chat page opens with a **Today** section above the new-chat form
(#610), so the landing page shows what is waiting for the user. The page's
heading is "Today", and the form follows under its own heading, "Start a
chat". A user with no chats sees only the form, under the heading "Start a
chat", with no empty Today section.

Today lists two things, both by most recent activity. A chat is active when
it starts or gains a message, and a project is as active as its most active
chat:

- **Your projects:** up to three projects. Each shows its name, linking to
  the project, its next step if its memory records one, and a Continue link
  to its most recently active chat. Each Continue link's accessible name
  includes the project's name, such as "Continue Sea turtle model".
- **Recent chats:** up to three other chats, project or standalone, each
  linking to its conversation with its project's badge. A chat that a
  Continue link already opens isn't listed again.

The next step is the project memory's first line that starts "Next step:",
read by `nextStepOf` in `src/memory/next-step.ts`. List markers, headings
and bold around the label are allowed. A memory without such a line shows
the project without a next step. The `update_memory` tool's description asks
the buddy to keep one current "Next step:" line, and the user can write or
edit it on the memory page.

The page stays a Server Component. `readToday` in
`src/today/today-store.ts` reads Today with owner-scoped queries, which
include the team projects the user is a member of, and makes
no model call. Unread check-ins (#609) can join Today as another part above
the projects: add a list to the `Today` type in `src/today/today.ts` and a
part to `TodaySection` in `src/components/today-section.tsx`.

## Activities

Every chat is in one activity at a time: the open chat, the project
interview, brainstorming, project breakdown, or one of the user's own
activities. The new chat page is the start page of every activity, at
`/chats/new?activity=ACTIVITY_ID`. Choosing the interview also chooses a new
project. The new project form starts an interview too. A chat records each
activity it enters, with a snapshot of it, in the `activity_sessions` table. The buddy changes the activity with the
`select_activity` tool. Its in-chat result shows the activity it entered,
including while the reply streams and after reopening the chat. Saved activity
sessions persist and apply to subsequent replies. Active standalone and project
chats have no Activity dropdown, label, or selection progress and error UI
(#580 supersedes the selector requirements in #561 and #562). Activity selection
on the new-chat forms and activity management remain available. See the
[activities use cases](../apps/web/use-cases/activities.md).

## All chats and project filtering

The hub lists all owned conversations, both project and standalone chats,
newest first by creation time (descending id breaks ties). Each links to its
existing conversation. There is no chat-name search or separate No project
filter.

Above the list, **Project** offers **All** and only the viewer's own projects by
name. The page loads the complete owned chat list, even when opened with a
project filter. Selecting a project immediately filters those loaded chats in
the browser, without submitting a form, navigating or requesting another list.
Selecting All restores the loaded list in its original order. Each change
replaces the current address with `/chat?project=<id>` (or removes `project` for
All), so a valid owned choice stays selected on reload or when reopening a
saved URL. An owned project with no chats stays selected and shows the usual
empty-chat message.

The page resolves the raw URL value against the viewer's project choices.
Missing, empty, malformed, unknown, foreign or array-valued values (including
repeated parameters with either equal or different values) all mean All.
Foreign and nonexistent project ids give the same choices and results, without
a not-found response or disclosure of another user's project. Sharing a filter
URL does not grant access: another viewer sees their own All list unless they
own the selected project. Selecting All restores the full owned list.

## Project badges and phones

Only the all-chats page opts into project-name badges. A project chat displays
its project's name outside the conversation link; a standalone chat has no
badge. The accessible link name remains the chat name and buddy, or just the
buddy when unnamed. The chat-names extra still controls chat-name visibility.
Project pages keep their existing project-only list without badges.

The selector uses the semantic theme tokens and
`--target-size` controls. Long unbroken project names truncate in badges rather
than expanding the page. Browser tests exercise the assembled page at 320 and
390 pixels in every theme and both modes, alongside the selector's dedicated
selected-state and target-size tests.

## Behavioral evidence

The [chat use cases](../apps/web/use-cases/chats.md) define
`use_case_list_all_chats`, `use_case_filter_chats_by_project`,
`use_case_chat_project_badge` and `use_case_today_on_landing`, with exactly
slug-titled Vitest groups.

- `apps/web/test/app/(workspace)/chat/page.server.test.ts` composes the actual
  page and stores with isolated signed-in users: mixed ordering across multiple
  projects, ordered project filtering, empty projects, invalid URL fallbacks,
  foreign choices and shared URLs.
- `apps/web/test/component-integration/components/new-chat-dialog.browser.test.tsx`
  checks the "New chat" dialog: its name, the form's default choices, focus
  kept inside, closing by Escape or the close button with focus returned, and
  that opening and closing it sends nothing. The phone checks
  (`phone-pages.touch.browser.test.tsx`) measure the open dialog too.
- `apps/web/test/components/chat-project-filter-behavior.browser.test.tsx`
  checks immediate local filtering, switching back to All, empty states and
  address updates without fetching another list.
- `page.touch.browser.test.tsx` checks the complete phone layout, including
  long project badges. `test/components/chat-list.browser.test.tsx` checks
  badge visibility, accessible link names, colors and containment under
  `use_case_chat_project_badge`. The former jsdom `page.test.tsx` checks of
  controls, native GET serialization and query arguments were removed in #508.
- `apps/web/test/app/(workspace)/projects/[projectId]/page.server.test.ts`
  checks the project page's form, with the project chosen and no foreign
  choices, and `page.browser.test.tsx` beside it checks that the form sends
  the project, shows progress, and stays on the page when the chat can't
  start.
- `apps/web/test/component-integration/today/today.server.test.ts` checks
  what Today reads under `use_case_today_on_landing`: ordering by activity,
  next steps from memory, Continue chats, no repeated chats, the limit,
  another user's data and a new user's empty Today.
- `apps/web/test/component-integration/app/(workspace)/chats/new/page.browser.test.tsx`
  checks the landing page's Today section: the next step, the Continue and
  chat links, the keyboard order, and the form alone for a new user. The
  phone checks measure Today with long names.
- `apps/web/test/component/memory/next-step.test.ts` checks reading the next
  step from memory.
- `apps/web/test/chats/all-chats.*.test.ts` verifies the reusable query's SQL
  predicates, ordering and row conversion, including real-database isolation.
- Existing standalone-conversation tests continue to cover starting and
  reopening chats, history and buddy preservation. The former jsdom checks of
  the project page's badge-free output were removed in #508.

Chat behavior stays in Vitest. Playwright covers authentication flows only.
Server and authentication runs require the non-production test database and
mock buddy, guarded by `checkTestEnvironment`; never substitute a production
database or a real model.

## Check-ins

A project's buddy can start a chat on its own: a check-in. The project's page has a Check-ins setting, saved per project: Off, the default, Daily, A few times a week (every other day) or Weekly (`src/components/check-in-setting.tsx`, `saveCheckInSettingAction`).

Once a day, the scheduler calls `/api/check-ins` ([site operations](Site-Operations.md#check-ins)). For each due project, `src/check-ins/check-ins.ts` does the following:

1. Claims the project's check-in. A project is due when its check-ins are on and nothing has happened in it for its interval: no check-in claimed, no chat started and no message sent. The interval is the schedule's days less one hour, so a daily run at about the same time each day still finds a daily project due. A project whose last check-in is still unread for its owner isn't due either; another user's mark doesn't hold it. The claim is one conditional update, so of two runs at once only one claims the project, and a run soon after finds it claimed.
2. Starts the check-in (`startCheckIn` in `src/chats/start-chat.ts`). It checks the owner's quota, and skips the project without error when the quota is used up. The new chat is in the open chat, with the buddy of the project's newest chat. Instead of the activity's opening kickoff, the check-in kickoff (`src/check-ins/check-in-kickoff.ts`) asks the buddy for two or three sentences, from the project's memory, about where the user left off and one small next step, so the buddy always writes it. The chat is saved with its opening and activity session in one transaction, and then marked unread for the owner and each of the project's [members](team-projects.md) (`markChatUnreadFor`). Each clears only their own mark by opening it.
3. Emails the owner the buddy's message, with a link to the chat and a link to turn the project's check-ins off (`src/email/check-in-email.ts`). A failed email is logged; the chat stays.

When the quota is used up, the run keeps the claim, so the project waits its interval like any other instead of going first in every run until the quota resets. When Claude is unavailable or something fails, the run gives the claim up, so the next run tries again.

The link to turn check-ins off names the user and the project, signed with `SESSION_SECRET` (`src/check-ins/check-ins-off-link.ts`). It works without signing in and never expires. It opens `/check-ins/off`, which changes nothing until the user confirms, so a mail scanner that opens the link leaves check-ins on.

### Unread chats

Unread marks are per user. A row in `chat_unreads` marks one chat unread for one user, and `src/chats/unread-marks.ts` holds the SQL that reads and writes the rows. Only a check-in marks a chat. After saving the chat, `startCheckIn` calls `markChatUnreadFor` with the users to mark, today the project's owner. A user who can't read the chat gets no mark, and a user named twice or already marked keeps one mark.

Chat lists show the viewer's own marks: the Chats page, a project's page and Today. Each list shows an "Unread" mark beside the chat's link, outside its accessible name. The link names the mark as its description (`aria-describedby`), so a screen reader that moves from link to link still announces it. Opening the chat's page clears the viewer's mark and no one else's (`markChatRead`).

The column `chats.unread` held a single mark for everyone before. Migration 0028 copied each unread chat to a mark for its owner. The code no longer reads the column. For one release it still writes it, so a rollback to the build before finds it right: `markChatUnreadFor` sets it when it marks the chat's owner, and `markChatRead` clears it when the chat's owner opens the chat. A later release stops writing the column and drops it.

The use cases are in [the chat use cases](../apps/web/use-cases/chats.md#use_case_check_in) and [the project use cases](../apps/web/use-cases/projects.md#use_case_set_check_ins). `apps/web/test/component-integration/check-ins/check-ins.server.test.ts` runs the route against the test database with the mock buddy and the email outbox; `chat-list.browser.test.tsx` checks the Unread mark. `apps/web/test/component-integration/chats/unread-marks.server.test.ts` checks that two users' marks on one chat stay apart.

## Chat names

The pencil replaces the chat title with a focused inline name field and
Save name and Cancel icon buttons on the same row. The buddy stays below
the editor. Saving or cancelling restores the title and pencil. Names have at most 60 characters. Empty or whitespace-only
names show a validation message and keep the entered text. Cancel discards the
draft. Saving updates the title and chat lists, persists across reloads, and
prevents automatic naming from changing the name again. The pencil and editor
work with a keyboard and on narrow phone screens.

The conversation header uses compact spacing and a smaller title, with project
navigation (or Chats for standalone chats) above the title and buddy identity.
Long names truncate visually on phones while retaining their full accessible
names. The navigation and rename pencil keep 44-pixel touch targets. The pinned
header's scroll clearance follows its compact size.

## Message authors

Each user message records its author, the user who sent it, in the
nullable column `messages.user_id` (#629). A message with no author recorded
belongs to the chat's owner: the project's owner, or the standalone chat's
user. Messages saved before authors were recorded have no author, and the
buddy's messages never have one. `listMessages` reads every user message
with its author in the message's metadata, and `src/chats/message-author.ts`
defines the author type.

An author's name is the name they asked the buddy to call them
(`src/accounts/user-name.ts`). On the chat screen, a user message that
someone other than the viewer wrote shows its author's name, or their email
address if they have no name, where the viewer's own messages show "You".
The author in a message's metadata holds the email address only for an
author with no name, so a named author's address never reaches anyone's
browser, as with the members list ([team projects](team-projects.md)).
The name comes before the message, so a screen reader reads it first, and a
long name wraps on a phone. A chat that only the viewer writes in looks as
it did before authors were recorded.

When a chat's user messages have more than one author, the buddy needs to
know who is speaking. `src/replies/author-names.ts` starts each user turn
sent to the model with a header, a text part of its own, such as
`[Message from "Alex"]`. The name is quoted with `JSON.stringify`, and the
header is always the turn's first part, so nothing a person types, and no
name, can pass for another person's header. Each author in the chat also
has a label, numbered in the order they first wrote: "person 1", "person 2"
and so on. A header adds the label when two authors share a name, ignoring
case, and uses the label alone for an author with no name. The model never
receives an email address.

The chat's part of the system prompt adds the rules for several people
(`SEVERAL_AUTHORS_RULES` in `src/replies/global-prompt.ts`). They tell the
buddy that only a turn's header says who wrote it, that a name and a colon
inside a message are just what that person typed, and to address people by
name. The rules stay out of the prompt's shared, cached part. A chat with
one author sends the model exactly what it sent before, and the saved
messages never hold the headers. The mock buddy reads a command past the
header, and `/mock-recall` also searches it.

Only a chat's owner can write in it until team projects add members (#626).
Server tests write other authors' messages through the `author` field of
the test kit's exchanges (`apps/web/test/support/test-database/data-test-kit.ts`).
`use_case_chat_with_several_people` covers this behavior.

## Following messages

Opening a chat or sending a message brings the latest content into view.
While the user stays at the bottom, new messages and streamed reply content
keep the chat there. Scrolling up pauses following and preserves the reading
position. Returning to the bottom or sending a message resumes following.
Scrolling is instant to respect reduced-motion preferences.

On phones, following adapts when the keyboard changes the available space.
The composer also moves above a keyboard that shrinks only the visual viewport.
The browser tests in `apps/web/test/component-integration/components/chat/chat-scroll.browser.test.tsx`
cover these behaviors under `use_case_follow_latest_messages`.

## Chat image attachments

Select or paste up to four JPEG, PNG, GIF or WebP images per message, each at most 2 MiB. Preview and remove images before sending, with or without text. Images persist in the chat and remain available to the buddy for follow-up questions. Phone image selection works through the image picker; export HEIC images as JPEG or PNG first.

See [image storage and operations](Site-Operations.md#chat-image-attachments) for setup, private delivery, deletion and testing.
