const PERFORMANCE_COPY = {
  message: "Message",
  send: "Send",
  signedOut: "Your session ended. Sign in again to continue.",
  signIn: "Sign in again",
  failed: "The reply could not be saved. Try again.",
  retry: "Retry reply",
  working: "Saving…",
  start: "Perform",
  stop: "Stop",
  unavailable: "This performance is unavailable.",
  required: "Start a performance to send a message.",
  unnamed: "Quest member",
  closing: (rite: string, count: number, noun: string): string =>
    `${rite} ends. ${count} ${noun} added.`,
  refused: (limit: number, noun: string): string =>
    `Use 1 to ${limit} characters for each ${noun}.`,
} as const;

export { PERFORMANCE_COPY };
