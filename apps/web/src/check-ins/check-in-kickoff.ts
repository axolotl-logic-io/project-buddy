// The user's side of a check-in before the construct's message: what asks the
// construct to check in (src/replies/chat-opening.ts). The user never sees it.
// It is here, with the recogniser the mock reads it by.

const CHECK_IN_KICKOFF = [
  "I haven't worked on this quest for a while, and you are checking in on me.",
  "Write a short message, two or three sentences, in your voice: remind me where I left off, from the quest's Journal, and suggest one small next step I could take in about ten minutes.",
  "Ask at most one question. Don't list the whole Journal back to me.",
].join(" ");

// Whether text is the check-in kickoff, so the mock can answer it.
function isCheckInKickoff(text: string): boolean {
  return text === CHECK_IN_KICKOFF;
}

export { CHECK_IN_KICKOFF, isCheckInKickoff };
