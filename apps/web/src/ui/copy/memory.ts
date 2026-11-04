// The text of a project's memory page, and of the buddy's memory changes in a
// chat.
import { pageTitle } from "@/ui/copy/site.ts";

export const MEMORY_COPY = {
  draftHint: "Unsaved edits stay in this browser until saved or discarded.",
  title: pageTitle("Memory"),
  link: "Project memory",
  heading: "Memory",
  intro:
    "What the buddy knows about this project. Every chat in the project works from it, and both you and the buddy can change it.",
  currentLabel: "Current memory",
  loading: "Loading memory…",
  empty:
    "Nothing is saved in this project's memory yet. Choose Edit to write it, or tell the buddy what to remember.",
  edit: "Edit",
  newerLabel: "Newer memory",
  textLabel: "Memory",
  textHint:
    "Markdown. The project's chats work from your text from their next reply.",
  save: "Save",
  cancelEdit: "Discard changes",
  saved: "Saved.",
  outdated:
    "The memory changed since you started editing, so your text was not saved. The newer version is shown above, and your text is still here, to change and save again.",
  historyHeading: "History",
  noHistory: "No versions yet.",
  versionHeading: (version: number): string => `Version ${version}`,
  versionMade: (author: string, madeAt: string): string =>
    `by ${author}, ${madeAt}`,
  // Who saved a version: the viewer, another person by name, the buddy, or,
  // on a version saved before savers were recorded, a person not named.
  byUser: "you",
  byBuddy: "the buddy",
  byUnnamedPerson: "a person (name not recorded)",
  newest: "(current)",
  showText: "Show its text",
  restore: (version: number): string => `Restore version ${version}`,
  restoreTitle: (version: number): string => `Restore version ${version}?`,
  restoreDescription: (version: number): string =>
    `The memory goes back to the text of version ${version}, saved as a new version. Every version stays in the history, so you can change your mind later.`,
  restored: (version: number): string =>
    `Restored version ${version} as a new memory version.`,
  restoreCancel: "Cancel",
  restoreOutdated:
    "The memory changed since this page loaded, so nothing was restored. The newer version is shown above.",
  changeLabel: "Memory change",
  changed: (version: number): string =>
    `Updated the project's memory (version ${version})`,
  removed: "Removed:",
  added: "Added:",
  notChanged: "The buddy's change to the project's memory did not apply.",
} as const;
