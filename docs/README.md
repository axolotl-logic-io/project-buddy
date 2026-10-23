# Project Buddies site

These docs describe the Project Buddies Blender tutor site: its scope, design decisions and operating practices. GitHub issues track remaining work; the repo's `README.md` covers setup and commands.

## Product

- [Blender AI tutor](Blender-AI-Tutor.md): product scope, version 1 acceptance criteria and the production validation gap.
- [Chats](chats.md): the all-chats hub, owner-specific project filters and standalone conversations.
- [Decisions](Decisions.md): design choices and rejected alternatives, grouped by area. Issues and code comments refer to decisions by slug, such as `claude-spend-quota`.

## Practices

- [Coding practices](coding-practices.md): the shared design, type, lint, test and secrets rules, kept identical in each repository. These apply to every app and tool, not only the site.
- [Project practices](project-practices.md): this repo's own rules, which add to the coding practices.
- [Docs style guide](docs-style-guide.md): how to write these docs.

## Operations

- [2026-10-23 GitHub work index](handoffs/2026-10-23/README.md): native source branches, open work, policy proposals and next actions after workstation loss. These checkpoints are not merge or deployment approvals.

- [Site operations](Site-Operations.md): production boundaries, the signed-out smoke checks and troubleshooting notes that supplement the README.

## Issue pipeline

The issue pipeline in the [ecosystem repository](https://github.com/axolotl-logic-io/ecosystem) works this repo's issues. Its docs are in that repository's `docs/` folder.
