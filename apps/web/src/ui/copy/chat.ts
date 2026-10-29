// The text of chats: the new-chat form, the chat page and its conversation,
// the tutor's tool parts, and chat names.
import type { ReactNode } from "react";
import { userMessage } from "@/errors/app-error.ts";
import { formatResetDay } from "@/quota/quota-terms.ts";
import { pageTitle } from "@/ui/copy/site.ts";

// The words before the buddy's name in a named chat's link, so hiding them
// (the chat-names extra, src/flags/flags.ts) reads as an unnamed chat's link.
function listNamePrefix(name: string): string {
  return `${name} with`;
}

export const NEW_CHAT_COPY = {
  title: pageTitle("New chat"),
  heading: "Start a chat",
  loading: "Loading projects…",
  // A sentence that contains a link is a function of the link, so the
  // sentence reads whole here and its spacing stays in the sentence. Elements
  // passed in need keys, because the sentence comes back as a list.
  needsProject: (projectLink: ReactNode): ReactNode[] => [
    "Create a ",
    projectLink,
    " first.",
  ],
  projectLink: "project",
  projectLabel: "Project",
  buddyLabel: "Buddy",
  previousBuddy: "Previous buddy",
  nextBuddy: "Next buddy",
  chooseBuddyButton: "Choose a buddy…",
  closeChooser: "Keep this buddy",
  buddyPosition: (position: number, count: number): string =>
    `${position} of ${count}`,
  builtInBuddies: "Built-in",
  ownBuddies: "Your buddies",
  ownBuddyDescription: "One of your own buddies.",
  start: "Start chat",
  starting: "Starting the chat…",
  chooseProject: "Choose a project for the chat.",
  chooseBuddy: "Choose a buddy for the chat.",
} as const;

export const STANDALONE_CHATS_COPY = {
  title: pageTitle("Chats"),
  heading: "Chats",
  homeLink: "Home",
  backLink: "Chats",
  newHeading: "New chat",
  listHeading: "Chats",
  noChats: "No chats yet. Choose a buddy to start one.",
  loading: "Loading chats…",
  projectFilterLabel: "Project",
  allProjects: "All",
  showChats: "Show chats",
} as const;

export const CHAT_COPY = {
  headerLink: "Chats",
  loading: "Loading chat…",
  heading: (buddyName: string): string => `Chat with ${buddyName}`,
  conversationLabel: "Conversation",
  you: "You",
  thinking: (buddyName: string): string => `${buddyName} is thinking…`,
  workingNote: "Working note",
  messageLabel: "Message",
  send: "Send",
  keyHint: "Enter sends · Shift+Enter starts a new line",
} as const;

export const CITATIONS_COPY = {
  searching: (query: string): string => `Searching the manual for “${query}”…`,
  searched: (query: string): string => `Searched the manual for “${query}”`,
  heading: "From the Blender manual",
  opensInNewTab: "Opens in a new tab",
} as const;

// What the chat shows in place of a tool call that failed, by tool.
export const TOOL_FAILURES_COPY = {
  citeManual: "The tutor couldn't show its links to the manual.",
  searchManual: "The tutor couldn't search the manual.",
  updateMemory: "The tutor couldn't update the project's memory.",
  createProject: "The tutor couldn't create the project.",
} as const;

// The project the tutor created from the central chat, or why it created
// none.
export const CREATE_PROJECT_COPY = {
  created: (name: string): string => `Created the project “${name}”`,
  openInterview: "Open its first chat",
  claudeUnavailable:
    "Claude is unavailable right now, so the project wasn't created. Please try again later.",
} as const;

export const CHAT_NAME_COPY = {
  fallback: "New chat",
  listNamePrefix,
  // What a named chat's link reads.
  listTitle: (name: string, buddyName: string): string =>
    `${listNamePrefix(name)} ${buddyName}`,
  rename: "Rename chat",
  label: "Chat name",
  save: "Save name",
  saved: "Renamed.",
  needsName: "A chat needs a name.",
  tooLong: (maxLength: number): string =>
    `A chat name is one line of at most ${maxLength} characters.`,
  multiLine: "A chat name is one line. Take out the line break.",
} as const;

// What the new-project and new-chat forms say when Claude can't write the new
// chat's opening, so nothing was started.
export const OPENING_COPY = {
  claudeUnavailable:
    "Claude is unavailable right now, so chats are turned off. Please try again later.",
} as const;

// The sentence after the quota-used-up message (src/errors/app-error.ts) in
// the chat and the new-chat and new-project forms, naming the reset day.
export const QUOTA_COPY = {
  resetsOn: (day: string): string => `It resets on ${day} (UTC).`,
} as const;

// What a refusal says when the quota is used up, naming the day it resets.
// The chat and the new-chat and new-project forms all show this text.
export function quotaUsedUpMessage(resetsOn: Date): string {
  return `${userMessage("quota-used-up")} ${QUOTA_COPY.resetsOn(
    formatResetDay(resetsOn),
  )}`;
}
