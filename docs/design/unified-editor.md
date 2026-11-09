# Workshop design

Open [the interactive mockups](unified-editor.html) and choose a candidate at the top. Switch between Buddies, Activities and Spells to see their fields. These are standalone design artifacts, based on integration commit `15b86555`; they do not change the application.

## Candidates

| Candidate | Layout | Best fit | Tradeoff |
| --- | --- | --- | --- |
| 01 · Side by side | Prompt left, test conversation right | Frequent edits and quick attempts | Long prompts have a narrower writing area |
| 02 · Writing first | Full-width editor with a collapsible test area below | Longer prompts and sustained writing | Comparing instructions with results takes scrolling |
| 03 · Test cases | Editor beside a test area with repeatable example messages | Checking several situations after a change | More choices before the first test |

The user selected candidate 03 and named the experience Workshop. Keep example test cases optional and allow a message written from scratch. On phones, Edit and Test switch between areas on the same page, preserving the draft.

## Shared editor behavior

The editor shares its name field, draft state, save action and test area across types. Each type keeps its own fields:

- A buddy has one prompt for its voice and habits. Its test chooses an activity.
- An activity has a prompt and a separate opening request. Its test chooses a buddy and can test the opening separately from a user message.
- A spell has When to use and Instructions. Its test chooses a buddy and activity, then either lets the buddy decide whether to cast or casts before replying. A forced cast checks instructions; it does not check whether the selection metadata works.

Built-in definitions are read-only. Customize makes an editable copy. Own definitions can be saved separately from testing. Reset prompt restores only the prompt, preserving the name, opening request and when-to-use metadata.

## Test behavior

A fresh test uses the latest draft without requiring a save. Follow-up messages keep that test's version. Editing a draft marks the result as out of date; the next test starts a fresh conversation. Changing the companion buddy, activity or spell test setting also starts fresh. Existing chats and past casts retain their saved snapshots or instructions.

A production implementation should show which draft version each test used and keep test conversations separate from ordinary chats. Real replies spend the acting user's batteries; show that before the first run. Tests should use temporary context and keep tool effects inside the test, so trying an instruction cannot alter real project memory, record milestones or generate images without an explicit action. The exact tool policy needs a design decision before implementation.

## Mockup limits

Replies and casts are scripted illustrations, independent of prompt text. They do not measure prompt quality or prove spell selection. Sample definitions are shortened for the layouts. Save changes updates only this open mockup's in-memory state. Reloading resets everything. The mockups make no model calls, spend no batteries, write no application data and use no external assets.

Marketplace actions, deletion, full reset confirmation, error states, streaming, cancellation and batteries failures are outside these candidate mockups. The green palette illustrates hierarchy; application implementation should use the site's existing theme contract.
