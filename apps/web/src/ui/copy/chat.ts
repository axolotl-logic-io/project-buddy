// The text of conversations: the conversation, the construct's tool parts,
// and chat names.

export const CHAT_COPY = {
  stop: "Stop reply",
  stopping: "Stop requested. Waiting for the server…",
  stopFailed:
    "The server could not confirm Stop. The reply may still be running. Try again or reload.",
  stopCompleted: "The reply finished before Stop took effect.",
  cancelledReply:
    "Reply stopped at your request. Tool effects already started may remain or finish.",
  replyingElsewhere: (name: string): string =>
    `${name} is still replying. This conversation will update when the reply finishes.`,
  conversationLabel: "Conversation",
  you: "You",
  thinking: (constructName: string): string => `${constructName} is thinking…`,
  writing: (constructName: string): string => `${constructName} is writing…`,
  workingNote: "Working note",
  messageLabel: "Message",
  send: "Send",
  keyHint: "Enter sends · Shift+Enter starts a new line",
  // The last message's reply stopped before it was saved, such as after a
  // failure, and nothing is replying to it now.
  replyStopped: (constructName: string): string =>
    `${constructName} didn't reply to the last message. Retry the reply, or send another message.`,
} as const;

export const TOOL_FAILURES_COPY = {
  questStatus: "Your construct couldn’t request the quest status change.",
  castSpell: "Your construct couldn't cast the spell.",
  recordMilestone: "Your construct couldn't add the milestone to the timeline.",
  changePlan: "Your construct couldn't change the quest's plan.",
} as const;

// The spell cast shown in the construct's reply.
export const CAST_SPELL_COPY = {
  cast: (name: string): string => `Cast ${name}`,
} as const;

// What the new-quest and new-chat forms say when Claude can't write the new
// chat's opening, so nothing was started.
export const OPENING_COPY = {
  claudeUnavailable:
    "Claude is unavailable right now, so replies are turned off. Please try again later.",
} as const;
