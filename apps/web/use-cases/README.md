# Use cases

How users use Project Buddy, described from the user's side of the screen. Tests are derived from these cases.

Playwright e2e tests in `test/system/` cover only the auth workflows: sign-up, sign-in, sign-out, the sign-in limits, and the signed-out access gate. Every other case is tested in Vitest, as `docs/project-practices.md` describes: a server test for a case that needs a real server or database, and a browser-mode component integration or feature-entrypoint test (`*.browser.test.tsx`) for a case that needs only the UI.

`test/component-integration/use-cases/use-cases.test.ts` guards this rule and the use cases themselves: slugs are unique and known, each titles a test, only the auth cases listed in `auth-cases.ts` have e2e tests, every area file is in the Areas index, and every relative link in the cases leads to an existing file and heading.

A case written before its test is listed in `test/component-integration/use-cases/pending-cases.ts` with the lane that will write the test. Once a real test names the case, that lane removes the entry.

## Who uses the site

- The site is open to anyone with an email address they can verify.
- **Signing up** is open to anyone. An emailed verification link lasts 30 minutes; confirmation creates the account and signs the browser in. Existing accounts receive normal sign-in links. Both flows share request limits.
- **Signing in** is by a link the site emails them. There are no passwords.
- **Invitations:** anyone in a quest can invite an address; one with no account gets an invited account at once, which completes sign-up the first time its user continues from an emailed link with a name ([Quest members](quest-members.md)).
- **Private data:** each user's quests, with their lists and performances, are open to them and the members they invite alone ([`use_case_private_data`](accounts.md#use_case_private_data), [`use_case_quest_member_access`](quest-members.md#use_case_quest_member_access)). A quest not open to them looks exactly like one that doesn't exist.
- **Local replies:** each reply is chosen from the rite's reply list in its reply order, without requests to model companies.

## Conventions

- Each use case has a slug of the form `use_case_<name>`. Refer to a case by its slug. Cases are not numbered.
- A case describes what the user wants, what the user does and what the user sees. It says nothing about how the system is built: "send the message", not "press the submit button".
- "The user" is any person using the site, and "their" refers to the user.
- **Prerequisites** lists the cases that must have happened first. Every listed case is required.
- **Steps** is the interaction, in order, from the user's point of view.
- **Outcome** is what is true when the case ends. It names things the user can see or do on the site, so that a test can check each one.
- **Next** lists cases the user might go on to, each with a hint about why the user would.
- The use cases describe the current product contract: Describe only currently available user workflows. Keep feature history, migration details and internal tool contracts outside this directory.
- Update cases in the relevant area files and their tests in the PR that changes the behaviour. Connect related cases through Prerequisites or Next, updating the other area's case when a back-link is needed.

## Local reply tests

Every environment picks replies locally from the rite's reply list. Tests fix the pick so replies are deterministic. Browser tests cover visible behavior. Server tests check data access and persistence, and use event barriers for in-flight behavior. Fault tests inject only the stream or storage failure they need. Internal contracts can have regression tests without a corresponding user workflow.

## Areas

Each area's cases are in their own file:

- [Access](access.md)
- [Home](home.md): experience and every recurring task's streaks, checked off in place.
- [Accounts](accounts.md)
- [Quests](quests.md)
- [Quest status](quest-status.md)
- [Quest members](quest-members.md): invite people, join by link or from Pending, and remove members.
- [Lists](lists.md): lists, their types and list items, and Quick Add.
- [Tasks](tasks.md)
- [Performances](performances.md): perform a rite on a list and send messages.
- [Experience](experience.md): events, experience and circles.
- [Profile](profile.md): distinct days signed in.
- [Timer](timer.md): a repeating work and break timer, shared by its link.
- [API](api.md): work with quests through the `/api/v1` routes.
- [Constructs](constructs.md)
- [Grimoire](grimoire.md): find, create and edit own rites.
- [Retirement](retirement.md): put aside own rites, restore them, or delete them forever.
- [When things go wrong](when-things-go-wrong.md)
- [Appearance](appearance.md)
- [Installed app](notifications.md)
- [Site upkeep](site-upkeep.md)
