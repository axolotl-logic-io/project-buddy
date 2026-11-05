// The text of the projects list, the new-project form and a project's
// overview page, with its Members section.
import { pageTitle } from "@/ui/copy/site.ts";

export const PROJECTS_COPY = {
  title: pageTitle("Quests"),
  headerLink: "Quests",
  homeLink: "Home",
  heading: "Quests",
  loading: "Loading quests…",
  none: "No quests yet. Choose New quest to start one.",
  newHeading: "New quest",
  closeNewProject: "Close",
  listHeading: "All quests",
  shared: "Shared",
  sharedWithYou: "Shared with you",
  created: (createdAt: string): string => `started ${createdAt}`,
  nameLabel: "Quest name",
  create: "Create quest",
  creating: "Creating the quest and its first adventure…",
  allProjectsLink: "All quests",
  needsName: "A quest needs a name.",
  nameTooLong: (maxLength: number): string =>
    `Use a shorter name, of at most ${maxLength} characters.`,
  motivationLabel: "Why do you want to complete this quest?",
  motivationHint:
    "Optional. Tell your construct what makes this quest matter to you.",
  invalidDetails: "Enter a quest name and motivation as text.",
} as const;

export const PROJECT_COPY = {
  loading: "Loading quest…",
  chatsHeading: "Adventures",
  noChats: "No adventures yet.",
  chatStarted: (startedAt: string): string => `started ${startedAt}`,
} as const;

// A project's Members section: who is in a team project, and the buttons
// that take someone out of it.
export const PROJECT_MEMBERS_COPY = {
  heading: "Members",
  owner: "Owner",
  member: "Member",
  you: (label: string): string => `${label} (you)`,
  joined: (role: string, joinedAt: string): string =>
    `${role} · joined ${joinedAt}`,
  alone: "Only you work on this quest for now.",
  remove: "Remove",
  removeLabel: (label: string): string => `Remove ${label} from the quest`,
  removeTitle: "Remove this member?",
  removeDescription: (label: string): string =>
    `${label} can no longer open this quest or its adventures. What they wrote stays in the adventures.`,
  removeConfirm: "Remove member",
  removeCancel: "Keep them",
  leave: "Leave quest",
  leaveTitle: "Leave this quest?",
  leaveDescription:
    "You can no longer open this quest or its adventures unless the owner invites you again. What you wrote stays in the adventures.",
  leaveConfirm: "Leave quest",
  leaveCancel: "Stay",
} as const;
