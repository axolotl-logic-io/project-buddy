## Behaviour

All paths are under `apps/web/`.

1. **B1 — every chat, newest first.** The chats page (`/chat`) lists every chat the signed-in user owns: chats in her projects and chats in no project together, newest first (by `createdAt`, then `id`, both descending, as `listCentralChats` orders them now). It lists no other user's chat.
2. **B2 — the store.** `listAllChats(owner)` in `src/chats/all-chats.ts` (new) returns those chats as `FoundChat`s (`src/chats/chat-rows.ts:60`): a project chat is `kind: "project"` with its `projectId` and `projectName`, a chat in no project is `kind: "central"`. `listAllChats(owner, projectId)` returns only that project's chats, in the same order, and `[]` for another user's project. Its `where` is built from `chatOwnedBy` (`src/accounts/owner-scope.ts:40`).
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

**Store (`src/chats/all-chats.ts`, new).** `listAllChats(owner, projectId?)` (stub at `src/chats/all-chats.ts:10`) selects the chats left-joined to `projects` on `chats.projectId = projects.id`, reading `projects.name` and `projects.interviewChatId`, exactly as `getChat` does (`src/chats/store.ts:90-123`), with `where(and(chatOwnedBy(owner), eq(chats.projectId, projectId)))` when given a project (drizzle's `and` drops an `undefined` operand), ordered `desc(chats.createdAt), desc(chats.id)` like `listCentralChats` (`src/chats/central-chat.ts:53-60`). Rows map through `toChats` (`src/chats/chat-rows.ts:119`, which keeps extra columns) and `toFoundChat` (`src/chats/chat-rows.ts:168`), so it returns `FoundChat[]` with no new row type. The join only reads the project's name; `chatOwnedBy` keeps the chats hers (owner-scope rule, digest "Data"). To share the column list with `getChat` rather than copy it, move it into `chat-rows.ts` (for example a `foundChatColumns` object) and use it from both. The function gets a module of its own rather than a place in `store.ts` (at the 300-line lint limit) or `central-chat.ts`: `owner-scope-coverage.test.ts` lists each data module's exports, and a new export in an existing module would fail that test's base version, while a new module is checked once that test names it (it now does, beside `central-chat.ts`). Its errors go through `withAppErrors("listAllChats", …)` like its neighbours.

**Page (`src/app/(workspace)/chat/page.tsx`).** It becomes `StandaloneChatsPage({ searchParams }: PageProps<"/chat">)`, stays an async Server Component (digest "UI"), and awaits `searchParams`. It reads `project` as a string (an array or missing reads as none), resolves it with `parseProjectId` (`src/ids.ts:68`) against `listProjects(user.id)` (`src/projects/store.ts:52`): the chosen project is the one of hers whose id equals it, or none. It loads `listProjects` and `ownBuddyChoices` together, then `listAllChats(user.id, chosen?.id)`. Resolving against her own list is what makes a foreign or malformed id read as All ("define errors out of existence": an unknown id is not found, and not-found here means no filter). The list section reads: `h2` "Chats", then the selector form, then `ChatList`. The form is plain HTML in the page (no `"use client"`): `<form action="/chat" method="get">` holding `SelectField` (`src/components/ui/field.tsx:124`, the labelled select the new-chat form uses) with `name="project"` and `defaultValue` the chosen id or `""`, the "All" option with value `""`, one option per project, and `Button type="submit" variant="secondary"` (`src/components/ui/button.tsx`). Lay it out as `flex flex-wrap items-end gap-3`, with the field `min-w-0 flex-1`, so at 320 px the button wraps under the select rather than pushing the page wide. `input-field` (`src/app/page-roles.css:114-121`) is `w-full`; give the select `min-h-(--target-size)` if it is not already that tall (`--target-size`, `src/app/page-roles.css:21`). The `NewStandaloneChatForm` section above (`page.tsx`'s first `section`) is the layout to match.

**List (`src/components/chat-list.tsx`).** `ChatList` (`src/components/chat-list.tsx:30`) gets an optional prop, such as `showProjectNames?: boolean` (default false), and its `chats` type widens to `readonly (Chat | FoundChat)[]`. When the prop is set, a chat with `kind === "project"` shows its `projectName` in a badge: a `span` beside the link, inside the `li.link-card`, not inside the `Link`, so the card's stretched link (`src/app/page-roles.css:191-200`) still covers the card and the link's name is unchanged. Make it a theme-token pill such as `inline-block max-w-full truncate self-start rounded-control border border-line bg-field px-2 text-muted text-sm` (token pairs `muted` on `field` and `line` on `surface` are checked by `src/themes/contrast.test.ts:44-55`). The chats page passes the prop; the project page (`src/app/(workspace)/projects/[projectId]/(overview)/page.tsx:21`) doesn't, so its list keeps its output even though its tests' `FOX_CHAT` fixture is a `ChatInProject`. A prop, rather than badging every `kind: "project"` chat, keeps that page unchanged without depending on the shape `listChats` happens to return.

**Copy.** Add to `STANDALONE_CHATS_COPY` (`src/ui/copy/chat.ts:35`): `projectFilterLabel: "Project"`, `allProjects: "All"`, `showChats: "Show chats"` (names are the implementer's; the texts are what the tests read). The tests use the literal texts because the copy keys don't exist yet; once they do, the implementer may switch the tests to the keys.

**Visual.** `e2e/visual/standalone-chats.spec.ts` now also makes a project, "Low-poly fox den", with a Hippy chat between the two central chats (committed). Today's screenshot is unchanged by that, since the page doesn't list project chats yet; once the page does, regenerate the baselines in `e2e/visual/standalone-chats.spec.ts-snapshots/` for every theme, both modes, 1280, 390 and the phone projects, in the same commit as the visual change (`npm run test:visual:update`, digest "Site tests").

**Practices followed.** Deep module and information hiding: the query, the join and the owner scope stay in the store; the page only resolves the URL's id against her projects. Pages stay Server Components; copy lives in `src/ui/copy/`; colours are semantic tokens; WCAG AA, no sideways scroll at 320 px and `--target-size` targets (digest "UI"). Queries build their `where` from `owner-scope.ts`, and `owner-scope-coverage.test.ts` now covers `src/chats/all-chats.ts` and calls `listAllChats` (digest "Data"). Use cases drive the tests: a server test for what needs the database, component tests for the UI, the phone browser check for layout, and the visual spec for the look (`use-cases-drive-tests`, `e2e-visual-and-auth-only`). No `as`, no ternaries, explicit types (digest "Lint").

## Test interfaces

- `listAllChats(owner: UserId, projectId?: ProjectId): Promise<FoundChat[]>` — `src/chats/all-chats.ts`, new (stub committed).
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

`src/app/(workspace)/chat/page.test.tsx` (changed; stores mocked). The mocks now include `listAllChats` from `@/chats/all-chats.ts` (resolving `[FOX_CHAT, CENTRAL_CHAT]`) and `listProjects` (`[DONUT_PROJECT, FOX_PROJECT]`), and every call passes `params` and `searchParams`. The `listCentralChats` mock stays so today's page still renders; the existing call-order assertion on `listCentralChats` was dropped (an internal, not promised).
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

`src/accounts/owner-scope-coverage.test.ts` (changed): the `src/chats/central-chat.ts` entry now covers `src/chats/all-chats.ts` too (its `exports` spread both modules, to stay within the file's 300-line limit) and calls `listAllChats(OWNER, PROJECT_ID)`; its export-coverage test passes. "listAllChats reads and writes only the owner's data" fails today (the stub sends no query); B2's owner scope.

`src/app/phone-pages.touch.browser.test.tsx` (changed): it now also mocks `@/chats/all-chats.ts` with `listAllChats`. The pipeline doesn't let this stage change `src/app/phone-pages-test-kit.tsx` (it is a kit, not a test file), so **the implementer changes it**, as part of B6: the "the standalone chat list" entry (`src/app/phone-pages-test-kit.tsx:269`) mocks `listAllChats` with `[{ ...FOX_CHAT, projectName: LONG_NAMED_PROJECT.name }, CENTRAL_CHAT]` and `listProjects` with `[LONG_NAMED_PROJECT]`, where `LONG_NAMED_PROJECT: Project = { ...FOX_PROJECT, name: "Supercalifragilistic-low-poly-fox-in-the-autumn-garden-scene" }` (one long word), and calls the page through the same typed alias the page test uses, with `params: NO_PARAMS, searchParams: NO_PARAMS`. Without that, the entry calls the page with no arguments and fails once the page awaits `searchParams`. With it, the phone check pins B6: no sideways scroll at 320 and 390 px and every target at least `--target-size`.

`e2e/visual/standalone-chats.spec.ts` (changed): adds a project chat to the page's data; B5, B6's look. Today's baselines still match; the implementer regenerates them with the page change.

`use-cases/use-cases.test.ts` › "name only cases by the slug titles in src tests" fails today: the slug-titled tests above name `use_case_list_all_chats`, `use_case_filter_chats_by_project` and `use_case_chat_project_badge`, which `use-cases/chats.md` doesn't hold yet; B8. This stage may not edit `use-cases/chats.md`, so the implementer adds the cases there, after `use_case_new_chat_without_projects`, with the text in the appendix below, and changes `use_case_central_chat`'s step "The Chats page offers a new-chat form and her previous standalone chats, newest first." to "The Chats page offers a new-chat form and her previous chats, newest first, her standalone chats among those in her projects (`use_case_list_all_chats`)."

Contrast (B6) needs no new test: the badge uses token pairs `src/themes/contrast.test.ts` checks in every theme. Copy placement (B7) is checked by review and lint, not a test.

### Appendix: the use cases for `use-cases/chats.md`

```markdown
## use_case_list_all_chats

The user looks for a chat on the Chats page, wherever it is: in a project or in none.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link). She has chats in a project ([`use_case_new_chat`](#use_case_new_chat)) and chats in no project (`use_case_central_chat`).
- **Steps:**
  - She opens Chats, from Home or from any signed-in page's header.
- **Outcome:** the list holds every chat of hers, those in her projects and those in none together, newest first. It holds no other user's chat. Each chat links to its conversation, as on its project's page. A project's own page still lists only that project's chats.
- **Next:**
  - `use_case_filter_chats_by_project`: narrow the list to one project's chats.
  - `use_case_chat_project_badge`: tell a project's chats from the ones in no project.
  - `use_case_send_message`: carry on in the chat she found.

## use_case_filter_chats_by_project

The user narrows the Chats page's list to one of her projects.

- **Prerequisites:** `use_case_list_all_chats`.
- **Steps:**
  - Above the list, the project selector offers All and each of her projects by name. All is chosen.
  - She chooses one of her projects and shows its chats.
  - She reloads the page, or opens a link to it that she saved or shared.
  - She chooses All again.
- **Outcome:** with a project chosen, the list holds only that project's chats, and the selector shows that project. The choice is in the page's address, so the reload and the link keep it. With All, the list holds every chat of hers again. The selector offers no other user's project. An address that names another user's project, a project that doesn't exist, or something that is not a project's id shows All and every chat of hers, exactly as if it named no project.
- **Next:**
  - `use_case_send_message`: carry on in one of the project's chats.
  - [`use_case_open_project`](projects.md#use_case_open_project): go to the project itself.

## use_case_chat_project_badge

The user tells a project's chats from the chats in no project on the Chats page.

- **Prerequisites:** `use_case_list_all_chats`.
- **Steps:**
  - She looks over the list.
- **Outcome:** each chat in a project carries a badge with its project's name, beside the chat's own name and buddy. A chat in no project has no badge. A long project name is cut short in its badge rather than widening the page, even on a phone, and the badge is readable in every theme.
- **Next:**
  - `use_case_filter_chats_by_project`: show only that project's chats.
```

## Wiki updates

- `Decisions-Product.md`, `central-chat`: a bullet that the chats page lists every chat, with project badges and a `?project=<id>` selector, and that a foreign or malformed id reads as All (#472). No practice changed, so the digest is unchanged.

## Assumptions and risks

- The selector is a `<select>` in a GET form with a "Show chats" button, not a group of links: it scales to many projects and fits 320 px. Without client JavaScript a select can't apply itself on change; a button is the cost of keeping the page a Server Component with no client state. The labels "Project", "All" and "Show chats" are this spec's choice; the issue fixes only "All".
- `SelectField` uses `useId` and radix `Label` with no `"use client"`; both work in a Server Component tree (radix ships its own client boundary). If it doesn't render there, wrap the form in a small client-free component or use a plain `label`/`select` with the same classes.
- This stage could not change `src/app/phone-pages-test-kit.tsx` or `use-cases/chats.md` (the pipeline allows only test files, stubs and wiki pages); the Tests section gives the implementer the exact changes for both.
- The server tests could not be run in this session (no test database for the spec stage); they type-check and lint clean, and their failure today is the stub's rejection or the page's missing project chats. The component, coverage, use-case and phone tests were run once each.
- The visual baselines must be regenerated on the maintainers' platform (`*-darwin.png`); if the implementer can't run Playwright, that is the one step left.
- The page now waits for `listProjects` before `listAllChats` (two round trips). Filtering in the query keeps the list small; fetching all chats in parallel and filtering in the page is the alternative if the wait shows.

## Sources

- Issue #472 and its triage notes.
- Wiki: `Coding-Practices-Digest.md`; `Decisions-Product.md` (`central-chat`); `Decisions-Site-and-UI.md:15,30`.
- Code: `src/chats/central-chat.ts:53`; `src/chats/all-chats.ts`; `src/chats/store.ts:70-123`; `src/chats/chat-rows.ts:53-60,119,168`; `src/accounts/owner-scope.ts:40`; `src/accounts/owner-scope-coverage.test.ts`; `src/projects/store.ts:52`; `src/ids.ts:68`; `src/app/(workspace)/chat/page.tsx`; `src/components/chat-list.tsx:30`; `src/components/ui/field.tsx:124`; `src/components/ui/button.tsx`; `src/app/page-roles.css:21,114-121,181-200`; `src/themes/contrast.test.ts:44-55`; `src/ui/copy/chat.ts:35`; `src/app/(workspace)/page-fixtures.ts`; `src/accounts/private-data.server.test.ts` (rendering pages in server tests); `src/test-database/two-users-test-kit.ts`, `data-test-kit.ts`; `src/app/phone-pages-test-kit.tsx:269`; `e2e/visual/standalone-chats.spec.ts`; `use-cases/README.md`, `use-cases/chats.md`.
- Next.js generated `PageProps` (`.next/types/routes.d.ts`, from `next typegen`): `searchParams: Promise<Record<string, string | string[] | undefined>>`.

<!-- end of spec -->
