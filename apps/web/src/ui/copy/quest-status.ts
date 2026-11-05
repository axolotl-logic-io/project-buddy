const QUEST_STATUS_COPY = {
  labels: { active: "Active", completed: "Completed", abandoned: "Abandoned" },
  actions: {
    active: "Restore quest",
    completed: "Mark completed",
    abandoned: "Mark abandoned",
  },
  saved: {
    active: "Quest restored. Check-ins stay off until you turn them on.",
    completed: "Quest completed. Check-ins paused.",
    abandoned: "Quest abandoned. Check-ins paused.",
  },
  option: (name: string, status: string): string => `${name} (${status})`,
  menu: "Quest actions",
  tabs: "Quest status",
  restore: "Restore quest",
  undo: "Undo",
  empty: "No quests with this status.",
  effects:
    "Your adventures, Journal, Quick Notes and progress stay available. Completed and abandoned quests have no check-ins. You can restore the quest whenever you want.",
  pending: "Awaiting your approval",
  approvalHeading: "Confirm quest status change",
  confirm: {
    active: "Confirm restore",
    completed: "Confirm completed",
    abandoned: "Confirm abandoned",
  },
  decline: "Keep current status",
  decisions: {
    pending: "Awaiting your approval",
    approved: "Approved",
    declined: "Declined. Quest status kept.",
    outdated: "This request is outdated. Ask your construct for a new one.",
  },
  loading: "Checking this request…",
  unavailable:
    "Only the quest owner can answer this request. It may also have been removed.",
  failed:
    "The quest changed or this request is no longer available. Refresh and try again.",
  change: (from: string, to: string): string => `${from} → ${to}`,
  open: "Open quest",
} as const;

export { QUEST_STATUS_COPY };
