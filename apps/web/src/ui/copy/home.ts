import { pageTitle } from "@/ui/copy/site.ts";

const HOME_COPY = {
  title: pageTitle("Home"),
  heading: "Your projects await",
  purpose:
    "Project Buddy helps you turn ideas into next steps with an AI construct. Start a quest with a goal you want to work on.",
  introduction: "Don't know where to start?",
  activitiesLink: "Try an Activity",
  unread: "New messages",
  placesLabel: "Places",
  loading: "Loading your atlas…",
  newQuest: "Start a quest",
  currentQuest: "Current quest",
  nextStep: "Next step:",
  continue: "Continue",
  continueLabel: (name: string): string => `Continue ${name}`,
  openPlaces: "Every place is open to you.",
  quests: "Dailies, things to learn, make or do, and shared quests.",
  chats: "Talk something through without a goal.",
  constructs: "Meet the constructs you work with, or customize your own.",
  activities: "Choose what you and your construct do together.",
  workshop: "Make, clone and tweak constructs, activities and spells.",
  marketplace: "Discover constructs, activities and spells.",
  settings: "Settings",
} as const;

export { HOME_COPY };
