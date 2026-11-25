const QUEST_STATUS_COPY = {
  labels: { active: "Active", completed: "Completed", abandoned: "Abandoned" },
  saved: {
    active: "Quest restored.",
    completed: "Quest completed.",
    abandoned: "Quest abandoned.",
  },
  tabs: "Quests",
  complete: "Complete",
  abandon: "Abandon",
  restore: "Restore quest",
  undo: "Undo",
  empty: "No quests with this status.",
  effects:
    "The quest’s work stays available. You can restore the quest whenever you want.",
  failed:
    "The quest changed or this request is no longer available. Refresh and try again.",
} as const;

export { QUEST_STATUS_COPY };
