const PERFORMANCE_COPY = {
  rite: "Rite",
  list: "List",
  message: "Message",
  send: "Send",
  signedOut: "Your session ended. Sign in again to continue.",
  signIn: "Sign in again",
  failed: "The reply could not be saved. Try again.",
  retry: "Retry reply",
  working: "Replying…",
  title: (rite: string, list: string): string => `${rite} · ${list}`,
  count: (count: number): string => `${count} added`,
  active: "Active",
  empty: "No performances yet.",
  heading: "Performances",
  start: "Perform",
  stop: "Stop",
  ritesAndStatus: "Rites & status",
  unavailable: "This performance is unavailable.",
  required: "Start a performance to send a message.",
  unnamed: "Quest member",
  opening: (rite: string, list: string): string => `${rite} begins on ${list}.`,
  closing: (rite: string, count: number, noun: string): string =>
    `${rite} ends. ${count} ${noun} added.`,
  refused: (limit: number, noun: string): string =>
    `Use 1 to ${limit} characters for each ${noun}.`,
} as const;

export { PERFORMANCE_COPY };
