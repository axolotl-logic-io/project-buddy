# Use cases

How invited users use Project Buddy, described from the user's side of the screen. Tests are derived from these cases.

Playwright e2e tests in `test/system/` cover only the auth workflows. The auth workflows are sign-up, sign-in, sign-out, the sign-in limits, and the signed-out access gate. Every other case is tested in Vitest:

- A case that needs a real server or database gets a server test against the local test database supplied in `.env.test`, pinned to the orchestrator's lane or configured manually. It calls the Server Action, route handler or store with real users and sessions. A server test is a `test/component-integration/**/*.server.test.ts` file, run by `npm run test:server`, which needs Docker; it makes its users, data and sessions with the kit in `test/support/test-database/` (see `apps/web/AGENTS.md`).
- A case that needs only the UI gets a browser-mode component integration or feature-entrypoint test in `test/` (`*.browser.test.tsx`, run in Chromium and WebKit). It need not cover a whole application flow.

`test/component-integration/use-cases/use-cases.test.ts` enforces this rule against the auth cases listed in `auth-cases.ts`: an e2e test that names any other case fails it.

The use case guard checks that:

- Each slug is unique and titles a test or group of tests in an e2e file, a `test/**/*.test.tsx` file or a `test/component-integration/**/*.server.test.ts` file.
- Each slug named in the cases or e2e files, and each slug title in Vitest, is a known case. Only titles are checked in Vitest files.
- Every e2e test belongs to an auth case in `auth-cases.ts`, and each auth case exists.
- Every area file appears in the Areas index, and every relative link in the cases leads to an existing file and heading.

A case written before its test is listed in `test/component-integration/use-cases/pending-cases.ts` with the lane that will write the test. Once a real test names the case, that lane removes the entry.

## Who uses the site

- The site serves a small group of invited users. Admins send invitations from the signed-in site; the designated initial admin is `me@modestprogress.com`.
- **Signing up** requires an admin-emailed, single-use setup link bound to the recipient email. One confirmation creates the account and signs in; setup links do not expire. They stop working when accepted or replaced. Sign-in links for existing accounts expire after 30 minutes. The former shared code cannot create accounts.
- **Signing in** is by a link the site emails her. There are no passwords.
- **Private data:** each user's quests, adventures, Journal and milestones are hers alone, except that a quest's owner can share it with members, who then work in it with her ([`use_case_team_project_access`](projects.md#use_case_team_project_access)). A quest or adventure that isn't hers or shared with her looks exactly like one that doesn't exist.
- **Gold:** each user has one balance of gold, which model calls spend, including image generation and check-ins. Every account starts with 100 gold, once; gold never resets.

## Conventions

- Each use case has a slug of the form `use_case_<name>`. Refer to a case by its slug. Cases are not numbered.
- A case describes what the user wants, what she does and what she sees. It says nothing about how the system is built: "send the message", not "press the submit button".
- "The user" is any one of the invited users, and "she" means the user.
- **Prerequisites** lists the cases that must have happened first. Every listed case is required.
- **Steps** is the interaction, in order, from the user's point of view.
- **Outcome** is what is true when the case ends. It names things she can see or do on the site, so that a test can check each one.
- **Next** lists cases the user might go on to, each with a hint about why she would.
- The use cases describe the current product contract. Mark preserved legacy behavior explicitly; keep planned features separate until their behavior is agreed and distinguish them from available features. The completeness assessment is recorded in `docs/use-case-assessment.md` at the repository root.
- Update cases in the relevant area files and their tests in the PR that changes the behaviour. Connect related cases through Prerequisites or Next, updating the other area's case when a back-link is needed.
- An Outcome item that only real Claude can show is marked *(checked by the real-Claude smoke test)*; the e2e test checks what the mock can.

## Real-Claude smoke list

The Outcome items the mock cannot establish need a manual check with real Claude. Listing them here does not mean the check has passed:

- [`use_case_project_interview`](projects.md#use_case_project_interview): in a preserved Quest interview adventure, once the Journal holds goal, what the user already knows, purpose and milestones, the construct stops interviewing and helps from the Journal. New quests default to Break Down a Project; any quest adventure can update the Journal.
- [`use_case_construct_changes_activity`](activities.md#use_case_construct_changes_activity): asked for a breakdown or a brainstorm, the construct calls `select_activity` and follows the new activity in the same reply; older requests for the retired interview enter Break Down a Project, with or without a quest.
- [`use_case_ask_blender_question`](chats.md#use_case_ask_blender_question): asked how to do something in Blender, the construct casts Blender manual lookup, then searches the Blender manual and cites what it read; it gives no Blender steps without a search.
- [`use_case_construct_casts_spell`](spellbook.md#use_case_construct_casts_spell): asked for help that needs several details first, the construct casts Ask one question at a time and then asks one question per message.
- [`use_case_construct_records_milestone`](projects.md#use_case_construct_records_milestone): told she finished something meaningful in a quest adventure, the construct calls `record_milestone` once, with a short past-tense line; it doesn't record small steps, questions or plans, and never mentions streaks or pauses.
- [`use_case_construct_updates_memory`](memory.md#use_case_construct_updates_memory): once she agrees on a next step, or finishes the one recorded, the Journal holds one current line starting "Next step:".
- [`use_case_customize_construct`](constructs.md#use_case_customize_construct) and [`use_case_switch_construct`](chats.md#use_case_switch_construct): an adventure with an edited construct of her own records the `cacheRead` and `cacheWrite` tokens of its replies, so each release measures what caching saves. Any adventure can start with her own construct; its text is saved under the default construct's id.

## Areas

Each area's cases are in their own file:

- [Access](access.md)
- [Accounts](accounts.md)
- [Quests](projects.md)
- [Quest status](quest-status.md)
- [Adventures](chats.md)
- [Generated images](images.md)
- [Journal](memory.md)
- [Constructs](constructs.md)
- [Activities](activities.md)
- [Workshop](workshop.md): edit and test unsaved constructs, activities and spells.
- [Marketplace](marketplace.md): publish listings, buy copies and manage sales.
- [Retirement](retirement.md): put aside own definitions, restore them, or delete them forever.
- [Spellbook](spellbook.md)
- [When things go wrong](when-things-go-wrong.md)
- [Appearance](appearance.md)
- [Installed app and notifications](notifications.md)
- [Site upkeep](site-upkeep.md)
