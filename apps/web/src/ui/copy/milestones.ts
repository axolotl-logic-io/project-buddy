// The text of a project's progress timeline, on the project's page, and of
// the milestone the construct records in a chat. It celebrates what the user got
// done and never nags: no streaks, gaps or counts of days.

export const MILESTONE_COPY = {
  recordedLabel: "Milestone",
  recorded: "Added to the progress timeline",
  timelineLink: "See the progress timeline",
} as const;

export const PROGRESS_TIMELINE_COPY = {
  heading: "Progress",
  none: "Nothing here yet. When you finish something in an adventure in this quest, your construct adds it here.",
  openChat: "Open its adventure",
  edit: "Edit",
  editLabel: (text: string): string => `Edit the milestone "${text}"`,
  textLabel: "Milestone",
  save: "Save",
  cancel: "Cancel",
  needsText: "A milestone needs some text.",
  tooLong: (maxLength: number): string =>
    `Keep a milestone to one line of at most ${maxLength} characters.`,
  delete: "Delete",
  deleteLabel: (text: string): string => `Delete the milestone "${text}"`,
  deleteTitle: "Delete this milestone?",
  deleteDescription: (text: string): string =>
    `"${text}" leaves the progress timeline. Its adventure stays as it is.`,
  deleteConfirm: "Delete milestone",
  deleteCancel: "Keep it",
} as const;
