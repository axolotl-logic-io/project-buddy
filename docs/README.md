# Project Buddies site

This wiki documents the Project Buddies Blender tutor site, its design decisions and its operating practices. GitHub issues track remaining work; the repo's `README.md` covers setup and commands, and the coding, test and production rules are in the practices pages below.

## Product and practices

- [Blender AI tutor](Blender-AI-Tutor.md): product scope, version 1 acceptance criteria and validation gaps.
- [Decisions](Decisions.md): design choices and rejected alternatives, grouped by area. Issues and code comments refer to decisions by slug, such as `claude-spend-quota`.
- [Coding practices](coding-practices.md): the shared design, type, lint, test and secrets rules, kept identical in each repository. These apply to every app and tool, not only the site.
- [Project practices](project-practices.md): this repo's own rules, which add to the coding practices.
- [Site operations](Site-Operations.md): operational notes and troubleshooting observations that supplement the README.

## Issue pipeline

- [Issue pipeline in ecosystem](https://github.com/axolotl-logic-io/ecosystem).

## Historical reference

- [How the build runs](How-the-Build-Runs.md): the retired staged-build process, before the issue pipeline.
- [Retrospectives](Retrospectives.md): lessons from completed build stages, not current operating instructions.

## Edit the wiki

Follow the [docs style guide](docs-style-guide.md). The pages live in the repo's `docs/` folder as ordinary tracked Markdown.
