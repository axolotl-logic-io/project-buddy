// Every piece of text the site shows, grouped by where it appears.
// Components render text from here rather than writing it inline.
const SITE_NAME = "Project Buddy";

function pageTitle(page: string): string {
  return `${page} · ${SITE_NAME}`;
}

export const COPY = {
  site: {
    name: SITE_NAME,
    tagline: "Learn Blender by building your own projects.",
  },
  footer: {
    beforeManual: "Includes content adapted from the ",
    manual: "Blender Reference Manual",
    beforeLicense: ", licensed under ",
    license: "CC BY-SA 4.0",
    end: ".",
  },
  home: {
    projectsLink: "Your projects",
  },
  login: {
    title: pageTitle("Log in"),
    passphrase: "Passphrase",
    unlock: "Unlock",
    lockedOut: "Too many failed attempts. Try again later.",
    wrongPassphrase: "Wrong passphrase.",
  },
  projects: {
    title: pageTitle("Projects"),
    homeLink: "Home",
    heading: "Projects",
    loading: "Loading projects…",
    none: "No projects yet.",
    nameLabel: "Project name",
    create: "Create project",
    allProjectsLink: "All projects",
  },
  project: {
    loading: "Loading project…",
    chatsHeading: "Chats",
    startChat: "Start a chat",
    noChats: "No chats yet.",
    chatStarted: (startedAt: string): string => ` started ${startedAt}`,
  },
  newChat: {
    title: pageTitle("New chat"),
    heading: "Start a chat",
    beforeProjectLink: "Create a ",
    projectLink: "project",
    afterProjectLink: " first.",
    projectLabel: "Project",
    personaLabel: "Persona",
    start: "Start chat",
  },
  chat: {
    loading: "Loading chat…",
    heading: (personaName: string): string => `Chat with ${personaName}`,
    you: "You",
    thinking: (personaName: string): string => `${personaName} is thinking…`,
    messageLabel: "Message",
    send: "Send",
  },
} as const;
