// The text of chats: the new-chat form, the chat page and its conversation,
// the tutor's tool parts, and chat names.
import type { ReactNode } from "react";
import { pageTitle } from "@/ui/copy/site.ts";

// The words before the persona's name in a named chat's link, so hiding them
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
  personaLabel: "Persona",
  start: "Start chat",
  starting: "Starting the chat…",
  chooseProject: "Choose a project for the chat.",
  choosePersona: "Choose a persona for the chat.",
} as const;

export const CHAT_COPY = {
  loading: "Loading chat…",
  heading: (personaName: string): string => `Chat with ${personaName}`,
  conversationLabel: "Conversation",
  you: "You",
  thinking: (personaName: string): string => `${personaName} is thinking…`,
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
} as const;

export const CHAT_NAME_COPY = {
  fallback: "New chat",
  listNamePrefix,
  // What a named chat's link reads.
  listTitle: (name: string, personaName: string): string =>
    `${listNamePrefix(name)} ${personaName}`,
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
