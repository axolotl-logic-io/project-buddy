# Domain alignment reviewer prompt

Review whether this app’s UI accurately represents its conceptual domain. Read the repository's `AGENTS.md` instructions, `docs/project-practices.md`, `docs/docs-style-guide.md`, `apps/web/AGENTS.md`, `GLOSSARY.md` and the relevant product documents linked from `docs/README.md` before evaluating the interface. Distinguish current behavior from plans, retained compatibility names and historical documentation.

Use the glossary as a reference, while allowing that it may contain gaps or outdated definitions. The goal is to identify meaningful conceptual drift and its consequences for users.

Inspect representative screens and workflows in both Light and Dark mode, at widths of 360 px (phone), 768 px (tablet) and 1920 px (desktop). Narrow widths can shorten labels, truncate terms or hide explanations, so compare the wording at each width. Evaluate:

- **Terminology:** Whether glossary terms are used consistently and accurately across navigation, labels, buttons, help text, validation, and status messages.
- **Concepts and relationships:** Whether grouping, navigation, and workflows reflect the relationships between domain entities.
- **Actions and states:** Whether UI actions and state transitions correspond to their domain meanings.
- **Conceptual boundaries:** Whether distinct concepts are conflated, or a single concept appears to be several unrelated things.
- **User-facing language:** Whether simplified terms preserve meaning and have a clear relationship to canonical domain terms.
- **Learnability:** Whether unfamiliar concepts are explained where users need them.
- **Coverage:** Whether the UI introduces concepts absent from the glossary, or omits distinctions necessary to understand a task.

Do not flag every wording difference as a defect. Prioritize discrepancies that could produce an incorrect mental model, mistaken action, or misunderstanding of a result. Distinguish terminology inconsistencies from deeper problems in the product’s conceptual model.

Use isolated review accounts and disposable data in a local environment with an isolated local database and the mock model. Follow `docs/Site-Operations.md`; Production, Preview and Development share one database and are not review sandboxes. Clean up review data afterward.

Record the revision, environment, roles, modes and widths actually assessed, and distinguish observed UI evidence from code inspection. Do not claim to have viewed a screen or tested a workflow you did not assess.

For each finding, provide:

- **Finding:** A concise description of the discrepancy.
- **UI evidence:** The wording, location, and relevant workflow.
- **Domain reference:** The glossary entry or documentation passage, with a file reference.
- **User impact:** The misunderstanding or mistaken action the discrepancy could cause.
- **Severity:** Minor friction, substantial friction, task blocker, or serious consequence.
- **Recommended resolution:** Change the UI, update the glossary, explain the mapping, or resolve an open domain question.
- **Confidence:** Whether the evidence establishes drift or requires clarification.

Lead with the most consequential findings. Include a coverage table of the screens and workflows selected, their modes and widths, and any unassessed states. Finish with unresolved domain questions, gaps in review coverage and cleanup status. Do not make changes to the app or documentation.
