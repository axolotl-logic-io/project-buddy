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
    needsName: "A project needs a name.",
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
    chooseProject: "Choose a project for the chat.",
    choosePersona: "Choose a persona for the chat.",
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
    heading: "From the Blender manual",
  },

  // What the chat shows in place of a tool call that failed, by tool.
  toolFailures: {
    citeManual: "The tutor couldn't show its links to the manual.",
    searchManual: "The tutor couldn't search the manual.",
    updateMemory: "The tutor couldn't update the project's memory.",
  },

  problems: {
    errorHeading: "Something went wrong",
    retry: "Try again",
    notFoundHeading: "Not found",
    projectsLink: "Your projects",
    signInLink: "Sign in again",
  },

  memory: {
    title: pageTitle("Memory"),
    link: "Project memory",
    heading: "Memory",
    currentLabel: "Current memory",
    loading: "Loading memory…",
    empty:
      "Nothing is saved in this project's memory yet. Write it below, or tell the tutor what to remember.",
    editHeading: "Edit the memory",
    textLabel: "Memory",
    save: "Save memory",
    saved: "Saved.",
    outdated:
      "The memory changed since you started editing, so your text was not saved. The newer version is shown above, and your text is still here, to change and save again.",
    historyHeading: "History",
    noHistory: "No versions yet.",
    versionHeading: (version: number): string => `Version ${version}`,
    versionMade: (author: string, madeAt: string): string =>
      `by ${author}, ${madeAt}`,
    byUser: "you",
    byTutor: "the tutor",
    newest: "(current)",
    showText: "Show its text",
    restore: (version: number): string => `Restore version ${version}`,
    restoreOutdated:
      "The memory changed since this page loaded, so nothing was restored. The newer version is shown above.",
    changeLabel: "Memory change",
    changed: (version: number): string =>
      `Updated the project's memory (version ${version})`,
    removed: "Removed:",
    added: "Added:",
    notChanged: "The tutor's change to the project's memory did not apply.",
  },

  chatName: {
    fallback: "New chat",
    listTitle: (name: string, personaName: string): string =>
      `${name} with ${personaName}`,
    rename: "Rename chat",
    label: "Chat name",
    save: "Save name",
    saved: "Renamed.",
    needsName: "A chat needs a name.",
    tooLong: (maxLength: number): string =>
      `A chat name is one line of at most ${maxLength} characters.`,
  },

  interview: {
    creating: "Creating the project and its first chat…",
    choosePersona: "Choose a persona for the project's first chat.",
    // The tutor's first question when Claude could not write one.
    fallbackOpening:
      "Let's plan this project together. What would you like to make in Blender, and what is it for?",
  },
} as const;
