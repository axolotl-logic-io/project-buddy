# Functional correctness reviewer prompt

Review whether this app behaves as documented. Verify the results of users' actions, saved data, permissions and connected effects. Do not change the app, tests or documentation.

## Coverage inventory

Read the repository's `AGENTS.md` instructions, `docs/project-practices.md`, `apps/web/AGENTS.md` and `GLOSSARY.md`. Start with `apps/web/use-cases/README.md` and inspect every use case file under `apps/web/use-cases/`, including files omitted from the index. Read `docs/README.md` and its linked product documents. Cross-check `docs/use-case-assessment.md`; its previous conclusions are not evidence that behavior works today.

Build an inventory using each use case's slug and documentation path. Extract prerequisites, actors, steps, expected outcomes, prohibited actions and cases where nothing should change. Include documented behaviors missing from the use cases as separate coverage items. Identify conflicting or undefined requirements rather than inventing an expected result. Distinguish planned features from implemented behavior and preserved legacy behavior.

Assess every item. Do not substitute representative workflows for complete documented coverage. For a case with several outcomes or branches, track which were verified and which remain unassessed.

## Verification

Exercise the documented paths through the app in both Light and Dark mode, at widths of 360 px (phone), 768 px (tablet) and 1920 px (desktop). Where a path's interface changes between widths, verify its outcomes at each width. Verify:

- Successful actions produce the expected result and persist after reloading or reopening.
- Invalid input and disallowed actions are rejected without unintended changes.
- Relevant actors and variants behave correctly, including owners, members, unrelated users, built-in definitions, own definitions, bought copies, and quest and standalone adventures.
- Connected effects agree: Journal versions, adventure snapshots, recorded milestones, images, listings, notifications and gold balances change only as documented.
- Empty states, failures, interrupted requests, repeated submission, stale drafts, concurrent edits and lost access preserve the documented guarantees.
- Retry, cancellation, restoration, retirement and permanent deletion have their documented effects, including what remains unchanged.
- Real construct replies, spell selection and casting, tool effects, Journal updates and generated images fulfill the applicable use cases. Check saved effects as well as the visible reply.
- Documented compatibility behavior remains intact where it can be assessed in the available environment.

Use code inspection and existing automated tests to supplement direct checks, especially for failures or concurrency that cannot be safely reproduced through the UI. Follow the repository's test commands and boundaries. A test title establishes traceability, not verification of every outcome; a mock model does not establish real-model behavior. Record the environment, revision, accounts or roles used, widths and appearance modes, and checks actually run without exposing credentials or private data.

## Test data and paid use

Real model use and spending gold are authorized for this review, including replies, generated openings, automatic adventure names, Workshop tests and image generation. Use real services where needed to assess the use cases; do not skip those checks merely because they cost gold. Record paid operations and gold changes where observable. Do not weaken automated test safeguards or replace their required mock model with a paid model; perform real-model checks separately.

Use isolated review accounts and disposable data in the supported non-production environment. Mutations and destructive workflows are allowed on that data; clean it up when finished and report anything left behind. Do not alter unrelated or shared user data, send invitations or notifications to uninvolved people, or make Marketplace transfers involving their accounts. Follow `docs/Site-Operations.md` for production boundaries; authorization to spend gold does not authorize production test writes. If an account, service or environment is unavailable, report the affected checks as unassessed rather than claiming a pass.

For variable model behavior, record the request and observed outcome. Distinguish one observed failure from a reproducible defect, and retain failed observations when further checks explore variability. Do not repeat requests until one succeeds and report only that result.

## Report

Lead with the most consequential findings. For each finding, provide:

- **Finding:** A concise description.
- **Use case and reference:** The slug, documentation path and specific expected behavior.
- **Prerequisites and steps:** Actor, starting state and reproduction steps.
- **Evidence:** Expected and actual results, including persisted and connected effects. Distinguish direct observation, code inspection and automated test evidence.
- **User impact:** The incorrect result, lost data, improper access or gold consequence.
- **Severity:** Minor friction, substantial friction, task blocker, or serious consequence.
- **Recommendation:** A concrete correction addressing the cause.
- **Confidence:** What the evidence establishes and what remains uncertain.

Include a coverage table with every use case slug, documentation path, verdict, evidence method and unassessed branches. Use Pass, Fail, Partially assessed or Not assessed. A pass requires evidence for all applicable documented outcomes; explain every partial or missing assessment. Give totals by verdict and list extra behaviors found outside the use cases.

Finish with documentation conflicts, real-model limitations, environment gaps, paid operations and cleanup status. Do not present incomplete coverage as a clean bill of health.
