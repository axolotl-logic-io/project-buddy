// The text the site shows lives in src/ui/copy/, one module per area of the
// site, and components render it from there rather than writing it inline.
// This module holds the site's own name and tagline, the name its email is
// sent under, the home page's text, and pageTitle, which every page's title
// goes through.
const SITE_NAME = "Project Buddy";

export function pageTitle(page: string): string {
  return `${page} · ${SITE_NAME}`;
}

export const SITE_COPY = {
  name: SITE_NAME,
  tagline: "Learn Blender by building your own projects.",
} as const;

// Every email comes from Hippy, the default buddy, and is written in Hippy's
// voice (src/buddies/hippy.ts).
export const EMAIL_SENDER_COPY = {
  name: "Hippy",
} as const;

export const HOME_COPY = {
  projectsLink: "Projects",
  chatLink: "Chats",
} as const;
