// The text of chats: the new-chat form, the chat page and its conversation,
// the construct's tool parts, and chat names.
import { BATTERIES_COPY } from "@/ui/copy/batteries.ts";
import { pageTitle } from "@/ui/copy/site.ts";

// The words before the construct's name in a named chat's link, so hiding them
// (the chat-names extra, src/flags/flags.ts) reads as an unnamed chat's link.
function listNamePrefix(name: string): string {
  return `${name} with`;
}

export const NEW_CHAT_COPY = {
  fixedChoice: (label: string, name: string | undefined): string =>
    `${label}: ${name ?? ""}`,
  revisitInterviewHint:
    "Discuss this quest’s goals and next step using its Journal. Existing Journal content is kept.",
  title: pageTitle("New adventure"),
  heading: "Start an adventure",
  // The button on the Chats page and a project's page, and the dialog it
  // opens with the form.
  dialogHeading: "New adventure",
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
  constructLabel: "Construct",
  previousConstruct: "Previous construct",
  nextConstruct: "Next construct",
  constructPosition: (position: number, count: number): string =>
    `${position} of ${count}`,
  ownConstructDescription: "One of your own constructs.",
  start: "Start adventure",
  starting: "Starting the adventure…",
  chooseProject: "Choose a quest for the adventure, or no quest.",
  chooseActivity: "Choose an activity for the adventure.",
  interviewNeedsProject:
    "The quest interview needs a quest. Start a new quest to have one.",
  chooseConstruct: "Choose a construct for the adventure.",
} as const;

// The landing page's Today section, above the new-chat form: the projects
// the user was recently active in, with their next steps, and recent chats.
export const TODAY_COPY = {
  heading: "Today",
  projectsHeading: "Your quests",
  nextStepLabel: "Next step:",
  continue: "Continue",
  continueLabel: (projectName: string): string => `Continue ${projectName}`,
  chatsHeading: "Recent adventures",
} as const;

export const STANDALONE_CHATS_COPY = {
  title: pageTitle("Adventures"),
  heading: "Adventures",
  homeLink: "Home",
  backLink: "Adventures",
  listHeading: "Previous adventures",
  noChats: "No adventures yet. Choose New adventure to start one.",
  loading: "Loading adventures…",
  projectFilterLabel: "Show adventures from",
  allProjects: "All",
} as const;

export const CHAT_COPY = {
  balance: (gold: number): string => `Batteries balance: ${gold}`,
  balanceUnknown: "Batteries balance unavailable",
  costPending:
    "Reply cost pending, including any image and automatic adventure name.",
  costUnknown: "Reply cost unavailable; this does not mean zero batteries.",
  replyCost: (gold: number): string =>
    `Reply cost: ${BATTERIES_COPY.amount(gold)} (including retries, images and any automatic adventure name).`,
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
    `${name} is still replying. This adventure will update when the reply finishes.`,
  headerLink: "Adventures",
  loading: "Loading adventure…",
  heading: (constructName: string): string => `Adventure with ${constructName}`,
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
  selectActivity: "Your construct couldn't change the adventure's activity.",
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
    "Review and edit what to carry into the new quest. Only this confirmed summary and motivation enter its Journal. The source adventure stays here; planned steps are not completed milestones.",
  confirm: "Confirm summary and create quest",
  creating: "Creating your quest…",
  creationFailed:
    "The quest could not be confirmed. Your edits are kept; try again. Repeating confirmation will not create another quest.",
  created: (name: string): string => `Created the quest “${name}”`,
  openInterview: "Open its first adventure",
  claudeUnavailable:
    "Claude is unavailable right now, so the quest wasn't created. Please try again later.",
} as const;

export const CHAT_NAME_COPY = {
  fallback: "New adventure",
  listNamePrefix,
  // What a named chat's link reads.
  listTitle: (name: string, constructName: string): string =>
    `${listNamePrefix(name)} ${constructName}`,
  rename: "Rename adventure",
  label: "Adventure name",
  save: "Save name",
  saved: "Renamed.",
  cancel: "Cancel",
  needsName: "An adventure needs a name.",
  tooLong: (maxLength: number): string =>
    `An adventure name is one line of at most ${maxLength} characters.`,
  multiLine: "An adventure name is one line. Take out the line break.",
} as const;

// What the new-project and new-chat forms say when Claude can't write the new
// chat's opening, so nothing was started.
export const OPENING_COPY = {
  claudeUnavailable:
    "Claude is unavailable right now, so adventures are turned off. Please try again later.",
} as const;
