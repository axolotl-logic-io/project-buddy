// The text of check-ins: the setting on a project's page, the check-in
// email, the page its link to turn check-ins off opens, and the unread mark
// on quests.
import type { CheckInFrequency } from "@/check-ins/check-in-frequency.ts";
import { pageTitle } from "./site.ts";

// A sentence that names a quest, in its parts, so a page can set the
// quest's name apart from the words around it.
interface QuestSentence {
  readonly before: string;
  readonly quest: string;
  readonly after: string;
}

export const CHECK_IN_SETTING_COPY = {
  heading: "Check-ins",
  intro:
    "Your construct can write in this quest on its own, with where you left off and one small next step, and email it to you. Each check-in spends some of your batteries.",
  label: "How often",
  frequencies: {
    off: "Off",
    daily: "Daily",
    "few-times-a-week": "A few times a week",
    weekly: "Weekly",
  } satisfies Record<CheckInFrequency, string>,
  save: "Save",
  saved: "Saved.",
  invalid: "Choose how often your construct checks in.",
  unavailable: "Check-ins aren't available on this site yet.",
} as const;

export const CHECK_IN_EMAIL_COPY = {
  subject: (constructName: string, projectName: string): string =>
    `${constructName} checked in on ${projectName}`,
  openQuest: "Open the quest:",
  turnOff: "To stop check-ins for this quest, open:",
} as const;

export const CHECK_INS_OFF_COPY = {
  title: pageTitle("Turn off check-ins"),
  intro: (projectName: string): QuestSentence => ({
    before: "Your construct checks in on ",
    quest: projectName,
    after: " and emails you each check-in. Turn them off?",
  }),
  confirm: "Turn off check-ins",
  done: (projectName: string): QuestSentence => ({
    before: "Check-ins for ",
    quest: projectName,
    after: " are off. You can turn them on again on the quest's page.",
  }),
  questLink: "Go to the quest",
  unusable:
    "This link doesn't work. Turn check-ins off on the quest's page instead.",
  homeLink: "Go to Home",
  loading: "Checking your link…",
} as const;

export const UNREAD_COPY = {
  mark: "Unread",
} as const;

export type { QuestSentence };
