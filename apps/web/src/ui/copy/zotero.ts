function plural(count: number, one: string, many: string): string {
  if (count === 1) {
    return `1 ${one}`;
  }
  return `${count} ${many}`;
}

// Zotero setup in the New list dialog, the Zotero Collection list page,
// and its section on the quest's overview.
const ZOTERO_COPY = {
  setup: {
    title: "Add a Zotero Collection",
    intro:
      "A Zotero Collection list shows the works in one of your Zotero collections as Works Cited entries in MLA style. You can’t edit the entries here: change the items in Zotero, then sync.",
    connect: "Connect Zotero",
    connectHint:
      "Zotero asks you to approve access to your personal library, then sends you back to this dialog.",
    connected: (username: string): string =>
      `Connected to Zotero as ${username}.`,
    disconnect: "Disconnect Zotero",
    disconnectConfirm: {
      title: "Disconnect Zotero?",
      description:
        "Project Buddy stops reaching your Zotero library. Your Zotero Collection lists stay, and show their last sync until you connect again.",
      confirm: "Disconnect",
      cancel: "Cancel",
    },
    // After Zotero sends the user back.
    connectedNow: "Zotero is connected.",
    connectFailed:
      "Zotero didn’t connect. If you declined, nothing changed. You can try again.",
    collection: "Collection",
    collectionHint:
      "The list shows the works directly in this collection. Works only in its subcollections stay out.",
    noCollections: "Your Zotero library has no collections yet.",
    collectionsUnavailable:
      "Zotero didn’t list your collections just now. Try again in a few minutes.",
    chooseCollection: "Choose a collection.",
    checkable: "Checkable",
    checkableHint:
      "Each reference gets a checkmark. Sync saves checkmarks to Zotero as a tag.",
    tag: "Checkmark tag",
    tagHint:
      "Zotero tags apply to an item everywhere it appears. The same item in another collection or list shows the same checkmark.",
    tagProblem: "Name the tag in 1 to 100 characters on one line.",
    needsWrite:
      "Checkable lists need permission to change your Zotero library.",
    connectWithWrite: "Connect again and approve changes",
    shared:
      "Everyone in this quest can see this list’s references and checkmarks, and mark them. Only you can sync the list or change its settings.",
    create: "Create and sync",
    creating: "Importing from Zotero…",
    back: (quest: string): string => `Back to ${quest}`,
  },
  // Why a sync or an import stopped, and what to do next.
  problems: {
    "access-ended":
      "Zotero no longer gives Project Buddy access to this library. Connect Zotero again, then sync.",
    "collection-missing":
      "This collection is no longer in your Zotero library. You can keep the list as it is, or remove it.",
    "other-account":
      "Zotero is connected to a different account than this list’s. Connect the account the collection is in, then sync.",
    "no-write-access":
      "Sending checkmarks needs permission to change your Zotero library. Connect Zotero again and approve changes, then sync.",
    "zotero-unavailable":
      "Zotero didn’t answer just now. Your references and waiting changes are kept. Try syncing again in a few minutes.",
    "already-syncing":
      "This list is syncing already. Wait for that sync to finish.",
    "not-configured": "This site isn’t set up to connect to Zotero yet.",
  },
  // Why a list's collection can't be reached until a sync succeeds.
  unavailable: {
    "access-ended":
      "Project Buddy can’t reach this collection because Zotero access ended.",
    "collection-missing":
      "Project Buddy can’t reach this collection because it is no longer in the Zotero library.",
    "other-account":
      "Project Buddy can’t reach this collection because Zotero is connected to a different account.",
  },
  list: {
    sync: "Sync",
    syncing: "Syncing…",
    // Beside Sync: how many checkmark changes wait for it.
    pending: (count: number): string =>
      `${plural(count, "change", "changes")} waiting`,
    lastSynced: "Last synced",
    never: "No sync yet",
    // The last sync's result, under the time of the last successful one.
    synced: ({
      sent,
      waiting,
    }: {
      readonly sent: number;
      readonly waiting: number;
    }): string => {
      const parts: string[] = ["Synced."];
      if (sent > 0) {
        parts.push(
          `Sent ${plural(sent, "checkmark", "checkmarks")} to Zotero.`,
        );
      }
      if (waiting === 1) {
        parts.push("1 change made during the sync waits for the next one.");
      } else if (waiting > 1) {
        parts.push(
          `${waiting} changes made during the sync wait for the next one.`,
        );
      }
      return parts.join(" ");
    },
    failed: ({
      sent,
      waiting,
    }: {
      readonly sent: number;
      readonly waiting: number;
    }): string => {
      const parts: string[] = ["The last sync failed."];
      if (sent > 0) {
        parts.push(
          `Zotero confirmed ${plural(sent, "checkmark", "checkmarks")} before it stopped.`,
        );
      }
      if (waiting > 0) {
        parts.push(`${plural(waiting, "change", "changes")} still waiting.`);
      }
      return parts.join(" ");
    },
    skipped:
      "These works left the collection before their checkmarks were sent, so the sync left them as they are in Zotero:",
    marksClosed:
      "Checkmarks can’t change until a sync succeeds. You can still read and search the references.",
    newTag: "Sync to show checkmarks for the new checkmark tag.",
    search: "Search references",
    noMatch: (text: string): string => `No reference matches “${text}”.`,
    empty: "This collection has no works yet. Add them in Zotero, then sync.",
    openInZotero: "Open in Zotero",
    openInZoteroFor: (entry: string): string => `Open in Zotero: ${entry}`,
    check: (entry: string): string => `Checkmark for ${entry}`,
    waiting: "Waiting to sync",
    count: (count: number): string => plural(count, "reference", "references"),
    more: (count: number, list: string): string => `${count} more in ${list}`,
  },
  settings: {
    title: "List settings",
    name: "Name",
    nameHint:
      "The list takes its collection’s name until you give it another one.",
    collection: (name: string): string => `Collection: ${name}`,
    save: "Save",
    saved: "Saved.",
    pending:
      "Sync or discard the waiting checkmark changes before you change the checkmark tag.",
    discard: "Discard waiting changes",
    discardConfirm: {
      title: "Discard waiting changes?",
      description:
        "The waiting checkmark changes are dropped, and each reference shows its checkmark from the last sync. Zotero stays as it is.",
      confirm: "Discard",
      cancel: "Cancel",
    },
    discarded: "Waiting changes discarded.",
    remove: "Remove list",
    removeConfirm: {
      title: "Remove this list?",
      description:
        "The list, its references and any waiting checkmark changes leave this quest. Your Zotero library stays as it is.",
      confirm: "Remove",
      cancel: "Cancel",
    },
    unavailable: "This list is no longer available.",
  },
};

export { ZOTERO_COPY };
