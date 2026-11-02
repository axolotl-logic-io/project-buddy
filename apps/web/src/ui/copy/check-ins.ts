// The text of check-ins: the setting on a project's page, the check-in
// email, the page its link to turn check-ins off opens, and the unread mark
// on chat lists.
import type { CheckInFrequency } from "@/check-ins/check-in-frequency.ts";
import { pageTitle } from "./site.ts";

export const CHECK_IN_SETTING_COPY = {
  heading: "Check-ins",
  intro:
    "Your buddy can start a chat on its own, with where you left off and one small next step, and email it to you. Each check-in counts against your monthly quota.",
  label: "How often",
  frequencies: {
    off: "Off",
    daily: "Daily",
    "few-times-a-week": "A few times a week",
    weekly: "Weekly",
  } satisfies Record<CheckInFrequency, string>,
  save: "Save",
  saved: "Saved.",
  invalid: "Choose how often your buddy checks in.",
  unavailable: "Check-ins aren't available on this site yet.",
} as const;

export const CHECK_IN_EMAIL_COPY = {
  subject: (buddyName: string, projectName: string): string =>
    `${buddyName} checked in on ${projectName}`,
  openChat: "Open the chat:",
  turnOff: "To stop check-ins for this project, open:",
} as const;

export const CHECK_INS_OFF_COPY = {
  title: pageTitle("Turn off check-ins"),
  intro: (projectName: string): string =>
    `Your buddy checks in on ${projectName} and emails you each check-in. Turn them off?`,
  confirm: "Turn off check-ins",
  done: (projectName: string): string =>
    `Check-ins for ${projectName} are off. You can turn them on again on the project's page.`,
  unusable:
    "This link doesn't work. Turn check-ins off on the project's page instead.",
  loading: "Checking your link…",
} as const;

export const UNREAD_COPY = {
  mark: "Unread",
} as const;
