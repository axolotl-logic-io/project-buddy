const PERFORMANCE_COPY = {
  rite: "Rite",
  space: "Space",
  conjuration: "Conjuration",
  send: "Conjure",
  working: "Replying…",
  title: (rite: string, space: string): string => `${rite} · ${space}`,
  count: (count: number): string => `${count} added`,
  active: "Active",
  empty: "No performances yet.",
  heading: "Performances",
  start: "Perform",
  stop: "Stop",
  ritesAndStatus: "Rites & status",
  unavailable: "This performance is unavailable.",
  required: "Start a performance to conjure.",
  unnamed: "Quest member",
  opening: (rite: string, space: string): string =>
    `${rite} begins on ${space}.`,
  closing: (rite: string, count: number, noun: string): string =>
    `${rite} ends. ${count} ${noun} added.`,
  refused: (limit: number, noun: string): string =>
    `Use 1 to ${limit} characters for each ${noun}.`,
} as const;

export { PERFORMANCE_COPY };
