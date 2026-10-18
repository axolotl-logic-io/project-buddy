## Behaviour

All paths are under `apps/web/`.

1. **B1 — every chat, newest first.** The chats page (`/chat`) lists every chat the signed-in user owns: chats in her projects and chats in no project together, newest first (by `createdAt`, then `id`, both descending, as `listCentralChats` orders them now). It lists no other user's chat.
2. **B2 — the store.** `listAllChats(owner)` in `src/chats/central-chat.ts` returns those chats as `FoundChat`s (`src/chats/chat-rows.ts:60`): a project chat is `kind: "project"` with its `projectId` and `projectName`, a chat in no project is `kind: "central"`. `listAllChats(owner, projectId)` returns only that project's chats, in the same order, and `[]` for another user's project. Its `where` is built from `chatOwnedBy` (`src/accounts/owner-scope.ts:40`).
3. **B3 — the selector.** Above the list of chats (after the "Chats" `h2`, before the list), a `<select>` labelled **"Project"**, named `project`, offers **"All"** first and then each of her projects by name, in `listProjects` order (newest first); each project's option has the project's id as its value. Another user's project is never offered. It sits in a GET form whose submit button reads **"Show chats"** and which submits to `/chat`, so choosing a project loads `/chat?project=<id>`.
4. **B4 — the URL's choice.** With `?project=<id>` naming one of her projects, the selector shows that project and the list holds only that project's chats. With no `project`, an empty one, another user's project id, an unknown id or a malformed one, the selector shows "All" and the list holds every chat of hers (a foreign id reads as not found, so as no filter). The page stays a Server Component.
5. **B5 — badges.** In the chats page's list, each project chat's card shows a badge with its project's name, outside the chat's link, so the link's accessible name stays the chat's title (its name, if any, and buddy). A chat in no project shows no badge.
6. **B6 — layout and themes.** The selector and the badges use only theme tokens (`src/themes/contract.css`); the select and the button are at least `--target-size` tall; a long project name (one long word included) is truncated in its badge and doesn't widen the select, so at 320 px and 390 px the chats page doesn't scroll sideways (`src/app/phone-pages.touch.browser.test.tsx`). The badge's colours are a pair `src/themes/contrast.test.ts` already checks, so it meets WCAG AA in every theme.
7. **B7 — copy.** The new labels ("Project", "All", "Show chats") live in `STANDALONE_CHATS_COPY` in `src/ui/copy/chat.ts`.
8. **B8 — use cases.** `use-cases/chats.md` holds `use_case_list_all_chats`, `use_case_filter_chats_by_project` and `use_case_chat_project_badge`, each with tests titled by its slug.

## Out of scope

- A "No project" option in the selector, and search by chat name (the issue).
- The project page's list of chats: `listChats` (`src/chats/store.ts:70`) and the project page keep their output, with no badges.
- Removing `listCentralChats`; server tests still use it. The implementer may leave it as is.
- An empty-state message of its own for a project with no chats (every project starts with a chat; the page may keep `noChats`).

## Design

**Store (`src/chats/central-chat.ts`).** `listAllChats(owner, projectId?)` (stub at `src/chats/central-chat.ts:69`) selects the chats left-joined to `projects` on `chats.projectId = projects.id`, reading `projects.name` and `projects.interviewChatId`, exactly as `getChat` does (`src/chats/store.ts:90-123`), with `where(and(chatOwnedBy(owner), eq(chats.projectId, projectId)))` when given a project (drizzle's `and` drops an `undefined` operand), ordered `desc(chats.createdAt), desc(chats.id)` like `listCentralChats` (`src/chats/central-chat.ts:53`). Rows map through `toChats` (`src/chats/chat-rows.ts:119`, which keeps extra columns) and `toFoundChat` (`src/chats/chat-rows.ts:168`), so it returns `FoundChat[]` with no new row type. The join only reads the project's name; `chatOwnedBy` keeps the chats hers (owner-scope rule, digest "Data"). To share the column list with `getChat` rather than copy it, move it into `chat-rows.ts` (for example a `foundChatColumns` object) and use it from both: `src/chats/store.ts` is at the 300-line lint limit, which is also why the function lives in `central-chat.ts`, the store of the chats page, and not in `store.ts`. Its errors go through `withAppErrors("listAllChats", …)` like its neighbours.

**Page (`src/app/(workspace)/chat/page.tsx`).** It becomes `StandaloneChatsPage({ searchParams }: PageProps<"/chat">)`, stays an async Server Component (digest "UI"), and awaits `searchParams`. It reads `project` as a string (an array or missing reads as none), resolves it with `parseProjectId` (`src/ids.ts:68`) against `listProjects(user.id)` (`src/projects/store.ts:52`): the chosen project is the one of hers whose id equals it, or none. It loads `listProjects` and `ownBuddyChoices` together, then `listAllChats(user.id, chosen?.id)`. Resolving against her own list is what makes a foreign or malformed id read as All ("define errors out of existence": an unknown id is not found, and not-found here means no filter). The list section reads: `h2` "Chats", then the selector form, then `ChatList`. The form is plain HTML in the page (no `"use client"`): `<form action="/chat" method="get">` holding `SelectField` (`src/components/ui/field.tsx:124`, the labelled select the new-chat form uses) with `name="project"` and `defaultValue` the chosen id or `""`, the "All" option with value `""`, one option per project, and `Button type="submit" variant="secondary"` (`src/components/ui/button.tsx`). Lay it out as `flex flex-wrap items-end gap-3`, with the field `min-w-0 flex-1`, so at 320 px the button wraps under the select rather than pushing the page wide. `input-field` (`src/app/page-roles.css:114-121`) is `w-full`; give the select `min-h-(--target-size)` if it is not already that tall (`--target-size`, `src/app/page-roles.css:21`). The `NewStandaloneChatForm` section above (`page.tsx`'s first `section`) is the layout to match.

**List (`src/components/chat-list.tsx`).** `ChatList` (`src/components/chat-list.tsx:30`) gets an optional prop, such as `showProjectNames?: boolean` (default false), and its `chats` type widens to `readonly (Chat | FoundChat)[]`. When the prop is set, a chat with `kind === "project"` shows its `projectName` in a badge: a `span` beside the link, inside the `li.link-card`, not inside the `Link`, so the card's stretched link (`src/app/page-roles.css:191-200`) still covers the card and the link's name is unchanged. Make it a theme-token pill such as `inline-block max-w-full truncate self-start rounded-control border border-line bg-field px-2 text-muted text-sm` (token pairs `muted` on `field` and `line` on `surface` are checked by `src/themes/contrast.test.ts:44-55`). The chats page passes the prop; the project page (`src/app/(workspace)/projects/[projectId]/(overview)/page.tsx:21`) doesn't, so its list keeps its output even though its tests' `FOX_CHAT` fixture is a `ChatInProject`. A prop, rather than badging every `kind: "project"` chat, keeps that page unchanged without depending on the shape `listChats` happens to return.

**Copy.** Add to `STANDALONE_CHATS_COPY` (`src/ui/copy/chat.ts:35`): `projectFilterLabel: "Project"`, `allProjects: "All"`, `showChats: "Show chats"` (names are the implementer's; the texts are what the tests read). The tests use the literal texts because the copy keys don't exist yet; once they do, the implementer may switch the tests to the keys.

**Visual.** `e2e/visual/standalone-chats.spec.ts` now also makes a project, "Low-poly fox den", with a Hippy chat between the two central chats (committed). Today's screenshot is unchanged by that, since the page doesn't list project chats yet; once the page does, regenerate the baselines in `e2e/visual/standalone-chats.spec.ts-snapshots/` for every theme, both modes, 1280, 390 and the phone projects, in the same commit as the visual change (`npm run test:visual:update`, digest "Site tests").

**Practices followed.** Deep module and information hiding: the query, the join and the owner scope stay in the store; the page only resolves the URL's id against her projects. Pages stay Server Components; copy lives in `src/ui/copy/`; colours are semantic tokens; WCAG AA, no sideways scroll at 320 px and `--target-size` targets (digest "UI"). Queries build their `where` from `owner-scope.ts`, and `owner-scope-coverage.test.ts` now calls `listAllChats` (digest "Data"). Use cases drive the tests: a server test for what needs the database, component tests for the UI, the phone browser check for layout, and the visual spec for the look (`use-cases-drive-tests`, `e2e-visual-and-auth-only`). No `as`, no ternaries, explicit types (digest "Lint").

## Test interfaces

- `listAllChats(owner: UserId, projectId?: ProjectId): Promise<FoundChat[]>` — `src/chats/central-chat.ts`, new (stub committed).
- `StandaloneChatsPage({ params, searchParams }: PageProps<"/chat">): Promise<JSX.Element>` — `src/app/(workspace)/chat/page.tsx`, changed: it takes `searchParams` with an optional `project`. The tests call it through a typed alias, `(args: { params; searchParams: Promise<{ project?: string }> }) => Promise<JSX.Element>`, which today's zero-argument page also satisfies, so no stub change was needed.
- The `/chat` page's UI: the "Project" combobox, its options, its GET form and "Show chats" button, and the chat cards with their badges — driven through the page above in `page.test.tsx` and the phone check.
- `use-cases/chats.md` cases, checked by `use-cases/use-cases.test.ts`.

## Tests

All committed on `agent/issue-472`. Run with `npm test` (component, unit, browser), `npm run test:server` (server tests) and `npm run test:visual`.

`src/chats/all-chats.server.test.ts` (new; two users through `twoUsers`, `src/test-database/two-users-test-kit.ts`). She has a central chat, a donut-project chat, a second central chat and a fox-project chat, made in that order; the other user has a project with a chat and a central chat. All fail today because `listAllChats` is a stub that rejects, or because today's page lists only chats in no project.
- `use_case_list_all_chats`
  - "lists her project chats and chats in no project together, newest first, and none of another user's" — `listAllChats(her.id)`; B1, B2.
  - "gives each project chat its project's name, and a chat in no project none" — `listAllChats`; B2, B5's data.
  - "the chats page links to every chat of hers, newest first, and to none of another user's" — the page, rendered with `renderToStaticMarkup`; B1. Fails today: the page links only her central chats.
- `use_case_filter_chats_by_project`
  - "lists only the chats of the project it is given" — `listAllChats(her.id, donut.id)`; B2.
  - "lists no chats for another user's project" — `listAllChats(her.id, theirProject.id)` is `[]`; B2.
  - "the chats page shows only the chats of the project in its URL" — page with `project` = each of her projects; B4. Fails today: the page ignores `project` and shows no project chat.
  - "the chats page shows all her chats for another user's project id, as for an unknown one" — B4; fails today, the project chats are missing.
  - "the chats page shows all her chats for a malformed project id" — B4; same.
  - "the chats page offers her projects, and not another user's, to filter by" — the HTML holds `value="<her project id>"` for both and not the other user's id; B3. Fails today: there is no selector.

`src/app/(workspace)/chat/page.test.tsx` (changed; stores mocked). The mocks now include `listAllChats` (resolving `[FOX_CHAT, CENTRAL_CHAT]`) and `listProjects` (`[DONUT_PROJECT, FOX_PROJECT]`), and every call passes `params` and `searchParams`. The `listCentralChats` mock stays so today's page still renders; the existing call-order assertion on `listCentralChats` was dropped (an internal, not promised).
- `use_case_list_all_chats` › "lists her project chats beside her chats in no project" — B1; fails today, no card links to `FOX_CHAT`.
- `use_case_filter_chats_by_project`
  - "offers All and each of her projects by name, with All chosen" — B3, B4; fails today, no "Project" combobox.
  - "sits above the list of chats" — B3; same.
  - "puts the choice in the page's URL, through a form that gets the page" — select named `project`, option values are project ids, form `method` get, action `/chat` (or none), a submit button "Show chats"; B3; same.
  - "shows the project in the URL as chosen" — B4; same.
  - "reads a project id that isn't hers, as another user's as All" and "reads a malformed project id as All" (`test.each`) — B4; same.
- `use_case_chat_project_badge`
  - "badges a project chat with its project's name, beside its link" — the fox card holds "Low-poly fox" and its link's name is still the buddy's name; B5. Fails today: the page doesn't list the fox chat.
  - "badges only the project chats, and a chat in no project not at all" — B5; same.
- The existing tests there pass today and after.

`src/accounts/owner-scope-coverage.test.ts` (changed): `src/chats/central-chat.ts`'s entry now calls `listAllChats(OWNER, PROJECT_ID)`. "listAllChats reads and writes only the owner's data" fails today (the stub sends no query); B2's owner scope.

`src/app/phone-pages-test-kit.tsx` and `src/app/phone-pages.touch.browser.test.tsx` (changed): the "the standalone chat list" entry mocks `listAllChats` with a project chat whose project's name is one 60-character word, and `listProjects` with that project, and calls the page with `searchParams`. Passes today (the page doesn't show the name yet); once the page shows the badge and the option, it pins B6: no sideways scroll at 320 and 390 px and every target at least `--target-size`.

`e2e/visual/standalone-chats.spec.ts` (changed): adds a project chat to the page's data; B5, B6's look. Today's baselines still match; the implementer regenerates them with the page change.

`use-cases/chats.md` (changed): the three new cases, and `use_case_central_chat`'s step now says the page lists all her chats; `use-cases/use-cases.test.ts` passes with the slug-titled tests above; B8.

Contrast (B6) needs no new test: the badge uses token pairs `src/themes/contrast.test.ts` checks in every theme. Copy placement (B7) is checked by review and lint, not a test.

## Wiki updates

- `Decisions-Product.md`, `central-chat`: a bullet that the chats page lists every chat, with project badges and a `?project=<id>` selector, and that a foreign or malformed id reads as All (#472). No practice changed, so the digest is unchanged.

## Assumptions and risks

- The selector is a `<select>` in a GET form with a "Show chats" button, not a group of links: it scales to many projects and fits 320 px. Without client JavaScript a select can't apply itself on change; a button is the cost of keeping the page a Server Component with no client state. The labels "Project", "All" and "Show chats" are this spec's choice; the issue fixes only "All".
- `SelectField` uses `useId` and radix `Label` with no `"use client"`; both work in a Server Component tree (radix ships its own client boundary). If it doesn't render there, wrap the form in a small client-free component or use a plain `label`/`select` with the same classes.
- The server tests could not be run in this session (no test database for the spec stage); they type-check and lint clean, and their failure today is the stub's rejection or the page's missing project chats. The component, coverage, use-case and phone tests were run once each.
- The visual baselines must be regenerated on the maintainers' platform (`*-darwin.png`); if the implementer can't run Playwright, that is the one step left.
- The page now waits for `listProjects` before `listAllChats` (two round trips). Filtering in the query keeps the list small; fetching all chats in parallel and filtering in the page is the alternative if the wait shows.

## Sources

- Issue #472 and its triage notes.
- Wiki: `Coding-Practices-Digest.md`; `Decisions-Product.md` (`central-chat`); `Decisions-Site-and-UI.md:15,30`.
- Code: `src/chats/central-chat.ts:53,69`; `src/chats/store.ts:70-123`; `src/chats/chat-rows.ts:53-60,119,168`; `src/accounts/owner-scope.ts:40`; `src/accounts/owner-scope-coverage.test.ts`; `src/projects/store.ts:52`; `src/ids.ts:68`; `src/app/(workspace)/chat/page.tsx`; `src/components/chat-list.tsx:30`; `src/components/ui/field.tsx:124`; `src/components/ui/button.tsx`; `src/app/page-roles.css:21,114-121,181-200`; `src/themes/contrast.test.ts:44-55`; `src/ui/copy/chat.ts:35`; `src/app/(workspace)/page-fixtures.ts`; `src/accounts/private-data.server.test.ts` (rendering pages in server tests); `src/test-database/two-users-test-kit.ts`, `data-test-kit.ts`; `src/app/phone-pages-test-kit.tsx:269`; `e2e/visual/standalone-chats.spec.ts`; `use-cases/README.md`, `use-cases/chats.md`.
- Next.js generated `PageProps` (`.next/types/routes.d.ts`, from `next typegen`): `searchParams: Promise<Record<string, string | string[] | undefined>>`.

<!-- end of spec -->
