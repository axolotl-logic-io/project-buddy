import { pageTitle } from "@/ui/copy/site.ts";

// The Settings page, and the site header's link to it.
export const SETTINGS_COPY = {
  title: pageTitle("Settings"),
  headerLink: "Settings",
  homeLink: "Home",
  heading: "Settings",
  extrasHeading: "Extras",
  extrasHint:
    "Show or hide the extra parts of the site. Hiding one only hides it: nothing is deleted, and switching it back on shows it again. Each switch saves at once, to your account.",
} as const;

// Each extra's switch on the Settings page: its label and what it shows, by
// the copy key its flag names in src/flags/flags.ts.
export const FLAG_COPY = {
  workingNotes: {
    label: "Working notes",
    hint: "The tutor's short notes in a chat before it looks something up.",
  },
  memoryChangeCards: {
    label: "Memory changes",
    hint: "The cards in a chat that show what the tutor changed in the project's memory.",
  },
  toolLines: {
    label: "Search and tool lines",
    hint: "The lines in a chat that say what the tutor searched the manual for, or that a tool failed.",
  },
  pinnedChatHeader: {
    label: "Pinned chat header",
    hint: "Keeps a chat's links and name at the top while you scroll. Off, they scroll away with the chat.",
  },
  chatNames: {
    label: "Chat names",
    hint: "The names in a project's list of chats. Off, each chat shows its tutor's name alone.",
  },
  pageDecorations: {
    label: "Page decorations",
    hint: "The theme's pattern behind every page.",
  },
  usageMeter: {
    label: "Usage meter",
    hint: "This month's spend out of $5 on your account page, and when it resets.",
  },
  personaMechanics: {
    label: "Buddy prompt mechanics",
    hint: "On a buddy's page, the parts of its prompt that citations, the project's memory and search rely on.",
  },
  interviewPersona: {
    label: "Interview buddy",
    hint: "On the projects page, a choice of buddy, built-in or your own, for a new project's interview. Off, the interview is with Hippy.",
  },
} as const;
