// A quest's conversation on its page: the quest's next task above it, the
// Start action for a quest whose conversation hasn't started yet, and the
// Dailies quest's Start Day.

const HOUR_MS = 3_600_000;

const HOURS_PER_DAY = 24;

// How long the line counts in hours before it counts in days.
const HOURS_SHOWN = 48;

function plural(count: number, one: string, many: string): string {
  if (count === 1) {
    return `${count} ${one}`;
  }
  return `${count} ${many}`;
}

// How long ago the newest day started, under the Start Day button: in hours
// for the first two days, and then in days.
function lastDayStarted(milliseconds: number): string {
  const hours = Math.floor(Math.max(0, milliseconds) / HOUR_MS);
  if (hours < 1) {
    return "Last day started less than an hour ago";
  }
  if (hours < HOURS_SHOWN) {
    return `Last day started ${plural(hours, "hour", "hours")} ago`;
  }
  return `Last day started ${plural(Math.floor(hours / HOURS_PER_DAY), "day", "days")} ago`;
}

export const QUEST_CONVERSATION_COPY = {
  notStarted:
    "This quest’s conversation hasn’t started yet. Start it to hear from its construct.",
  start: "Start the conversation",
  starting: "Starting…",
  startDay: "Start Day",
  cancel: "Cancel",
  confirmStartDay:
    "Start a new day? The conversation starts empty, its active spell ends, and done recurring tasks reopen. You can undo this until someone sends a message.",
  clearTasks: "Remove all tasks",
  keepTasks:
    "By default, tasks are kept: done recurring tasks reopen, and one-off tasks stay as they are.",
  clearIdeas: "Remove all Ideas",
  lastDayStarted,
  noDayYet: "No day started yet",
  undoStartDay: "Undo Start Day",
  undoNote: "Undo brings back the conversation, tasks and Ideas from before.",
} as const;
