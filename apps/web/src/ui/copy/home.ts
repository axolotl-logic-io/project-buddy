import { pageTitle } from "@/ui/copy/site.ts";

const HOME_COPY = {
  title: pageTitle("Home"),
  heading: "Your projects await",
  introduction: "Don't know where to start?",
  activitiesLink: "Try an Activity",
  placesLabel: "Places",
  viewLabel: "Destination view",
  map: "Map",
  list: "List",
  loading: "Loading your atlas…",
  newQuest: "Start a quest",
  currentQuest: "Current quest",
  nextStep: "Next step:",
  continue: "Continue",
  continueLabel: (name: string): string => `Continue ${name}`,
  account: "Account",
  openPlaces: "Every place is open to you.",
  quests: "Goals, next steps and shared quests.",
  chats: "New adventures and conversations to return to.",
  guild:
    "Meet your guildmates: constructs to chat with, or customize your own.",
  activities: "Choose what you and your guildmate do together.",
  spellbook: "Find and shape the instructions your guildmate casts.",
  workshop: "Make, clone and tweak constructs, activities and spells.",
  gallery: "Your generated images, ready to revisit.",
  marketplace: "Discover constructs, activities and spells.",
  settings: "Switch extras and notifications on or off.",
} as const;

export { HOME_COPY };
