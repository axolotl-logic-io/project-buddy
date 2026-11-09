// The text of the projects list, the new-project form and a project's
// overview page, with its Members section.
import { pageTitle } from "@/ui/copy/site.ts";

export const PROJECTS_COPY = {
  title: pageTitle("Quests"),
  headerLink: "Quests",
  homeLink: "Home",
  heading: "Quests",
  loading: "Loading quests…",
  none: "No quests yet. Choose Start Quest to start one.",
  newHeading: "Start Quest",
  closeNewProject: "Close",
  listHeading: "All quests",
  shared: "Shared",
  sharedWithYou: "Shared with you",
  created: (createdAt: string): string => `started ${createdAt}`,
  nameLabel: "Quest name",
  create: "Start Quest",
  defaultName: "New quest",
  whyLabel: "Why",
  constructHint:
    "This construct joins your first adventure. You can start other adventures in this quest with other constructs.",
  unavailableConstruct:
    "Choose an available construct for your first adventure.",
  cancel: "Cancel",
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
  navigation: "Quest workspace",
  rename: "Edit quest title",
  titleLabel: "Quest title",
  saveTitle: "Save title",
  cancelTitle: "Cancel title edit",
  titleSaved: "Quest title saved.",
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

export const QUEST_LIBRARY_COPY = {
  heading: "Premade quests",
  intro:
    "Bring your own idea, or find a place to begin. Each starting point is yours to change.",
  explore: "Explore quest",
  exploreLabel: (name: string): string => `Explore quest: ${name}`,
  journalLabel: "Starting Journal",
  journalHint:
    "Edit this starting plan here or change the Journal later. Possible milestones are plans, not completed progress.",
  activityLabel: "First activity",
  start: "Start quest",
  activityIntro:
    "Want to keep working on what you discover? Start a quest with this activity and return as your idea takes shape.",
  invalid:
    "Check the starting details and choose an available activity and construct.",
} as const;
