import { pageTitle } from "@/ui/copy/site.ts";

// The Settings page, and the site header's link to it.
export const SETTINGS_COPY = {
  title: pageTitle("Settings"),
  headerLink: "Settings",
  homeLink: "Home",
  heading: "Settings",
  extrasHeading: "Extras",
  extrasHint:
    "Switch extra parts of the site on or off. A switch only changes what is shown: nothing is deleted. Each switch saves at once, to your account.",
} as const;

// Each extra's switch on the Settings page: its label and what it shows, by
// the copy key its flag names in src/flags/flags.ts.
export const FLAG_COPY = {
  workingNotes: {
    label: "Working notes",
    hint: "The buddy's short notes in a chat before it looks something up.",
  },
  memoryChangeCards: {
    label: "Memory changes",
    hint: "The cards in a chat that show what the buddy changed in the project's memory.",
  },
  toolLines: {
    label: "Search and tool lines",
    hint: "The lines in a chat that say what the buddy searched the manual for, or that a tool failed.",
  },
  pinnedChatHeader: {
    label: "Pinned chat header",
    hint: "Keeps a chat's links and name at the top while you scroll. Off, they scroll away with the chat.",
  },
  chatNames: {
    label: "Chat names",
    hint: "The names in a project's list of chats. Off, each chat shows its buddy's name alone.",
  },
  pageDecorations: {
    label: "Page decorations",
    hint: "The theme's pattern behind every page.",
  },
  usageMeter: {
    label: "Usage meter",
    hint: "This month's spend out of $5 on your account page, and when it resets.",
  },
} as const;
