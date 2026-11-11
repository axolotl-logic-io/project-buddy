// The text of the projects list, the new-project form and a project's
// overview page, with its Members section.
import { pageTitle } from "@/ui/copy/site.ts";

export const PROJECTS_COPY = {
  title: pageTitle("Quests"),
  headerLink: "Quests",
  heading: "Quests",
  loading: "Loading quests…",
  none: "No quests yet. Choose a way to start one above.",
  listHeading: "All quests",
  shared: "Shared",
  sharedWithYou: "Shared with you",
  created: (createdAt: string): string => `started ${createdAt}`,
  nameLabel: "Quest name",
  defaultName: "New quest",
  cancel: "Cancel",
  newestFirst: "Your quests, newest first",
  allProjectsLink: "All quests",
  needsName: "A quest needs a name.",
  nameTooLong: (maxLength: number): string =>
    `Use a shorter name, of at most ${maxLength} characters.`,
  motivationLabel: "Why do you want to complete this quest?",
  motivationHint:
    "Optional. Tell your construct what makes this quest matter to you.",
} as const;

export const PROJECT_COPY = {
  navigation: "Quest workspace",
  rename: "Edit quest title",
  titleLabel: "Quest title",
  saveTitle: "Save title",
  cancelTitle: "Cancel title edit",
  titleSaved: "Quest title saved.",
  loading: "Loading quest…",
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
    `${label} can no longer open this quest or its conversation. What they wrote stays in it.`,
  removeConfirm: "Remove member",
  removeCancel: "Keep them",
  leave: "Leave quest",
  leaveTitle: "Leave this quest?",
  leaveDescription:
    "You can no longer open this quest or its conversation unless the owner invites you again. What you wrote stays in it.",
  leaveConfirm: "Leave quest",
  leaveCancel: "Stay",
} as const;

// The four ways to start a quest (src/components/quest-start.tsx).
export const QUEST_START_COPY = {
  heading: "Start a quest",
  choose: "Choose",
  chooseLabel: (name: string): string => `Choose ${name}`,
  openDailies: "Open Dailies",
  back: "Back to the starting points",
  journalLabel: "Starting Journal",
  journalHint:
    "Change anything here, or later in the Journal. Possible milestones are plans, not completed progress.",
  start: "Start quest",
  starting: "Starting the quest…",
  invalid: "Check the details and choose an available construct.",
} as const;
