// The text the site shows lives in src/ui/copy/, one module per area of the
// site, and components render it from there rather than writing it inline.
// This module holds the site's own name and tagline, its panel's text, the
// name its email is sent under, the home page's text, and pageTitle, which
// every page's title goes through.
const SITE_NAME = "Project Buddy";

export function pageTitle(page: string): string {
  return `${page} · ${SITE_NAME}`;
}

export const SITE_COPY = {
  breadcrumbSeparator: "/",
  breadcrumbs: "Breadcrumbs",
  name: SITE_NAME,
  tagline: "Work through your own quests and ideas with your constructs.",
} as const;

// The site panel, which a button under the header opens on the left: its
// title, which also names the button, the name of the button in the panel
// that closes it, and the names of its two groups of links.
export const SITE_PANEL_COPY = {
  title: "Site panel",
  close: "Close site panel",
  placesLabel: "Places",
  youLabel: "You",
} as const;

// Every email comes from Vellum, the default construct, and is written in
// Vellum's voice (src/constructs/vellum.ts).
export const EMAIL_SENDER_COPY = {
  name: "Vellum",
} as const;
