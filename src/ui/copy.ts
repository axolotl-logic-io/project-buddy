// The text the site shows, grouped by where it appears. Components render text
// from here rather than writing it inline. A sentence that contains a link is a
// function of the link, so the sentence reads whole here and its spacing stays
// in the sentence. Elements passed in need keys, because the sentence comes
// back as a list. The messages for error cases live in src/errors/app-error.ts,
// next to the errors they describe.
import type { ReactNode } from "react";

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
    credit: (manualLink: ReactNode, licenseLink: ReactNode): ReactNode[] => [
      "Includes content adapted from the ",
      manualLink,
      ", licensed under ",
      licenseLink,
      ".",
    ],
    manual: "Blender Reference Manual",
    license: "CC BY-SA 4.0",
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
    chatStarted: (startedAt: string): string => `started ${startedAt}`,
  },
  newChat: {
    title: pageTitle("New chat"),
    heading: "Start a chat",
    loading: "Loading projects…",
    needsProject: (projectLink: ReactNode): ReactNode[] => [
      "Create a ",
      projectLink,
      " first.",
    ],
    projectLink: "project",
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

  citations: {
    searching: (query: string): string =>
      `Searching the manual for “${query}”…`,
    searched: (query: string): string => `Searched the manual for “${query}”`,
    searchFailed: (query: string): string =>
      `Couldn't search the manual for “${query}”.`,
    heading: "From the Blender manual",
  },
} as const;
