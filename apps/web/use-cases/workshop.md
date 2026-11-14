# Workshop

The conventions for these cases are in [the index](README.md#conventions).

## use_case_workshop_page

The user creates and edits constructs and spells from one page.

- **Prerequisites:** a signed-in account.
- **Steps:**
  - Open Workshop from the site menu. It shows Constructs first.
  - Open a definition’s name to inspect its built-in instructions or edit a private copy. Collection cards have no quest-start actions.
  - Choose Spells to see built-in Plan and Brainstorm alongside their own spells.
  - In Constructs, choose Create construct, Make a copy on a built-in one, or Edit or Make a copy on an own one. In Spells, create a spell, copy a built-in or own spell, or edit an own spell.
- **Outcome:** each editing action opens the existing definition editor. Graveyard remains available to restore or permanently delete retired definitions. Only the user's own definitions appear beside built-ins. An unknown kind shows Constructs. Viewing the page changes nothing.
- **Next:** `use_case_workshop_editor`: edit the definition and save it.

## use_case_workshop_editor

The user edits an own construct in Workshop and saves it.

- **Prerequisites:** an editable own construct.
- **Steps:**
  - Edit the name and functional fields: Visual description for constructs, or destination and reply lists for spells.
  - Choose Save, or Cancel to put back the saved fields.
- **Outcome:** Save stores the name and every section, including sections not shown. A save makes no model request. The Workshop offers no test conversation: the user tries a saved definition in a quest.
- **Variations:**
  - The editor uses the available width. Its section choices keep reply events separate, and Save remains within reach while scrolling the form. Save stays pinned with its hint and status line, while Cancel follows it at the form's end, so on a phone the pinned bar is one short row; on short viewports the actions scroll with the editor.
  - Saving with an invalid field in another section shows that section and focuses the field. The name is checked first, and sections with errors are marked.
  - The shared editor keeps unsaved name, instructions and kind-specific fields in this browser for the signed-in user and definition. Returning restores them unless another save made that draft outdated. Save or Cancel clears the recovered draft. A blank name is refused beside the field without losing edits. Browser drafts do not follow the user to other devices, and blocked or cleared browser storage can remove them.

Built-in spells show read-only explanations and Make a copy. Own spells use the shared editor for their name, instructions and Plan or Ideas destination.

## use_case_customize_spell

- **Goal:** Customize a spell’s name, instructions and message destination.
- **Prerequisites:** The user is signed in.
- **Steps:** In Workshop’s Spells tab, create a spell or copy a built-in or own spell. Edit its name and reply texts, choose Plan or Ideas as its message destination, and save. Select it in a quest’s sidebar or type cast followed by its name.
- **Outcome:** The own spell is private to its owner. Drafts survive navigation until saved or cancelled. Subsequent ordinary messages go to the chosen destination until stopped. Reply templates replace {{name}} with the user’s name. The local engine uses the destination and reply lists; no prose Instructions field is offered. A cast keeps a snapshot: editing or retiring the definition changes future casts, while the active spell keeps its name, destination and replies. The saved-message reply is chosen randomly from that snapshot’s alternatives after capture succeeds. Reply lists support adding, editing, removing and reordering; at least one reply must remain. The selected reply persists through a retry. Retired spells can be restored or deleted from Graveyard.

Construct and spell editor breadcrumbs read Workshop → Constructs → name and Workshop → Spells → name. The collection breadcrumb opens the corresponding Workshop tab.
