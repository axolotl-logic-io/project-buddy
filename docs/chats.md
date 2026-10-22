# Chats

## Central chat

The current `/chat` page is the signed-in user's **Chats** hub, not a single
central conversation and not a standalone-only list (#472, #482). This updates
the `central-chat` description and the `/chat` navigation/mobile references in
the checkout's [pinned product wiki](../wiki/Decisions-Product.md#central-chat).
The pinned wiki is historical reference; this page records the current behavior
on the code branch.

Home remains `/` and remains the landing page after sign-in. Home and the
signed-in header link to Chats and Projects. Every conversation, including the
original central chat, opens at its existing `/chats/[chatId]` address. Project
conversations link back to their project; standalone conversations link back to
Chats. The conversation routes use `ChatScreen` and retain their existing
history, buddy and keyboard/composer behavior. `/chat` is a Server Component
with the existing new-chat form, not a conversation screen.

Starting a standalone chat requires no project. The user can pick a built-in
buddy or one of their own, with Hippy selected initially. Starting creates a
fresh, empty conversation with that buddy; it makes neither a project nor a
model call. Merely viewing the hub creates nothing. The original central chat
remains accessible alongside later conversations, with its history and buddy
unchanged.

A standalone conversation still has no project memory or interview. Its tutor
can search and cite the manual, and can create a project when the user asks;
that does not move the standalone conversation into the project. The new
project's interview opens through its existing link. These conversation
workflows are unchanged by the all-chats list.

## All chats and project filtering

The hub lists all owned conversations, both project and standalone chats,
newest first by creation time (descending id breaks ties). Each links to its
existing conversation. There is no chat-name search or separate No project
filter.

Above the list, **Project** offers **All** and only the viewer's own projects by
name. **Show chats** submits a native GET form to `/chat?project=<id>`, so no
client-side filter state or JavaScript is required. A valid owned choice stays
selected on reload or when reopening a saved URL. The owner-scoped query
filters by that project in storage, rather than fetching every chat and
filtering in memory. An owned project with no chats stays selected and shows
the usual empty-chat message.

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

The selector and Show chats button use the semantic theme tokens and
`--target-size` controls. Long unbroken project names truncate in badges rather
than expanding the page. Browser tests exercise the assembled page at 320 and
390 pixels in every theme and both modes, alongside the selector's dedicated
selected-state and target-size tests. The existing screenshot scene includes
both project and standalone chats across all theme/mode, desktop/phone and
emulated-device baselines.

## Behavioral evidence

The [chat use cases](../apps/web/use-cases/chats.md) define
`use_case_list_all_chats`, `use_case_filter_chats_by_project` and
`use_case_chat_project_badge`, with exactly slug-titled Vitest groups.

- `apps/web/test/app/(workspace)/chat/page.server.test.ts` composes the actual
  page and stores with isolated signed-in users: mixed ordering across multiple
  projects, ordered project filtering, empty projects, invalid URL fallbacks,
  foreign choices and shared URLs.
- The adjacent `page.test.tsx` verifies default/selected controls, native GET
  form serialization, the owner-scoped query arguments, badges and accessible
  link names. `page.touch.browser.test.tsx` checks the complete phone layout.
- `apps/web/test/chats/all-chats.*.test.ts` verifies the reusable query's SQL
  predicates, ordering and row conversion, including real-database isolation.
- Existing standalone-conversation tests continue to cover starting and
  reopening chats, history and buddy preservation. The project page's component
  tests guard its unchanged badge-free output.

Functional behavior stays in Vitest. Playwright covers the visual scene and
existing authentication flows only. Server and visual runs require the
non-production test database and mock tutor, guarded by `checkTestEnvironment`;
never substitute a production database or a real model.
