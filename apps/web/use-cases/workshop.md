# Workshop

The conventions for these cases are in [the index](README.md#conventions).

## use_case_workshop_page

The user makes, customizes, tweaks or clones a construct, activity or spell from one page.

- **Prerequisites:** a signed-in account.
- **Steps:**
  - Open Workshop from Home. It shows Constructs first.
  - Choose Activities or Spells to show that kind instead.
  - Choose New to write one from scratch, Customize on a built-in one, or Tweak or Clone on an own one.
- **Outcome:** each action opens the definition's Workshop to edit and test, as on that kind's own page. Only the user's own definitions appear beside the built-ins. An unknown kind shows Constructs. Viewing the page changes nothing.
- **Next:** `use_case_workshop_draft`: test the definition before saving it.

## use_case_workshop_draft

The user tests an unsaved construct, activity or spell in a drawer beside its editing form.

- **Prerequisites:** an editable own construct, activity or spell and enough gold for a reply.
- **Steps:**
  - Edit one instruction section at a time, then choose Try your draft to open the test drawer.
  - Choose an example test case or write a message, and test it without saving.
  - Choose a companion activity for a construct, or a companion construct for an activity. An activity test can try its opening request.
  - For a spell, choose both companions and either let the construct select the spell or cast it before replying.
  - Send a follow-up, then change the draft or companion settings and test again.
- **Outcome:** the reply uses the latest draft without saving the original. Follow-ups keep the test conversation. Changed instructions or companion settings mark results out of date; the next test starts fresh. Forced casting tests instructions rather than selection. An out-of-gold refusal links to the Marketplace to earn gold and keeps the test message. Tests spend the acting user's gold, save no adventures and change no quest data. Another user's source or companion is not found; an out-of-gold user cannot start a reply.
- **Variations:**
  - The editor uses the available width. Its section choices keep longer instructions separate, and Save remains within reach while scrolling the form. The test drawer fills a phone’s width and keeps the composer below its scrolling results. Back to editing or Escape closes it and restores focus to Try your draft. Reopening preserves the test conversation, settings and unsent message; closing does not cancel a pending test.
  - The shared editor keeps unsaved name, instructions and kind-specific fields in this browser for the signed-in user and definition. Returning restores them unless another save made that draft outdated. Save or Discard changes clears the recovered draft. A blank name is refused beside the field without losing edits. Browser drafts do not follow the user to other devices, and blocked or cleared browser storage can remove them.
  - Only spell casting is available in conversation tests. The test area explains before use that tests cannot search the Blender manual, change activities, create quests, edit the Journal, record milestones or generate images. Construct artwork generation is a separate explicit action.
  - Choosing New test or another example clears the test conversation. Leaving or reloading clears test results without saving an adventure. A full test asks the user to start a new one. Cancel stops waiting; model use already incurred can still spend gold. The pending test explains this beside its controls. Cancellation announces that waiting stopped and gold may still be spent; this feedback stays until another test starts or the test is cleared. It does not claim provider cancellation or a refund.
- **Next:** [`use_case_generate_construct_images`](constructs.md#use_case_generate_construct_images): save a construct and explicitly generate its artwork.
