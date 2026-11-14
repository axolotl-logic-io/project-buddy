// A quest's conversation on its page: the quest's next step above it, and
// the Start action for a quest whose conversation hasn't started yet.

export const QUEST_CONVERSATION_COPY = {
  notStarted:
    "This quest’s conversation hasn’t started yet. Start it to hear from its construct.",
  start: "Start the conversation",
  starting: "Starting…",
  resetDay: "Reset Day",
  reset: "Reset",
  cancel: "Cancel",
  confirmReset:
    "Reset this conversation? Its messages and active spell will be cleared. This cannot be undone.",
  clearSteps: "Remove all Steps",
  keepSteps: "By default, Steps are kept and unchecked.",
  clearIdeas: "Remove all Ideas",
} as const;
