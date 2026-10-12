// The text of the projects list, the new-project form and a project's
// overview page.
import { pageTitle } from "@/ui/copy/site.ts";

export const PROJECTS_COPY = {
  title: pageTitle("Projects"),
  homeLink: "Home",
  heading: "Projects",
  loading: "Loading projects…",
  none: "No projects yet. Start one above.",
  newHeading: "New project",
  listHeading: "Your projects",
  created: (createdAt: string): string => `started ${createdAt}`,
  nameLabel: "Project name",
  create: "Create project",
  creating: "Creating the project and its first chat…",
  allProjectsLink: "All projects",
  needsName: "A project needs a name.",
} as const;

export const PROJECT_COPY = {
  loading: "Loading project…",
  chatsHeading: "Chats",
  startChat: "Start a chat",
  noChats: "No chats yet.",
  chatStarted: (startedAt: string): string => `started ${startedAt}`,
} as const;
