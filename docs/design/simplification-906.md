# Straightforward prompt editing in the Workshop (#906)

This page records what issue #906 removes: the Workshop's testing machinery. The Workshop keeps its editors for constructs, activities and spells, and nothing else.

## What the user keeps

- The Workshop page at `/workshop` and the editor pages for constructs, activities and spells.
- Built-in inspection and Customize, private prompt and name fields, Save and Discard, draft recovery, and the existing reset, clone, retire and delete actions.
- Construct visual editing and image generation, which stay separate from prompt saves. A prompt save makes no model call and charges no battery.

## Removed

- The **Try your draft** drawer and its trigger on every editor page.
- Example test cases, the companion construct and activity choices, forced spell casting and the opening-request test.
- The temporary test endpoint `POST /api/workshop`, its request and result protocol (`src/workshop/protocol.ts`), the draft test runner (`src/workshop/test-draft.ts`) and its options loader (`src/workshop/options.ts`).
- The draft-reporting context that fed the drawer (`prompt-draft-context.ts`). The construct editor, which tracks its Visual description, now takes the draft through the prompt editor's `onDraftChange` prop. Every editor page was inside the Workshop, so the editor always shows one section at a time, and its `data-focus` switch is gone.
- The `workshop-options` performance span.
- The drawer's copy and styles, `use_case_workshop_draft` (replaced by `use_case_workshop_editor`, which covers the editing that remains), the Library's test steps, and the drawer's browser, server and protocol tests.

## Not added

No flag, hidden screen or replacement test flow. The user tries a prompt by saving it and using it in a quest or Chat.

## Retained compatibility

The removal deletes code only; it changes no schema. A page loaded from the earlier build that still posts to `/api/workshop` during a release gets a not-found response, and its drawer shows the usual error. No compatibility state is kept; the `buddyId` request name went with the endpoint.
