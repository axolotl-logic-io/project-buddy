# Use cases

How invited users use the Blender tutor, described from the user's side of the screen. Tests are derived from these cases.

Playwright e2e tests in `e2e/` cover only visual regressions (`e2e/visual/`) and the auth workflows ([`e2e-visual-and-auth-only`](https://github.com/axolotl-logic/project-buddy/wiki/Decisions-Code-and-tooling#e2e-visual-and-auth-only)). The auth workflows are sign-up, sign-in, sign-out, the sign-in limits, and the signed-out access gate. Every other case is tested in Vitest:

- A case that needs a real server or database gets a server test against the test database in `.env.test`. It calls the Server Action, route handler or store with real users and sessions. #342 builds that harness (`src/**/*.server.test.ts`, `npm run test:server`), and work that needs one comes after #342.
- A case that needs only the UI gets a component or browser test in `src/` (`*.test.tsx`; browser tests are `*.browser.test.tsx`, run in Chromium and WebKit).

The e2e tests written before this rule move out in #341's parts. Until each part merges, its tests stay.

`use-cases.test.ts`, in this folder, checks that each case's slug is unique and names a test or group of tests titled exactly by that slug, in an e2e file or a `src/**/*.test.tsx` file, that each slug the e2e files and the cases name is a case, that each slug title in a src test is a case (only titles are checked there), and that each link here leads to a file and heading that exist. A case written before its test is listed in `e2e/pending-cases.ts` with the lane that will write the test; once a real test names the case, that lane removes the entry.

## Who uses the site

- The site serves a small group of invited users. There is no admin page.
- **Signing up** needs the invite code, which only invited people know, plus an email address. Without the invite code, no one can make an account.
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
- Add or change cases only in the area files your brief names. To connect a new case to another area's case, link from your own case (Prerequisites or Next). Don't edit the other file's Next list; the integration agent may add the back-link.
- An Outcome item that only real Claude can show is marked *(checked by the real-Claude smoke test)*; the e2e test checks what the mock can.

## Real-Claude smoke list (version 1)

The Outcome items the mock can't show, checked by hand with real Claude before version 1 ships:

- [`use_case_project_interview`](projects.md#use_case_project_interview): once the memory holds goal, skill level, purpose and milestones, the interview chat is an ordinary lesson with no interview; other chats in the project never interview, even before then.
- [`use_case_customize_buddy`](buddies.md#use_case_customize_buddy) and [`use_case_switch_buddy`](chats.md#use_case_switch_buddy): a chat with an edited buddy of her own records the `cacheRead` and `cacheWrite` tokens of its replies, so each release measures what caching saves (the wiki's [`personas-and-prompts-rulings`](https://github.com/axolotl-logic/project-buddy/wiki/Decisions-Personas#personas-and-prompts-rulings), "Caching cost is measured, not capped"). Not checkable yet: a chat can only start with a built-in buddy (the new-chat form takes only a built-in id, and `src/chats/new-chat-store.ts` saves a buddy of her own under the default's id), so chats must first be able to start with her own buddy.

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
