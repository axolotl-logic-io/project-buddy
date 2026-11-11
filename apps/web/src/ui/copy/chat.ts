// The text of conversations: the construct picker, the conversation,
// the construct's tool parts, and chat names.
import { BATTERIES_COPY } from "@/ui/copy/batteries.ts";

export const NEW_CHAT_COPY = {
  constructLabel: "Construct",
  previousConstruct: "Previous construct",
  nextConstruct: "Next construct",
  constructPosition: (position: number, count: number): string =>
    `${position} of ${count}`,
  ownConstructDescription: "One of your own constructs.",
} as const;

export const CHAT_COPY = {
  balance: (gold: number): string => `Batteries balance: ${gold}`,
  balanceUnknown: "Batteries balance unavailable",
  costPending: "Reply cost pending.",
  costUnknown: "Reply cost unavailable; this does not mean zero batteries.",
  replyCost: (gold: number): string =>
    `Reply cost: ${BATTERIES_COPY.tenths(gold)}.`,
  stop: "Stop reply",
  stopping: "Stop requested. Waiting for the server…",
  stopFailed:
    "The server could not confirm Stop. The reply may still be running. Try again or reload.",
  stopCompleted: "The reply finished before Stop took effect.",
  cancelledReply:
    "Reply stopped at your request. Tool effects already started may remain or finish. Batteries charged for use are not refunded.",
  reattach:
    "Images from your unsent message were not kept. Attach them again before sending.",
  replyingElsewhere: (name: string): string =>
    `${name} is still replying. This conversation will update when the reply finishes.`,
  headerLink: "Chat",
  loading: "Loading Chat…",
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

export const CITATIONS_COPY = {
  searching: (query: string): string => `Searching the manual for “${query}”…`,
  searched: (query: string): string => `Searched the manual for “${query}”`,
  heading: "From the Blender manual",
  opensInNewTab: "Opens in a new tab",
} as const;

// What the chat shows in place of a tool call that failed, by tool.
export const TOOL_FAILURES_COPY = {
  questStatus: "Your construct couldn’t request the quest status change.",
  citeManual: "Your construct couldn't show its links to the manual.",
  searchManual: "Your construct couldn't search the manual.",
  updateMemory: "Your construct couldn't update the quest's Journal.",
  createProject: "Your construct couldn't create the quest.",
  selectActivity: "Your construct couldn't change the conversation's activity.",
  castSpell: "Your construct couldn't cast the spell.",
  recordMilestone: "Your construct couldn't add the milestone to the timeline.",
  changePlan: "Your construct couldn't change the quest's plan.",
} as const;

// The activity change shown in the construct's reply.
export const SELECT_ACTIVITY_COPY = {
  entered: (name: string): string => `Activity: ${name}`,
} as const;

// The spell cast shown in the construct's reply.
export const CAST_SPELL_COPY = {
  cast: (name: string): string => `Cast ${name}`,
} as const;

// The project the construct created from a chat, or why it created none.
export const CREATE_PROJECT_COPY = {
  review: (name: string): string => `Create quest: ${name}`,
  summary: "Summary for the new Journal",
  motivation: "Motivation (optional)",
  summaryHint:
    "Review and edit what to carry into the new quest. Only this confirmed summary and motivation enter its Journal. This Chat stays private and keeps its messages; planned steps are not completed milestones.",
  confirm: "Confirm summary and create quest",
  creating: "Creating your quest…",
  creationFailed:
    "The quest could not be confirmed. Your edits are kept; try again. Repeating confirmation will not create another quest.",
  created: (name: string): string => `Created the quest “${name}”`,
  openQuest: "Open the quest",
  claudeUnavailable:
    "Claude is unavailable right now, so the quest wasn't created. Please try again later.",
} as const;

// What the new-project and new-chat forms say when Claude can't write the new
// chat's opening, so nothing was started.
export const OPENING_COPY = {
  claudeUnavailable:
    "Claude is unavailable right now, so replies are turned off. Please try again later.",
} as const;
