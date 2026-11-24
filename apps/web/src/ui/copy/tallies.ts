// Tallies: the counter cards of a tally list in a quest, and Home's ledger
// of every tally across the user's Active quests.
export const TALLIES_COPY = {
  heading: "Tallies",
  today: "Today",
  total: "Total",
  // A tally's last seven days, for screen readers.
  recentDays: "Last seven days",
  day: (weekday: string, date: string, total: string): string =>
    `${weekday} ${date}: ${total}`,
  increment: "Increment",
  incrementBy: (tally: string): string => `Amount to add to ${tally}`,
  add: "Add",
  editToday: "Edit today",
  todayTotal: (tally: string): string => `Today’s total for ${tally}`,
  dayTotal: (tally: string, weekday: string, date: string): string =>
    `Total for ${tally} on ${weekday} ${date}`,
  // A ledger cell's button, by its accessible name: the tally, the day and
  // its total.
  cell: (tally: string, weekday: string, date: string, total: string): string =>
    `${tally}, ${weekday} ${date}: ${total}. Change`,
  // A ledger cell on a date after its quest's today.
  noDay: "–",
  save: "Save",
  cancel: "Cancel",
  saved: "Tally saved.",
  tallyColumn: "Tally",
  incrementColumn: "Increment",
  // A quest's line above its tallies, after its name.
  tallyCount: (count: number): string => {
    if (count === 1) {
      return "· 1 tally";
    }
    return `· ${count} tallies`;
  },
  noTallies:
    "No tallies yet. To count something every day, such as words written or books read, add a list with the type Tallies to a quest.",
  legend:
    "Choose a day’s total to change it, or Increment to add to today’s. Each day starts at midnight in the quest owner’s time zone.",
  problems: {
    "invalid-amount":
      "Enter a number with at most 12 digits before the decimal point and 6 after it.",
    missing: "This tally is unavailable.",
    "out-of-range": "Only the last seven days can be changed.",
    "too-large": "That would make the day’s total too large.",
  },
} as const;
