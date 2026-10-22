# Use cases

How invited users use the Blender tutor, described from the user's side of the screen. Tests are derived from these cases.

Playwright e2e tests in `e2e/` cover only visual regressions (`e2e/visual/`) and the auth workflows (`e2e-visual-and-auth-only` in `docs/Decisions-Code-and-tooling.md`). The auth workflows are sign-up, sign-in, sign-out, the sign-in limits, and the signed-out access gate. Every other case is tested in Vitest:

- A case that needs a real server or database gets a server test against the local test database supplied in `.env.test`, pinned to the orchestrator's lane or configured manually. It calls the Server Action, route handler or store with real users and sessions. A server test is a `test/**/*.server.test.ts` file, run by `npm run test:server`, which needs Docker; it makes its users, data and sessions with the kit in `test/test-database/` (see `apps/web/AGENTS.md`).
- A case that needs only the UI gets a component or browser test in `test/` (`*.test.tsx`; browser tests are `*.browser.test.tsx`, run in Chromium and WebKit).

`use-cases.test.ts` enforces this rule against the auth cases listed in `auth-cases.ts`: outside `e2e/visual/`, an e2e test that names any other case fails it.

`use-cases.test.ts`, in this folder, checks that each case's slug is unique and names a test or group of tests titled exactly by that slug, in an e2e file, a `test/**/*.test.tsx` file or a `test/**/*.server.test.ts` file, that each slug the e2e files and the cases name is a case, that each slug title in a Vitest test is a case (only titles are checked there), that each e2e test outside `e2e/visual/` names an auth case of `auth-cases.ts` and each of those is a case, and that each link here leads to a file and heading that exist. A case written before its test is listed in `e2e/pending-cases.ts` with the lane that will write the test; once a real test names the case, that lane removes the entry.

## Who uses the site

- The site serves a small group of invited users. Admins send invitations from the signed-in site; the designated initial admin is `me@modestprogress.com`.
- **Signing up** requires an admin-emailed, single-use setup link bound to the recipient email. One confirmation creates the account and signs in; links expire after 30 minutes. The former shared code cannot create accounts.
- **Signing in** is by a link the site emails her. There are no passwords.
- **Private data:** each user's projects, chats and memory are hers alone. Another user's project or chat looks exactly like one that doesn't exist.
- **Quota:** each user may spend $5 of Claude a month. The month is the calendar month in UTC.

## Conventions

- Each use case has a slug of the form `use_case_<name>`. Refer to a case by its slug. Cases are not numbered.
- A case describes what the user wants, what she does and what she sees. It says nothing about how the system is built: "send the message", not "press the submit button".
- "The user" is any one of the invited users, and "she" means the user.
- **Prerequisites** lists the cases that must have happened first. Every listed case is required.
- **Steps** is the interaction, in order, from the user's point of view.
- **Outcome** is what is true when the case ends. It names things she can see or do on the site, so that a test can check each one.
- **Next** lists cases the user might go on to, each with a hint about why she would.
- The use cases cover version 1 as planned, including parts not built yet. A case describes the intended behavior, not the current state of the code.
- Update cases in the relevant area files and their tests in the PR that changes the behaviour. Connect related cases through Prerequisites or Next, updating the other area's case when a back-link is needed.
- An Outcome item that only real Claude can show is marked *(checked by the real-Claude smoke test)*; the e2e test checks what the mock can.

## Real-Claude smoke list (version 1)

The Outcome items the mock can't show, checked by hand with real Claude before version 1 ships:

- [`use_case_project_interview`](projects.md#use_case_project_interview): once the memory holds goal, skill level, purpose and milestones, the interview chat is an ordinary lesson with no interview; other chats in the project never interview, even before then.
- [`use_case_customize_buddy`](buddies.md#use_case_customize_buddy) and [`use_case_switch_buddy`](chats.md#use_case_switch_buddy): a chat with an edited buddy of her own records the `cacheRead` and `cacheWrite` tokens of its replies, so each release measures what caching saves (`personas-and-prompts-rulings` in `docs/Decisions-Personas.md`, "Caching cost is measured, not capped"). A project chat can start only with a built-in buddy (the project's new-chat form takes only a built-in id), so check this in a standalone chat ([`use_case_central_chat`](chats.md#use_case_central_chat)), which can start with her own buddy; its text is saved under the default buddy's id.

## Areas

Each area's cases are in their own file:

- [Access](access.md)
- [Accounts](accounts.md)
- [Projects](projects.md)
- [Chats](chats.md)
- [Project memory](memory.md)
- [Buddies](buddies.md)
- [When things go wrong](when-things-go-wrong.md)
- [Appearance](appearance.md)
- [Site upkeep](site-upkeep.md)
