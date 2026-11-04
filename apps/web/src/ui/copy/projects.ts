// The text of the projects list, the new-project form and a project's
// overview page, with its Members section.
import { pageTitle } from "@/ui/copy/site.ts";

export const PROJECTS_COPY = {
  title: pageTitle("Projects"),
  headerLink: "Projects",
  homeLink: "Home",
  heading: "Projects",
  loading: "Loading projects…",
  none: "No projects yet. Choose New project to start one.",
  newHeading: "New project",
  closeNewProject: "Close",
  listHeading: "All projects",
  shared: "Shared",
  sharedWithYou: "Shared with you",
  created: (createdAt: string): string => `started ${createdAt}`,
  nameLabel: "Project name",
  create: "Create project",
  creating: "Creating the project and its first chat…",
  allProjectsLink: "All projects",
  needsName: "A project needs a name.",
  nameTooLong: (maxLength: number): string =>
    `Use a shorter name, of at most ${maxLength} characters.`,
  buddyLabel: "Buddy for the first chat",
  chooseBuddy: "Choose one of your buddies for the interview.",
} as const;

export const PROJECT_COPY = {
  loading: "Loading project…",
  chatsHeading: "Chats",
  noChats: "No chats yet.",
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
  alone: "Only you work on this project for now.",
  remove: "Remove",
  removeLabel: (label: string): string => `Remove ${label} from the project`,
  removeTitle: "Remove this member?",
  removeDescription: (label: string): string =>
    `${label} can no longer open this project or its chats. What they wrote stays in the chats.`,
  removeConfirm: "Remove member",
  removeCancel: "Keep them",
  leave: "Leave project",
  leaveTitle: "Leave this project?",
  leaveDescription:
    "You can no longer open this project or its chats unless the owner invites you again. What you wrote stays in the chats.",
  leaveConfirm: "Leave project",
  leaveCancel: "Stay",
} as const;
