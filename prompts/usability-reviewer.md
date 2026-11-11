# Usability reviewer prompt

Review this app’s usability in Light and Dark mode. Set aside color, typography, and aesthetic preferences. Evaluate how easily users can understand the app, complete their work, and recover from problems.

Begin by identifying the app’s intended users and main tasks from the available product context. State any assumptions. Do not read `GLOSSARY.md` during this review; assess whether the experience is understandable without that reference.

Read the repository's `AGENTS.md` instructions, `docs/project-practices.md` and `apps/web/AGENTS.md`. Start with `apps/web/use-cases/README.md` and inspect every use case file under `apps/web/use-cases/`, including files omitted from the index. Read `docs/README.md` and its linked product documents. Cross-check `docs/use-case-assessment.md` without treating its previous conclusions as current evidence. Distinguish planned features from implemented behavior and preserved legacy behavior.

Build a coverage inventory using each use case's slug and documentation path. Walk through every documented user workflow, including its applicable actors, prerequisites, branches and recovery paths. Include documented workflows missing from the use cases as separate coverage items. For operational cases without a user interface, explain whether there is a usability surface to assess. Record conflicting or unclear requirements. Do not substitute a sample of representative tasks for complete documented coverage.

Across these workflows, include:

- A first visit and initial task.
- A frequent task.
- Finding and editing existing work.
- Correcting a mistake.
- Leaving and resuming work.
- Encountering an empty state, invalid input, or failed operation.

Walk through each workflow in both Light and Dark mode, at widths of 360 px (phone), 768 px (tablet) and 1920 px (desktop). Note where a workflow changes between widths, such as controls that move, collapse into a menu or switch into separate views. Report a finding that occurs only at one width or in one mode with that width and mode.

Evaluate:

- Purpose and orientation.
- Information architecture.
- Navigation and discoverability.
- Task completion and efficiency.
- Interaction clarity and predictability.
- Layout, grouping, spacing, and hierarchy.
- Feedback and system status.
- Error prevention and recovery.
- User control and continuity.
- Consistency of controls and behavior.
- Clarity of labels, instructions, and messages.
- Keyboard access, focus behavior, assistive technology support, and touch targets.
- Responsive behavior, zoom, and varying content lengths.
- Performance and resilience.
- Clarity of action consequences, visibility, and reversibility.

Base findings on observed behavior. Distinguish verified problems from hypotheses, and identify anything you could not assess. Do not claim to have tested interactions or accessibility behavior you did not test. Documentation explains intended tasks; it does not establish that users can discover or understand them. Approach each workflow through its visible entry points and assess what the interface itself explains.

Real model use and spending gold are authorized for this review, including replies, generated openings, automatic adventure names, Workshop tests and image generation. Experience the waiting, feedback, results, follow-up interactions and recovery for real operations where needed; do not skip them merely because they cost gold. Evaluate whether costs, insufficient gold, cancellation consequences and retry behavior are understandable. Record paid operations and gold changes where observable. Keep real-model checks separate from automated suites that require the mock model, and follow the repository's test safeguards.

Use isolated review accounts and disposable data in the supported non-production environment. Create and edit that data, and exercise destructive workflows on it where needed to assess their usability. Clean it up afterward and report anything left behind. Do not alter unrelated or shared user data, send invitations or notifications to uninvolved people, or make Marketplace transfers involving their accounts. Follow `docs/Site-Operations.md` for production boundaries; authorization to spend gold does not authorize production test writes. If required accounts, services or devices are unavailable, keep those checks visible as coverage gaps.

Record the environment, revision, roles, devices, widths, appearance modes and assistive technology actually assessed. Code inspection and automated tests can supplement the review but do not establish that an unobserved interaction is usable. Retain failed real-model observations when exploring variability; do not repeat requests until one succeeds and report only that result.

For each finding, provide:

- **Finding:** A concise description.
- **Task and location:** Where it occurs and what the user is trying to accomplish.
- **Use case and reference:** The relevant slug and documentation path, or the additional workflow discovered outside the use cases.
- **Evidence:** Reproduction steps and the observed behavior.
- **User impact:** The confusion, extra effort, failure, or loss it causes.
- **Severity:** Minor friction, substantial friction, task blocker, or serious consequence.
- **Recommendation:** A concrete improvement addressing the underlying problem.

Lead with the most consequential findings. Include a coverage table with every use case slug, documentation path, verdict, observed evidence and unassessed branches. Use No issue observed, Issue found, Partially assessed, Not assessed or No usability surface. Explain each partial assessment, missing assessment or case without a usability surface. Give totals by verdict and list additional workflows found outside the use cases. A successful task completion alone does not establish that all its interactions are usable.

Finish with the main usability strengths, documentation questions, coverage gaps, paid operations and cleanup status. Do not make changes to the app, tests or documentation.
