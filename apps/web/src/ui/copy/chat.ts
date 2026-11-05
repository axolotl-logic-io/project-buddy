// The text of chats: the new-chat form, the chat page and its conversation,
// the construct's tool parts, and chat names.
import { pageTitle } from "@/ui/copy/site.ts";

// The words before the construct's name in a named chat's link, so hiding them
// (the chat-names extra, src/flags/flags.ts) reads as an unnamed chat's link.
function listNamePrefix(name: string): string {
  return `${name} with`;
}

export const NEW_CHAT_COPY = {
  revisitInterviewHint:
    "Discuss this quest’s goals and next step, using any existing memory. Its memory is kept.",
  title: pageTitle("New chat"),
  heading: "Start a chat",
  // The button on the Chats page and a project's page, and the dialog it
  // opens with the form.
  dialogHeading: "New chat",
  closeDialog: "Close",
  loading: "Loading quests…",
  activityLabel: "Activity",
  projectLabel: "Quest",
  noProject: "No quest",
  newProject: "New quest",
  projectOptions: "Other options",
  existingProjects: "Your quests",
  projectNameHeading: "Name your new quest",
  projectNameLabel: "Quest name",
  startProject: "Start quest",
  cancelProjectName: "Cancel",
  needsProjectName: "Give the new quest a name.",
  projectNameTooLong: (maxLength: number): string =>
    `Use a shorter name, of at most ${maxLength} characters.`,
  constructLabel: "Guildmate",
  previousConstruct: "Previous construct",
  nextConstruct: "Next construct",
  chooseConstructButton: "Choose a guildmate…",
  closeChooser: "Keep this guildmate",
  constructPosition: (position: number, count: number): string =>
    `${position} of ${count}`,
  builtInConstructs: "Built-in constructs",
  ownConstructs: "Your constructs",
  ownConstructDescription: "One of your own constructs.",
  start: "Start chat",
  starting: "Starting the chat…",
  chooseProject: "Choose a quest for the chat, or no quest.",
  chooseActivity: "Choose an activity for the chat.",
  interviewNeedsProject:
    "The quest interview needs a quest. Start a new quest to have one.",
  chooseConstruct: "Choose a guildmate for the chat.",
} as const;

// The landing page's Today section, above the new-chat form: the projects
// the user was recently active in, with their next steps, and recent chats.
export const TODAY_COPY = {
  heading: "Today",
  projectsHeading: "Your quests",
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
  listHeading: "Previous chats",
  noChats: "No chats yet. Choose New chat to start one.",
  loading: "Loading chats…",
  projectFilterLabel: "Show chats from",
  allProjects: "All",
} as const;

export const CHAT_COPY = {
  reattach:
    "Images from your unsent message were not kept. Attach them again before sending.",
  replyingElsewhere: (name: string): string =>
    `${name} is still replying. This chat will update when the reply finishes.`,
  headerLink: "Chats",
  loading: "Loading chat…",
  heading: (constructName: string): string => `Chat with ${constructName}`,
  conversationLabel: "Conversation",
  you: "You",
  thinking: (constructName: string): string => `${constructName} is thinking…`,
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
  citeManual: "Your guildmate couldn't show its links to the manual.",
  searchManual: "Your guildmate couldn't search the manual.",
  updateMemory: "Your guildmate couldn't update the quest's memory.",
  createProject: "Your guildmate couldn't create the quest.",
  selectActivity: "Your guildmate couldn't change the chat's activity.",
  castSpell: "Your guildmate couldn't cast the spell.",
  recordMilestone: "Your guildmate couldn't add the milestone to the timeline.",
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
  created: (name: string): string => `Created the quest “${name}”`,
  openInterview: "Open its first chat",
  claudeUnavailable:
    "Claude is unavailable right now, so the quest wasn't created. Please try again later.",
} as const;

export const CHAT_NAME_COPY = {
  fallback: "New chat",
  listNamePrefix,
  // What a named chat's link reads.
  listTitle: (name: string, constructName: string): string =>
    `${listNamePrefix(name)} ${constructName}`,
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
