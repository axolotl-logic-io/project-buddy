# Library

The signed-in Library at `/library` contains Getting Started and books on Constructs, Spells, Activities and Model context. Each book has a stable route, chapter anchors, a contents navigation, related books and a link to its relevant site action. The Library reads no private quest data and makes no model calls.

## Content ownership

Product contributors own the reader-facing text in `apps/web/src/ui/copy/library.ts`. The renderer is in `apps/web/src/library/library.tsx`; route files are thin authenticated adapters. Keep existing book ids and chapter anchors stable when editing headings. Use the glossary and the docs style guide. The content uses Batteries for model use and labels separate Marketplace orbs as planned while the cutover is disabled. Before cutover, trades move the existing shared balance; after cutover, trades move only orbs. Merging code does not enable the rollout. An operator must complete the Marketplace cutover procedure and verify the effective gate before changing the Library to describe orbs as available. Production enablement is not authorized by this issue. Live Battery buying remains unavailable pending configuration and commercial policy; test purchase flows are not live buying.

Changes to prompts, model inputs, tools, access rules, snapshots, limits or relevant user flows must update the corresponding Library chapters in the same PR. The reviewer compares technical claims with the source map below and checks whether the call-site inventory changed. Explain conditional context rather than claiming all operations receive all data. Use fictional examples only.

## Source map

| Reader chapter | Implementation sources under `apps/web/src/` |
| --- | --- |
| Getting Started / first-adventure, continue | `chats/`, `projects/`, `notes/`, `memory/`, `app/(workspace)/chat/`, `app/(workspace)/projects/` |
| Constructs / character, craft, test | `constructs/`, `components/constructs/`, `prompts/`, `workshop/test-draft.ts` |
| Spells / selection, craft, test | `spells/spell-choices.ts`, `spells/cast-spell.ts`, `spells/cast-spell-contract.ts`, `workshop/test-draft.ts` |
| Activities / sessions, craft, test | `activities/activity-sessions.ts`, `activities/select-activity.ts`, `activities/prepared-openings.ts`, `replies/chat-opening.ts` |
| Model context / inventory | `replies/reply.ts`, `replies/tools/index.ts`, `replies/chat-opening.ts`, `replies/chat-naming.ts`, `check-ins/check-ins.ts`, `check-ins/check-in-kickoff.ts`, `workshop/test-draft.ts`, `images/image-provider.ts`, `images/generate-tool.ts`, `constructs/visual-generation.ts` |
| Model context / assembly | `replies/system-prompt.ts`, `replies/global-prompt.ts`, `replies/role-prompt.ts`, `replies/memory-prompt.ts`, `replies/milestones-prompt.ts`, `replies/standalone-chat-prompt.ts`, `replies/chat-kickoff.ts`, `replies/author-names.ts`, `accounts/user-name.ts` |
| Model context / tools | `replies/tools/index.ts`, tool contracts and executors, `accounts/owner-scope.ts`, `blender-manual/search-tool.ts`, `blender-manual/cite-tool.ts` |
| Model context / history | `chats/store.ts`, `images/store.ts`, `spells/cast-spell-contract.ts`, `activities/activity-sessions.ts`, `workshop/protocol.ts`, `components/workshop/workshop.tsx` |

## Review and checks

The repository Library guard detects new model-call source files missing from the inventory, missing book/action routes and broken source-map paths. It cannot establish prose accuracy: review changed arguments, prompt sections, tool schemas and context reads against the affected chapters. New operations must appear in the reader inventory and source map, even when they reuse the shared provider.

The Library browser test covers book navigation, chapter anchors, related mechanics links, action destinations and sign-in gating. Every book and the index are registered in `PHONE_PAGES` for the existing 320/390 px, touch-target and Light/Dark checks. Run focused Library and header tests for content/navigation edits; use the phone suite for layout changes and the default checks for repository coverage. Review links and examples alongside related product changes rather than requiring brittle assertions on exact prose.
