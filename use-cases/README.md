# Use cases

How invited users use the Blender tutor, described from the user's side of the screen. Tests are derived from these cases.

`use-cases.test.ts`, in this folder, checks that each case's slug is unique and names an e2e test titled exactly by that slug, that each slug the e2e files and the cases name is a case, and that each link here leads to a file and heading that exist. A case written before its test is listed in `e2e/pending-cases.ts` with the lane that will write the test; once a real test names the case, that lane removes the entry.

## Who uses the site

- The site serves a small group of invited users, Autumn among them. There is no admin page.
- **Signing up** needs the site's passphrase, which only invited people know, plus an email address. Without the passphrase, no one can make an account.
- **Signing in** is by a link the site emails her. There are no passwords.
- **Private data:** each user's projects, chats and memory are hers alone. Another user's project or chat looks exactly like one that doesn't exist.
- **Quota:** each user may spend $5 of Claude a month, Autumn included. The month is the calendar month in UTC.

## Conventions

- Each use case has a slug of the form `use_case_<name>`. Refer to a case by its slug. Cases are not numbered.
- A case describes what the user wants, what she does and what she sees. It says nothing about how the system is built: "send the message", not "press the submit button".
- "The user" is any one of the invited users, and "she" means the user. Autumn is named only where she looks after the site, such as updating the manual or reading the site's log.
- **Prerequisites** lists the cases that must have happened first. Every listed case is required.
- **Steps** is the interaction, in order, from the user's point of view.
- **Outcome** is what is true when the case ends. It names things she can see or do on the site, so that a test can check each one.
- **Next** lists cases the user might go on to, each with a hint about why she would.
- The use cases cover version 1 as planned, including parts not built yet. A case describes the intended behavior, not the current state of the code.
- Add or change cases only in the area files your brief names. To connect a new case to another area's case, link from your own case (Prerequisites or Next). Don't edit the other file's Next list; the integration agent may add the back-link.
- An Outcome item that only real Claude can show is marked *(checked by the real-Claude smoke test)*; the e2e test checks what the mock can.

## Areas

Each area's cases are in their own file:

- [Access](access.md)
- [Accounts](accounts.md)
- [Projects](projects.md)
- [Chats](chats.md)
- [Project memory](memory.md)
- [When things go wrong](when-things-go-wrong.md)
- [Appearance](appearance.md)
- [Site upkeep](site-upkeep.md)
