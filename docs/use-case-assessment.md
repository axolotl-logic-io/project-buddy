# Use case completeness assessment

Assessed on 2026-11-05 for [issue #747](https://github.com/axolotl-logic-io/project-buddy/issues/747), against integration commit `7024c5d9`. The change reconciles documentation and adds an inventory guard; it does not change runtime behavior.

## Scope and method

The inventory has 128 cases across 17 area files. The review compared their user-visible contracts with the product documents linked from [the docs index](README.md), the [glossary](../GLOSSARY.md), signed-in menu and Home destinations, page and action entry points under `apps/web/src/app/`, and the corresponding test declarations and assertions. No new case slug was needed: the gaps fit existing cases.

This is a repository assessment, not a production or real-model validation. A case title in a test establishes traceability, not that every sentence in its Outcome is asserted. The use case guard checks that traceability, valid links, unique slugs and the auth-only end-to-end boundary. It now also requires every area file to appear in the index. It cannot discover a feature that has neither a case nor a test.

## Area inventory

Paths in the evidence column are relative to `apps/web/test/`. They identify existing behavioral coverage inspected during the review, not a claim that those suites ran for this documentation change.

| Area | Cases | Product contract reviewed | Behavioral evidence and result |
| --- | ---: | --- | --- |
| Access | 6 | Signed-out gate, setup links, sessions | `system/` auth specs and session-expiry integrations. Corrected the visitor menu description to include Credits and the three appearance modes. |
| Accounts | 14 | Admin invitations, sign-in, private data, names, batteries, settings | Auth specs and account, auth, batteries and owner-isolation integrations. Corrected the index's setup-link expiry; distinguished setup and sign-in links. Added the existing Marketplace route out of gold and Workshop refusal. |
| Quests | 22 | Creation, motivation, construct choice, legacy interviews, milestones, sharing and invitations | Project, invitation, member and milestone integrations. Corrected the chosen construct in the default creation case and removed new-quest prerequisites from preserved interviews. |
| Quest status | 3 | Owner actions, saved construct proposals, restore and Undo | Quest-status server and browser integrations. Existing cases describe access, stale approvals, check-ins and status filters. |
| Adventures | 35 | Home atlas, Today, creation, activities, messages, tools, images, unread state, check-ins and character presence | Home, chat, reply and check-in integrations. Existing cases include the recent atlas, scrolling, image and presence work. Corrected the index smoke list's retired interview behavior. |
| Generated images | 3 | Adventure generation, gallery and construct artwork | Image-generation and construct visual-generation server/browser integrations. Rewrote the construct-artwork case from service internals into visible behavior and linked its Workshop recovery case. |
| Journal | 6 | Construct updates in any quest activity, viewing, history, edits, conflicts | Journal integrations. Removed the legacy interview requirement for asking what comes next. |
| Constructs | 8 | Discovery, customization, creation, edits, reset, artwork and character profiles | Construct integrations and `component-integration/components/prompt-editor.browser.test.tsx`. Corrected menu navigation and added shared field recovery, blank-name feedback and Visual description constraints. |
| Activities | 4 | Built-ins, starts, switching, customization and creation | Activity and activity-session integrations. Existing cases preserve separate opening requests and activity snapshots. |
| Spellbook | 3 | Selection, casting, customization, creation and private instructions | Spell and prompt-editor integrations. Replaced the obsolete reset-confirmation step with draft reset, Undo reset and Save. |
| Workshop | 2 | Kind tabs, editor, companion choices, draft testing and batteries | Workshop page, browser and server integrations, plus shared prompt-editor tests. Added missing editor recovery, test limits, cancel and clearing behavior; expressed cases with prerequisites, steps and outcomes. |
| Marketplace | 4 | Listing, browsing, buying, seller controls and retirement | Marketplace integrations and `component-integration/retirement/retirement.server.test.ts`. Added Retire → Delete forever, held retired copies, free restoration and source restoration before republishing. |
| Retirement | 4 | Retire, read-only view, restore and permanent deletion | Retirement browser/server integrations. Existing cases cover held purchases, retained snapshots and listing independence. |
| Appearance | 3 | Parchment modes, phone layout and account extras | Theme, phone, menu and flag integrations. Existing cases cover current modes and visibility rules. |
| Installed app and notifications | 2 | Installation, per-device opt-in, tests, renewal and sign-out | Web-app and push integrations. Existing cases distinguish installation from notification configuration and device ownership. |
| When things go wrong | 4 | Reply retry, storage failure, opening failure and concurrent messages | Reply, storage and opening integrations. Replaced the old Interview construct setting name with New quest construct. |
| Site upkeep | 3 | Credits, manual replacement and saved-data compatibility | Credits, manual-index and storage compatibility integrations. Existing cases describe the supported operations and preservation contract. |

## Reconciled gaps

The [use case index](../apps/web/use-cases/README.md) now includes Workshop and Marketplace. The new index guard prevents either area, or a future area file, from being omitted silently. Existing case slugs remain stable and there are no pending cases.

The use case index now describes the current product contract and labels preserved legacy behavior. Its real-Claude smoke list is a list of checks still requiring real-model evidence, rather than a statement that they passed. Setup invitations do not expire; existing-account sign-in links expire after 30 minutes. New quests default to Break Down a Project and use the saved New quest construct preference. Legacy interviews are preserved rather than prerequisites for today's Journal workflows.

## Remaining limits

The planned API access vocabulary in the glossary belongs to [issue #684](https://github.com/axolotl-logic-io/project-buddy/issues/684). This assessment adds no API or connection-management cases implying that work is available. When its behavior is agreed and implemented, add explicit cases and tests with it.

Real-model choices, mobile installation, actual push delivery, provider availability and production deployment behavior still need their relevant manual or environment-specific validation. The repository guard proves no such behavior. Future feature changes must update their cases and behavioral tests together; the index guard supplements that review rather than replacing it.
