import { pageTitle } from "@/ui/copy/site.ts";

// The Profile page, and the site panel's link to it.
export const PROFILE_COPY = {
  title: pageTitle("Profile"),
  headerLink: "Profile",
  heading: "Profile",
  daysHeading: "Days signed in",
  daysExplanation: "Each day you visit while signed in counts once.",
  daysUnit: (total: number): "day total" | "days total" => {
    if (total === 1) {
      return "day total";
    }
    return "days total";
  },
  daysTracking: (since: string | null): string => {
    if (since === null) {
      return "Tracking starts with your first signed-in visit. Days use UTC; earlier days are not included.";
    }
    return `Tracked since ${since} · Days use UTC. Earlier days are not included.`;
  },
  loading: "Loading Profile…",
} as const;
