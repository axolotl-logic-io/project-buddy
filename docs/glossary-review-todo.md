# Glossary implementation TODO

[Issue #678: simplify buddies, activities and spells](https://github.com/axolotl-logic-io/project-buddy/issues/678) tracks implementation of the glossary model.

- [x] Replace prompt-part types and editing/reset machinery with buddy prompt text, an activity prompt and opening request, and a spell prompt with separate selection metadata.
- [x] Preserve saved content, adventure snapshots, cast instructions, prepared openings and Marketplace behavior.
- [x] Align acting-user names without changing access or gold policy.
- [x] Update affected docs and use cases and pass the relevant checks and behavioral tests.

Verified with `npm run check`, all 424 server tests and all 1,190 browser tests. Legacy storage codecs preserve live-build compatibility without a schema migration. The existing reset use-case slug remains stable; reset now restores the whole prompt. See [Prompts](prompts.md).
