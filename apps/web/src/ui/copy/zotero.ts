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
    // The steps of Zotero setup in the New list dialog.
    steps: {
      connect: "Connect",
      connected: "Connected",
      connectedAs: (username: string): string => `as ${username}`,
      // Disconnects, so the owner can connect another account.
      change: "change",
      collection: "Collection",
      // How many works are directly in a collection, as a screen reader
      // reads the count beside it.
      count: (count: number): string => plural(count, "work", "works"),
      checkmarks: "Checkmarks",
      optional: "optional",
      checkmarksOff: "Off. Turn on to check references off with a Zotero tag.",
    },
    connect: "Connect Zotero",
    connectHint:
      "Zotero asks you to approve access to your personal library and its notes, then sends you back to this dialog.",
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
      "Sending checkmarks and notes needs permission to change your Zotero library and its notes. Connect Zotero again and approve changes, then sync.",
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
    // Beside Sync: how many checkmark changes and notes wait for it.
    pending: ({
      marks,
      notes,
    }: {
      readonly marks: number;
      readonly notes: number;
    }): string => {
      const things: string[] = [];
      if (marks > 0) {
        things.push(plural(marks, "checkmark", "checkmarks"));
      }
      if (notes > 0) {
        things.push(plural(notes, "note", "notes"));
      }
      return `${things.join(" and ")} waiting`;
    },
    lastSynced: "Last synced",
    never: "No sync yet",
    // The last sync's result, under the time of the last successful one.
    synced: ({
      sent,
      notesSent,
      waiting,
    }: {
      readonly sent: number;
      readonly notesSent: number;
      readonly waiting: number;
    }): string => {
      const parts: string[] = ["Synced."];
      const things: string[] = [];
      if (sent > 0) {
        things.push(plural(sent, "checkmark", "checkmarks"));
      }
      if (notesSent > 0) {
        things.push(plural(notesSent, "note", "notes"));
      }
      if (things.length > 0) {
        parts.push(`Sent ${things.join(" and ")} to Zotero.`);
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
      notesSent,
      waiting,
    }: {
      readonly sent: number;
      readonly notesSent: number;
      readonly waiting: number;
    }): string => {
      const parts: string[] = ["The last sync failed."];
      const things: string[] = [];
      if (sent > 0) {
        things.push(plural(sent, "checkmark", "checkmarks"));
      }
      if (notesSent > 0) {
        things.push(plural(notesSent, "note", "notes"));
      }
      if (things.length > 0) {
        parts.push(
          `Zotero confirmed ${things.join(" and ")} before it stopped.`,
        );
      }
      if (waiting > 0) {
        parts.push(`${plural(waiting, "change", "changes")} still waiting.`);
      }
      return parts.join(" ");
    },
    skipped:
      "These works left the collection before their changes were sent, so the sync left them as they are in Zotero:",
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
  // Notes on references: Zotero child notes, shown beside their entries.
  notes: {
    works: "Works Cited",
    heading: "Notes",
    // The rubric numeral that ties a note to its entry, as a screen reader
    // reads it.
    key: (numeral: string): string => `Note ${numeral}`,
    add: "Add a note",
    addFor: (entry: string): string => `Add a note to ${entry}`,
    edit: "Edit",
    editFor: (numeral: string): string => `Edit note ${numeral}`,
    field: (entry: string): string => `Note on ${entry}`,
    save: "Save note",
    saving: "Saving…",
    cancel: "Cancel",
    hint: "Saved notes wait for Sync, then go to Zotero.",
    inZotero: "in Zotero",
    waiting: "waiting to sync",
    formatted: "This note has formatting from Zotero. Edit it in Zotero.",
    closed:
      "Notes can’t change until a sync succeeds. You can still read them.",
    problem: "Write the note in 1 to 4000 characters.",
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
      "Sync or discard the waiting changes before you change the checkmark tag.",
    discard: "Discard waiting changes",
    discardConfirm: {
      title: "Discard waiting changes?",
      description:
        "The waiting checkmark changes and notes are dropped, and each reference shows its checkmarks and notes from the last sync. Zotero stays as it is.",
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
