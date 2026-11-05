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
    hint: "Your guildmate's short notes in a chat before it looks something up.",
  },
  memoryChangeCards: {
    label: "Memory changes",
    hint: "The cards in a chat that show what your guildmate changed in the quest's memory.",
  },
  toolLines: {
    label: "Search and tool lines",
    hint: "The lines in a chat that say what your guildmate searched the manual for, or that a tool failed.",
  },
  pinnedChatHeader: {
    label: "Pinned chat header",
    hint: "Keeps a chat's links and name at the top while you scroll. Off, they scroll away with the chat.",
  },
  chatNames: {
    label: "Chat names",
    hint: "The names in a quest's list of chats. Off, each chat shows its guildmate's name alone.",
  },
  pageDecorations: {
    label: "Page decorations",
    hint: "The theme's pattern behind every page.",
  },
  usageMeter: {
    label: "Gold balance",
    hint: "How much gold you have left for your guildmates, on your account page.",
  },
} as const;

// The Settings page's notifications section, and the test notification it
// sends.
export const NOTIFICATIONS_COPY = {
  heading: "Notifications",
  hint: "Get notifications from Project Buddy on this device, even when the site is closed. Each device has its own switch.",
  switchLabel: "Notifications on this device",
  switchHint:
    "Your browser asks for permission the first time you switch this on.",
  checking: "Checking this device…",
  unsupported:
    "This browser can't show notifications from Project Buddy. On an iPhone or iPad, add Project Buddy to your Home Screen first, then open it from there and come back to Settings.",
  blocked:
    "Notifications are blocked for Project Buddy. Allow them in your browser's site settings, then try again.",
  failed: "That didn't work. Try again in a moment.",
  sendTest: "Send a test notification",
  sendingTest: "Sending…",
  testSent: "Sent. It should arrive in a moment.",
  testNotSent:
    "Nothing was sent: no device has notifications on. Switch them off and on again here.",
  testTitle: "Hello from Project Buddy",
  testBody: "Notifications work on this device.",
} as const;
