import { pageTitle } from "@/ui/copy/site.ts";

// The Settings page, and the site header's link to it.
export const SETTINGS_COPY = {
  title: pageTitle("Settings"),
  headerLink: "Settings",
  heading: "Settings",
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

export const INTERVIEW_CONSTRUCT_COPY = {
  heading: "New quest construct",
  hint: "New quests start with this construct unless you choose another. Changing it affects future quests. If the construct is no longer available, Vellum takes their place.",
  save: "Save new quest construct",
  saved: "New quest construct saved.",
  invalid: "Choose a construct for new quests.",
} as const;
