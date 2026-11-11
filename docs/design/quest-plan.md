# Quest plan design

This proposal gives each quest a **plan**: an ordered list of steps that the construct changes with tool calls and the user changes directly, without a model call. It is the first piece of a larger change that moves the Journal from free Markdown to typed sections, each with its own tools. Open [the interactive mockups](quest-plan.html) and choose a candidate at the top. The mockups share one plan, so a change made in one candidate shows in the others.

These are standalone design artifacts, based on integration commit `1dcbe22b`. Issue #838 built the plan with all three candidates; [Quest plan](../quest-plan.md) describes what shipped. The [Decisions](#decisions) section records where the build differs from this proposal.

## Problem

The Journal is one Markdown document that the construct changes with `update_memory`, a find-and-replace edit. Remaining work lives in it as prose, and the next step is a line that starts `Next step:`, which `nextStepOf` in `src/memory/next-step.ts` finds with a regular expression. This has the following costs:

- The construct must copy text exactly to change it. An edit fails when the user changed that text meanwhile.
- The user can only change the plan by editing Markdown on the Journal page.
- The site can't show progress through the plan, reorder it, or check off a step, because it has no steps to work with.

The plan lives outside the Journal Markdown in its own storage and can change without a model call.

## Names

The glossary avoids "todo", "task" and "action item" for the [next step](../../GLOSSARY.md#next-step). It also defines the next step as "the first action toward a planned milestone". This design keeps that language:

| Term | Meaning |
| --- | --- |
| Plan | A quest's ordered list of steps. UI: "Plan". |
| Step | One piece of remaining work in a plan: one short line, open or done. |
| Next step | The plan's first open step. It is no longer a Journal line. |
| Plan change | A note in an adventure that the construct or a person changed the plan, with Undo. |

These entries go into the glossary before implementation starts. The user may prefer "todo"; that choice changes copy only.

## Operations

The construct and the user share one set of operations, in one module, `src/plan/plan-operation.ts`. Both the tool and the Server Actions call `applyPlanOperations(actor, quest, operations)`, so the two can't drift apart.

| Operation | Input | Effect |
| --- | --- | --- |
| `add` | text, optional `before` step | Adds an open step at the end, or before the given step. |
| `update` | step, text | Rewrites the step's text. |
| `complete` | step | Marks the step done. |
| `reopen` | step | Marks a done step open again. |
| `move` | step, `before` step or end | Moves the step. |
| `remove` | step | Deletes the step. |

A step has a stable id, so an operation names its step by id instead of by text. A batch of operations applies all or none. When a step is gone, for example because another member deleted it, the batch saves nothing and the result returns the plan as it is now, as `update_memory` returns the Journal.

Step text is one line of at most 200 characters, like a milestone's. A plan holds at most 30 open steps. The project-breakdown activity already asks the construct to avoid a huge task list; the limit enforces it.

## Construct tool

One tool, `change_plan`, takes a list of operations and returns the plan after them. One tool with a batch keeps the tool list short for the prompt cache, and lets the construct check off one step and add the next in a single change that the user undoes in one action.

The system prompt lists the plan beside the Journal, with short ids, in the uncached part:

```text
<quest_plan>
s1 [done] Gather reference photos of brass owls
s2 Block out the body and wings
s3 Sculpt the feather plates
</quest_plan>
```

The tool's description and the global prompt ask the construct to do the following:

- Keep the plan to what the user agreed. A proposal stays in the conversation until the user agrees to it.
- Complete a step when the user says they finished it. A finished step isn't a milestone by itself: record a milestone only under the existing milestone rules.
- Never invent deadlines or count how long a step has been open. The plan doesn't nag, like the progress timeline.

The adventure shows each call as a **Plan change** part, under the message, with each operation on its own line and an Undo button. Undo applies the inverse batch as a new change by the person who pressed it.

## User changes

The user changes the plan in the following places. None of them calls a model or spends batteries:

- The quest page's Plan section.
- The Journal page, where the plan shows as its own section above the free Markdown.
- Inside an adventure, through the candidate the user chooses below.

A change the user makes during an adventure is saved to the adventure as a Plan change, so the construct reads it in the conversation on its next reply. The construct also always gets the current plan in its prompt.

In a [team quest](../team-projects.md), every member can change the plan, as they can the Journal. Each change records its author.

## Candidates

| Candidate | Where the user changes the plan in an adventure | Best fit | Tradeoff |
| --- | --- | --- | --- |
| 01 · Plan section | Only on the quest page; adventures show Plan change parts with Undo | Smallest first release | Leaving the adventure to tick a step breaks the flow |
| 02 · Side panel | A Plan panel beside the conversation, a drawer on phones | Long working sessions, Break Down a Project | A second column on a page that is narrow on phones |
| 03 · Commands and cards | `/` commands in the composer and interactive plan cards in the thread | Keyboard users, fast capture mid-conversation | Commands must be learned; cards scroll away |

Candidates 02 and 03 build on 01: each needs the quest page's Plan section and the Plan change part. They can also ship together, since the panel and the commands use the same operations.

## Storage

Two tables, added by one additive migration, which the live build can run beside:

- `quest_steps`: id, quest, position, text, status, created and completed times. Position is a fractional index (text), so a move writes one row.
- `quest_plan_changes`: one row per batch, with its quest, author (construct or person), adventure if any, and the operations with their inverses as JSON. This gives Undo and a plan history without versioning the whole list.

`src/plan/plan-store.ts` is the only module that reads or writes the tables. A step is open to everyone in its quest through the same owner scope as milestones, and is deleted with its quest.

The Journal's versions keep covering the Markdown only. The Journal page's Versions section lists plan changes beside Journal versions, by time. A plan change is undone from its own entry, not by restoring a Journal version.

## Phases

Each phase ships on its own and leaves the site working. Each moves one piece of the Journal into a typed section with its own tool and narrows `update_memory`'s description.

1. **Plan storage and tool.** Add the tables, the operations module, `change_plan`, the prompt section, the Plan change part and the quest page's Plan section. Test the operations at the unit level and the tool through the mock model.
2. **Next step from the plan.** `nextStepOf` returns the plan's first open step, and falls back to the `Next step:` line for a quest without a plan. Today, check-in openings and the quest page use it unchanged. Remove the `Next step:` instruction from `update_memory`'s description.
3. **Move existing next steps.** A one-time script turns each quest's `Next step:` line into its plan's first step, and removes the line as a Journal version by the construct. Run it after phase 2 is live, so a rollback still reads the line.
4. **In-adventure editing.** Ship the chosen candidate: the side panel, the commands, or both.
5. **Goals.** A typed Goal section with a `set_goal` tool, shown at the top of the Journal page and the quest page.
6. **Preferences.** A list like the plan, with a `change_preferences` tool and the same operations.
Quick Notes were removed in #917. Historical Note paragraphs remain ordinary Journal text; no separate note store is planned.

After phase 7, `update_memory` edits only the Journal's free notes. Whether to keep that free section is a decision for then, with evidence from how constructs use it.

## Decisions

- **Name:** Plan and step, as above. The glossary keeps "todo" and "task" out.
- **Candidate:** all three ship together. The commands also list the mock model's `/mock-…` commands while it runs, and the plan can be kept with commands alone, without a reply.
- **Grouping:** a flat list. Groups under planned milestones can come later without changing the operations.
- **Done steps:** no "Add to progress" yet. A recorded milestone belongs to an adventure, and the Plan section isn't in one.
- **Storage:** one `plan_versions` table holds the whole plan after each change, rather than one row per step and a separate change log. A plan is small, and one versioned row per change gives Undo, history and safe concurrent changes in one `insert … select`, as the Journal's versions do. Steps have numbers instead of fractional positions.
- **Merging:** a person's back-to-back changes each show as their own Plan change, one line each, rather than merging, so each keeps its own Undo.
- **Drag and drop:** left out. The up and down buttons and `/move` reorder steps with a keyboard, a mouse or touch alike.
- **Phases:** phases 1, 2 and 4 shipped in #838. Phase 3, moving existing "Next step:" lines, needs phase 2 live first; phases 5 to 7 are separate issues.

## Mockup limits

Construct replies are scripted and play in order, whatever the user writes. The plan lives only in the open page's memory; reloading resets it. The mockups make no model calls, spend no batteries, write no application data and use no external assets. Drag-and-drop works with a mouse; the up and down buttons show the keyboard and touch path. Error states, conflicts between members and the Versions section are outside the mockups.
