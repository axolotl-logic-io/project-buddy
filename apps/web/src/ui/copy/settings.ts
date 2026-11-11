import { pageTitle } from "@/ui/copy/site.ts";

// The Settings page, and the site header's link to it.
export const SETTINGS_COPY = {
  title: pageTitle("Settings"),
  headerLink: "Settings",
  heading: "Settings",
} as const;

export const INTERVIEW_CONSTRUCT_COPY = {
  heading: "New quest construct",
  hint: "New quests start with this construct unless you choose another. Changing it affects future quests. If the construct is no longer available, Vellum takes their place.",
  save: "Save new quest construct",
  saved: "New quest construct saved.",
  invalid: "Choose a construct for new quests.",
} as const;
