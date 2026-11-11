// The text of a project's memory page, and of the construct's memory changes in a
// chat.
import { pageTitle } from "@/ui/copy/site.ts";

export const MEMORY_COPY = {
  restoredFrom: (version: number): string => `Restored from version ${version}`,
  draftHint: "Unsaved edits stay in this browser until saved or discarded.",
  title: pageTitle("Journal"),
  link: "Quest Journal",
  heading: "Journal",
  intro:
    "The goals, milestones, preferences and Quick Notes your constructs know about this quest. The quest's conversation works from this Journal, and both you and your construct can change it.",
  currentLabel: "Current Journal",
  loading: "Loading Journal…",
  empty:
    "Nothing is saved in this quest's Journal yet. Choose Edit to write it, or tell your construct what to remember.",
  edit: "Edit",
  newerLabel: "Newer Journal",
  textLabel: "Journal",
  textHint:
    "Markdown. The quest's conversation works from your text from its next reply.",
  save: "Save",
  cancelEdit: "Discard changes",
  saved: "Saved.",
  outdated:
    "The Journal changed since you started editing, so your text was not saved. The newer version is shown above, and your text is still here, to change and save again.",
  historyHeading: "History",
  noHistory: "No versions yet.",
  versionHeading: (version: number): string => `Version ${version}`,
  versionMade: (author: string, madeAt: string): string =>
    `by ${author}, ${madeAt}`,
  // Who saved a version: the viewer, another person by name, the construct, or,
  // on a version saved before savers were recorded, a person not named.
  byUser: "you",
  byConstruct: "a construct",
  byUnnamedPerson: "a person (name not recorded)",
  newest: "(current)",
  showText: "Show its text",
  restore: (version: number): string => `Restore version ${version}`,
  restoreTitle: (version: number): string => `Restore version ${version}?`,
  restoreDescription: (version: number): string =>
    `The Journal goes back to the text of version ${version}, saved as a new version. Every version stays in the history, so you can change your mind later.`,
  restored: (version: number): string =>
    `Restored version ${version} as a new Journal version.`,
  restoreCancel: "Cancel",
  restoreOutdated:
    "The Journal changed since this page loaded, so nothing was restored. The newer version is shown above.",
  changeLabel: "Journal change",
  changed: (version: number): string =>
    `Updated the quest's Journal (version ${version})`,
  removed: "Removed:",
  added: "Added:",
  notChanged: "Your construct's change to the quest's Journal did not apply.",
} as const;
