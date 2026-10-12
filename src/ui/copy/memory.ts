// The text of a project's memory page, and of the tutor's memory changes in a
// chat.
import { pageTitle } from "@/ui/copy/site.ts";

export const MEMORY_COPY = {
  title: pageTitle("Memory"),
  link: "Project memory",
  heading: "Memory",
  intro:
    "What the tutor knows about this project. Every chat in the project works from it, and both you and the tutor can change it.",
  currentLabel: "Current memory",
  loading: "Loading memory…",
  empty:
    "Nothing is saved in this project's memory yet. Write it below, or tell the tutor what to remember.",
  editHeading: "Edit the memory",
  textLabel: "Memory",
  textHint:
    "Markdown. The project's chats work from your text from their next reply.",
  save: "Save memory",
  saved: "Saved.",
  outdated:
    "The memory changed since you started editing, so your text was not saved. The newer version is shown above, and your text is still here, to change and save again.",
  historyHeading: "History",
  noHistory: "No versions yet.",
  versionHeading: (version: number): string => `Version ${version}`,
  versionMade: (author: string, madeAt: string): string =>
    `by ${author}, ${madeAt}`,
  byUser: "you",
  byTutor: "the tutor",
  newest: "(current)",
  showText: "Show its text",
  restore: (version: number): string => `Restore version ${version}`,
  restoreTitle: (version: number): string => `Restore version ${version}?`,
  restoreDescription: (version: number): string =>
    `The memory goes back to the text of version ${version}, saved as a new version. Every version stays in the history, so you can change your mind later.`,
  restoreCancel: "Cancel",
  restoreOutdated:
    "The memory changed since this page loaded, so nothing was restored. The newer version is shown above.",
  changeLabel: "Memory change",
  changed: (version: number): string =>
    `Updated the project's memory (version ${version})`,
  removed: "Removed:",
  added: "Added:",
  notChanged: "The tutor's change to the project's memory did not apply.",
} as const;
