# Zotero

The conventions for these cases are in [the index](README.md#conventions). A Zotero Collection list shows the works in one collection of the quest owner's Zotero library as read-only Modern Language Association (MLA) Works Cited entries. Each Project Buddy account connects at most one Zotero account, and the collection picker shows the collections of that account's personal library. Zotero supplies the entries and decides which works belong to the list. The list changes only when the quest owner chooses **Sync**.

## use_case_connect_zotero

The user connects their Zotero account to choose a collection for a quest.

- **Prerequisites:** [`use_case_open_quest`](quests.md#use_case_open_quest), in a quest the user owns.
- **Steps:**
  - The user chooses New list in Overview's add box.
  - In the dialog, they choose Zotero Collection as the list's type.
  - They choose **Connect Zotero**.
  - They sign in to Zotero if needed and approve access to their personal library on Zotero's site.
- **Outcome:** Zotero sends the user back to the New list dialog on the quest's Overview, open on Zotero Collection. The dialog says Zotero is connected, names the Zotero account and lists its collections, with subcollections under their parents. When the user declines or the connection fails, the dialog says Zotero didn't connect, nothing changes, and the user can try again. Project Buddy connects through [Zotero's OAuth authorization flow](https://www.zotero.org/support/dev/web_api/v3/oauth), so the user never types a Zotero key. Connecting again replaces the earlier connection and ends its access. **Disconnect Zotero** ends Project Buddy's access to the library and keeps the user's Zotero Collection lists with their last sync. Only the quest owner sees Zotero Collection in the dialog; quest members see the other types.
- **Next:**
  - `use_case_create_zotero_collection_list`: import a collection as a list.

## use_case_create_zotero_collection_list

The quest owner imports a Zotero collection as a list.

- **Prerequisites:** `use_case_connect_zotero`.
- **Steps:**
  - The owner selects one collection in the New list dialog.
  - Optional: they turn on **Checkable** and name a checkmark tag. When the connection can't change the library, they choose to connect again and approve changes in Zotero first.
  - They choose **Create and sync**.
- **Outcome:** the list appears on Overview with the collection's name, after the quest's other lists. Its List page shows one read-only MLA Works Cited entry for each work directly in that collection; notes, attachments and works only in subcollections stay out. Entries follow Works Cited order, which skips opening quotation marks and articles, keep their italics and wrap across lines. A subcollection can be chosen for a list of its own, and an empty collection makes an empty list. The search box filters the references, and each reference opens its item in Zotero. The list can't take new list items, and it stays out of Quick Add, the add box's lists, moves and performances. In a shared quest, the dialog says that everyone in the quest can see the references and checkmarks and mark them. It also says that a checkmark tag applies to the item everywhere in Zotero. A checkable list starts with the checkmarks Zotero already holds as that tag. When the import fails, the dialog keeps the selection and shows the reason, and the owner can try again.
- **Next:**
  - `use_case_sync_zotero_collection_list`: refresh the list.
  - `use_case_check_zotero_reference`: change a checkmark.

## use_case_sync_zotero_collection_list

The quest owner refreshes the references and sends any waiting checkmark changes.

- **Prerequisites:** `use_case_create_zotero_collection_list`.
- **Steps:**
  - The owner opens the Zotero Collection list.
  - They review any waiting checkmark changes. Each affected reference says it is waiting to sync, and the count of changes shows beside **Sync**.
  - They choose **Sync**.
- **Outcome:** the List page shows the result and the time of the last successful sync. The list picks up works added to, edited in and removed from the collection. It takes the collection's new name after a rename, unless the owner has given the list a name of its own. A reference whose title changes keeps its checkmark, and distinct works with identical entries each appear. Only the quest owner can sync; a second sync while one runs says the list is syncing already.
- **Checkable lists:** choosing **Sync** approves the list's waiting changes. Each one adds or removes the checkmark tag on a work still in the collection and keeps the work's other tags and fields. When someone edits the work in Zotero first, the sync reads the newer version before it tries again, as [Zotero's version checks](https://www.zotero.org/support/dev/web_api/v3/write_requests) require. For references with no waiting change, the sync reads the checkmark from the tag in Zotero. A mark made during the sync waits for the next sync when it differs from the checkmark the sync leaves. When a work has left the collection, the result lists it as skipped and leaves it untouched in Zotero.
- **Failed sync:** the list keeps its last imported references and the time of its last successful sync, and shows the reason and what to do next, such as connecting Zotero again. When Zotero confirmed some checkmarks before the failure, the result counts them apart from the changes still waiting. The owner can choose **Sync** again to finish the rest.

## use_case_check_zotero_reference

The quest owner or a quest member marks a reference in a checkable Zotero Collection list.

- **Prerequisites:** `use_case_create_zotero_collection_list`, with **Checkable** on and a checkmark tag named.
- **Steps:**
  - The user checks or unchecks a reference.
- **Outcome:** everyone in the quest sees the same checkmark and whether it waits to sync. The last change to a reference's checkmark sets the value that waits. Marking a reference back to its checkmark from the last sync clears its waiting change. Zotero gets the change when the quest owner chooses **Sync**. These checkmarks earn no experience and don't affect the quest's next task. Other users can't see or mark the list.
- **Shared tags:** lists can share a checkmark tag. When two lists have opposing waiting changes for the same work and tag, each sync sends the change of the list being synced, and the change sent last sets the tag in Zotero. A list with no waiting change for that work picks up the tag on its next sync.

## use_case_change_zotero_checkmark_tag

The quest owner changes the checkmark tag or turns off **Checkable**.

- **Prerequisites:** `use_case_create_zotero_collection_list`, with **Checkable** on.
- **Steps:**
  - The owner opens the list's settings with the gear on its page.
  - When checkmark changes wait, they sync the list or discard the waiting changes.
  - They name a different tag or turn off **Checkable**, and save.
- **Outcome:** while changes wait, the settings ask the owner to sync or discard them before the tag can change. Discarding drops the waiting changes and shows each reference's checkmark from the last sync. Saving leaves every tag in Zotero as it is. After a new tag, the List page hides the checkmarks and takes no marks until the next **Sync** reads the new tag from Zotero. Turning off **Checkable** removes the checkmarks. A new checkmark tag needs a connection that can change the library. Only the quest owner can change the settings.

## use_case_recover_zotero_collection_list

The quest owner restores access to a Zotero collection, or keeps or removes the list.

- **Prerequisites:** `use_case_create_zotero_collection_list`, and then the collection is deleted, Zotero is disconnected or connected to a different account, or Zotero ends Project Buddy's access.
- **Steps:**
  - The owner opens the list and sees why its collection can't be reached.
  - When access can come back, they connect the same Zotero account again and choose **Sync**.
  - Optional: when the collection stays unavailable, they remove the list in its settings.
- **Outcome:** the List page says why the collection can't be reached once Project Buddy learns of the loss, from a disconnect or from a failed sync. Meanwhile everyone in the quest can still read and search the last imported references, and checkmarks stay visible with whether they wait to sync. Checkmarks can't change until a sync succeeds, and a successful sync after reconnecting brings the list back. The owner can keep the list as it is or remove it. Removing the list drops its waiting changes and leaves Zotero untouched. Importing the collection again makes a new list with its own checkmarks.
