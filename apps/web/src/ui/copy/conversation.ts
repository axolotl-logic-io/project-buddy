// Dailies day controls and the elapsed time since the newest day began.
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
  startDay: "Start Day",
  cancel: "Cancel",
  confirmStartDay:
    "Start a new day? This ends any active spell and reopens done recurring tasks. You can undo this until you send a message in the new day.",
  clearTasks: "Remove all tasks",
  keepTasks:
    "By default, tasks are kept: done recurring tasks reopen, and one-off tasks stay as they are.",
  clearIdeas: "Remove all Ideas",
  lastDayStarted,
  noDayYet: "No day started yet",
  undoStartDay: "Undo Start Day",
  undoNote: "Undo restores the previous day’s Tasks, Ideas and spell.",
} as const;
