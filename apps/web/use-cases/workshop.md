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
- **Outcome:** each editing action opens the definition's Workshop to edit, as on that kind's own page. Only the user's own definitions appear beside the built-ins. An unknown kind shows Constructs. Viewing the page changes nothing.
- **Next:** `use_case_workshop_editor`: edit the definition and save it.

## use_case_workshop_editor

The user edits an own construct, activity or spell in the Workshop and saves it.

- **Prerequisites:** an editable own construct, activity or spell.
- **Steps:**
  - Edit the name, then one instruction section at a time.
  - Choose Save, or Discard changes to put back the saved prompt.
- **Outcome:** Save stores the name and every section, including sections not shown. A save makes no model call and spends no batteries. The Workshop offers no test conversation: the user tries a saved definition in a quest or Chat.
- **Variations:**
  - The editor uses the available width. Its section choices keep longer instructions separate, and Save remains within reach while scrolling the form. Save stays pinned with its hint and status line, while Reset prompt to default and Discard changes follow it at the form's end, so on a phone the pinned bar is one short row; on short viewports the actions scroll with the editor.
  - Saving with an invalid field in another section shows that section and focuses the field. The name is checked first, and sections with errors are marked.
  - The shared editor keeps unsaved name, instructions and kind-specific fields in this browser for the signed-in user and definition. Returning restores them unless another save made that draft outdated. Save or Discard changes clears the recovered draft. A blank name is refused beside the field without losing edits. Browser drafts do not follow the user to other devices, and blocked or cleared browser storage can remove them.
- **Next:** [`use_case_generate_construct_images`](constructs.md#use_case_generate_construct_images): generate artwork from a construct’s current draft without saving it.
