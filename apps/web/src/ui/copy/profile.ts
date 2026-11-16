import { pageTitle } from "@/ui/copy/site.ts";

// The Profile page, and the site panel's link to it.
export const PROFILE_COPY = {
  title: pageTitle("Profile"),
  headerLink: "Profile",
  heading: "Profile",
  intro: "Your name and your experience.",
  loading: "Loading Profile…",
} as const;
