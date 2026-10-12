# Use cases

How Autumn uses the Blender tutor, described from her side of the screen. Tests are derived from these cases.

`use-cases.test.ts`, in this folder, checks that each case's slug is unique and names an e2e test, that each slug the e2e files and the cases name is a case, and that each link here leads to a file and heading that exist.

## Conventions

- Each use case has a slug of the form `use_case_<name>`. Refer to a case by its slug. Cases are not numbered.
- A case describes what the user wants, what she does and what she sees. It says nothing about how the system is built: "send the message", not "press the submit button".
- **Prerequisites** lists the cases that must have happened first. Every listed case is required.
- **Steps** is the interaction, in order, from the user's point of view.
- **Outcome** is what is true when the case ends. It names things she can see or do on the site, so that a test can check each one.
- **Next** lists cases the user might go on to, each with a hint about why she would.
- The use cases cover version 1 as planned, including parts not built yet. A case describes the intended behavior, not the current state of the code.
- There is one user, Autumn. "The user" and "she" both mean her.
- Add or change cases only in your own area's file. A link from another area's case goes in the later lane's own file.
- An Outcome item that only real Claude can show is marked *(checked by the real-Claude smoke test)*; the e2e test checks what the mock can.

## Areas

Each area's cases are in their own file:

- [Access](access.md)
- [Projects](projects.md)
- [Chats](chats.md)
- [Project memory](memory.md)
- [When things go wrong](when-things-go-wrong.md)
- [Appearance](appearance.md)
- [Site upkeep](site-upkeep.md)
