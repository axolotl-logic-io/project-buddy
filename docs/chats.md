# Chats

## Standalone chat

The current `/chat` page is the signed-in user's **Chats** hub, not a single
standalone conversation and not a standalone-only list (#472, #482). This page
describes the hub, filtering and conversation workflows.

Home remains `/` and remains the landing page after sign-in. Home and the
signed-in header link to Chats and Projects. Every conversation, including the
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
project interview. Its buddy can search and cite the Blender manual, change
the chat's activity, and create a project when the user asks; that does not
move the standalone conversation into the project. The new project's
interview opens through the link the chat shows.

## Activities

Every chat is in one activity at a time: the open chat, the project
interview, brainstorming, project breakdown, or one of the user's own
activities. The new chat page is the start page of every activity but the
interview, at `/chats/new?activity=ACTIVITY_ID`; the interview starts from the
new project form. A chat records each activity it enters, with a snapshot of
it, in the `activity_sessions` table. The buddy changes the activity with the
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
`use_case_list_all_chats`, `use_case_filter_chats_by_project` and
`use_case_chat_project_badge`, with exactly slug-titled Vitest groups.

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
- `apps/web/test/chats/all-chats.*.test.ts` verifies the reusable query's SQL
  predicates, ordering and row conversion, including real-database isolation.
- Existing standalone-conversation tests continue to cover starting and
  reopening chats, history and buddy preservation. The former jsdom checks of
  the project page's badge-free output were removed in #508.

Chat behavior stays in Vitest. Playwright covers authentication flows only.
Server and authentication runs require the non-production test database and
mock buddy, guarded by `checkTestEnvironment`; never substitute a production
database or a real model.

## Chat names

The pencil beside a chat's title opens an inline name field with Save name
and Cancel actions. Names have at most 60 characters. Empty or whitespace-only
names show a validation message and keep the entered text. Cancel discards the
draft. Saving updates the title and chat lists, persists across reloads, and
prevents automatic naming from changing the name again. The pencil and editor
work with a keyboard and on narrow phone screens.

The conversation header uses compact spacing and a smaller title, with project
navigation (or Chats for standalone chats) above the title and buddy identity.
Long names truncate visually on phones while retaining their full accessible
names. The navigation and rename pencil keep 44-pixel touch targets. The pinned
header's scroll clearance follows its compact size.

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
