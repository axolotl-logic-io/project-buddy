# Workshop

The conventions for these cases are in [the index](README.md#conventions).

## use_case_workshop_page

The user edits constructs and inspects the two spells from one page.

- **Prerequisites:** a signed-in account.
- **Steps:**
  - Open Workshop from the site menu. It shows Constructs first.
  - Open a definition’s name to inspect its built-in instructions or edit a private copy. Collection cards have no quest-start actions.
  - Choose Spells to see only Plan and Brainstorm with read-only explanations.
  - In Constructs, choose Create construct, Make a copy on a built-in one, or Edit or Make a copy on an own one. Spells offers no creation or editing controls.
- **Outcome:** each editing action opens the existing definition editor. Old Constructs and Spellbook collection links redirect to the relevant Workshop tab. Retirement remains available to restore or permanently delete retired definitions. Only the user’s own constructs appear beside the built-in constructs. An unknown kind shows Constructs. Viewing the page changes nothing.
- **Next:** `use_case_workshop_editor`: edit the definition and save it.


## use_case_workshop_editor

The user edits an own construct in Workshop and saves it.

- **Prerequisites:** an editable own construct.
- **Steps:**
  - Edit the name, then one instruction section at a time.
  - Choose Save, or Cancel to put back the saved prompt.
- **Outcome:** Save stores the name and every section, including sections not shown. A save makes no model call and makes no model request. The Workshop offers no test conversation: the user tries a saved definition in a quest or Chat.
- **Variations:**
  - The editor uses the available width. Its section choices keep longer instructions separate, and Save remains within reach while scrolling the form. Save stays pinned with its hint and status line, while Reset prompt to default and Cancel follow it at the form's end, so on a phone the pinned bar is one short row; on short viewports the actions scroll with the editor.
  - Saving with an invalid field in another section shows that section and focuses the field. The name is checked first, and sections with errors are marked.
  - The shared editor keeps unsaved name, instructions and kind-specific fields in this browser for the signed-in user and definition. Returning restores them unless another save made that draft outdated. Save or Cancel clears the recovered draft. A blank name is refused beside the field without losing edits. Browser drafts do not follow the user to other devices, and blocked or cleared browser storage can remove them.

The Spells tab lists only Plan and Brainstorm with read-only explanations. Create, Edit and Make a copy remain available for constructs only.
