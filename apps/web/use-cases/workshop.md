# Workshop

The conventions for these cases are in [the index](README.md#conventions).

## use_case_workshop_page

The user makes, customizes, tweaks or clones a construct, activity or spell from one page.

- **Prerequisites:** a signed-in account.
- **Steps:**
  - Open Workshop from Home. It shows Constructs first.
  - Each construct also offers “Adventure with [construct name]”, with the same visible label and accessible name, to open the New adventure modal with that construct fixed. Closing it creates nothing.
  - Choose Activities or Spells to show that kind instead.
  - Choose Craft construct, Craft activity or Craft spell to make one without copying another, Customize on a built-in one, or Tweak or Clone on an own one.
- **Outcome:** each editing action opens the definition's Workshop to edit and test, as on that kind's own page. Only the user's own definitions appear beside the built-ins. An unknown kind shows Constructs. Viewing the page changes nothing.
- **Next:** `use_case_workshop_draft`: test the definition before saving it.

## use_case_workshop_draft

The user tests an unsaved construct, activity or spell in a drawer opened from its editing form.

- **Prerequisites:** an editable own construct, activity or spell and enough batteries for a reply.
- **Steps:**
  - Edit one instruction section at a time, then choose Try your draft to open the test drawer.
  - Choose an example test case or write a message, and test it without saving.
  - Choose a companion activity for a construct, or a companion construct for an activity. An activity test can try its opening request.
  - For a spell, choose both companions and either let the construct select the spell or cast it before replying.
  - Send a follow-up, then change the draft or companion settings and test again.
- **Outcome:** the reply uses the latest draft, including recovered browser edits, without saving the original. Follow-ups keep the test conversation. Changed instructions or companion settings mark results out of date; the next test starts fresh. Forced casting tests instructions rather than selection. An out-of-batteries refusal keeps the test message. Tests spend the acting user's batteries, save no adventures and change no quest data. Another user's source or companion is not found; an out-of-batteries user cannot start a reply.
- **Variations:**
  - The editor uses the available width. Its section choices keep longer instructions separate, and Save remains within reach while scrolling the form. Save stays pinned with its hint and status line, while Reset prompt to default and Discard changes follow it at the form's end, so on a phone the pinned bar is one short row; on short viewports the toolbar and actions scroll with the editor. The test drawer covers the editor at a phone’s width and keeps the composer below its scrolling results. Back to editing or Escape closes it and restores focus to Try your draft. Reopening preserves the test conversation, settings and unsent message; closing does not cancel a pending test.
  - The shared editor keeps unsaved name, instructions and kind-specific fields in this browser for the signed-in user and definition. Returning restores them unless another save made that draft outdated. Save or Discard changes clears the recovered draft. A blank name is refused beside the field without losing edits. Browser drafts do not follow the user to other devices, and blocked or cleared browser storage can remove them.
  - Only spell casting is available in conversation tests. The visible test summary says only spell casting is available; expand Test limits for the unavailable actions. Temporary-test information remains visible. Construct artwork generation is a separate explicit action.
  - New test sits in the drawer's header beside Back to editing. Choosing New test or another example clears the test conversation. Leaving or reloading clears test results without saving an adventure. A full test asks the user to start a new one. Cancel stops waiting; model use already incurred can still spend batteries. The pending test explains this beside its controls. Cancellation announces that waiting stopped and batteries may still be spent; this feedback stays until another test starts or the test is cleared. It does not claim provider cancellation or a refund.
- **Next:** [`use_case_generate_construct_images`](constructs.md#use_case_generate_construct_images): generate artwork from a construct’s current draft without saving it.
