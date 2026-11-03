// The text of chats: the new-chat form, the chat page and its conversation,
// the buddy's tool parts, and chat names.
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
  activityLabel: "Activity",
  projectLabel: "Project",
  noProject: "None",
  newProject: "New project",
  projectOptions: "Other options",
  existingProjects: "Your projects",
  projectNameHeading: "Name your new project",
  projectNameLabel: "Project name",
  startProject: "Start project",
  cancelProjectName: "Cancel",
  needsProjectName: "Give the new project a name.",
  projectNameTooLong: (maxLength: number): string =>
    `Use a shorter name, of at most ${maxLength} characters.`,
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
  chooseProject: "Choose a project for the chat, or no project.",
  chooseActivity: "Choose an activity for the chat.",
  interviewNeedsProject:
    "The project interview needs a project. Start a new project to have one.",
  chooseBuddy: "Choose a buddy for the chat.",
} as const;

// The landing page's Today section, above the new-chat form: the projects
// the user was recently active in, with their next steps, and recent chats.
export const TODAY_COPY = {
  heading: "Today",
  projectsHeading: "Your projects",
  nextStepLabel: "Next step:",
  continue: "Continue",
  continueLabel: (projectName: string): string => `Continue ${projectName}`,
  chatsHeading: "Recent chats",
} as const;

export const STANDALONE_CHATS_COPY = {
  title: pageTitle("Chats"),
  heading: "Chats",
  homeLink: "Home",
  backLink: "Chats",
  newHeading: "New chat",
  closeNewChat: "Close",
  listHeading: "Previous chats",
  noChats: "No chats yet. Choose New chat to start one.",
  loading: "Loading chats…",
  projectFilterLabel: "Show chats from",
  allProjects: "All",
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
  citeManual: "The buddy couldn't show its links to the manual.",
  searchManual: "The buddy couldn't search the manual.",
  updateMemory: "The buddy couldn't update the project's memory.",
  createProject: "The buddy couldn't create the project.",
  selectActivity: "The buddy couldn't change the chat's activity.",
  recordMilestone: "The buddy couldn't add the milestone to the timeline.",
} as const;

// The activity change shown in the buddy's reply.
export const SELECT_ACTIVITY_COPY = {
  entered: (name: string): string => `Activity: ${name}`,
} as const;

// The project the buddy created from a chat, or why it created none.
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
  cancel: "Cancel",
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
