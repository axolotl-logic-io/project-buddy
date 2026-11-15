const QUEST_STATUS_COPY = {
  labels: { active: "Active", completed: "Completed", abandoned: "Abandoned" },
  saved: {
    active: "Quest restored.",
    completed: "Quest completed.",
    abandoned: "Quest abandoned.",
  },
  tabs: "Quests",
  noQuest: "This command needs a quest. Open a quest and try again.",
  commands: [
    {
      command: "/complete",
      usage: "/complete",
      description: "Complete this quest",
    },
    {
      command: "/abandon",
      usage: "/abandon",
      description: "Abandon this quest",
    },
    {
      command: "/restore",
      usage: "/restore",
      description: "Restore this quest",
    },
  ],
  complete: "Complete",
  abandon: "Abandon",
  restore: "Restore quest",
  undo: "Undo",
  empty: "No quests with this status.",
  effects:
    "The conversation, Tasks and progress stay available. You can restore the quest whenever you want.",
  approvalHeading: "Confirm quest status change",
  confirm: {
    active: "Confirm restore",
    completed: "Confirm completed",
    abandoned: "Confirm abandoned",
  },
  decline: "Keep current status",
  decisions: {
    pending: "Awaiting approval",
    approved: "Approved",
    declined: "Declined. Quest status kept.",
    outdated: "This request is outdated. Ask the construct for a new one.",
  },
  loading: "Checking this request…",
  unavailable:
    "This request isn't available to you. It may have been removed, or you may no longer be in this quest.",
  failed:
    "The quest changed or this request is no longer available. Refresh and try again.",
  change: (from: string, to: string): string => `${from} → ${to}`,
  open: "Open quest",
} as const;

export { QUEST_STATUS_COPY };
