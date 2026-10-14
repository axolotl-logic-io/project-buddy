import { pageTitle } from "@/ui/copy/site.ts";

// The account page, and the site header's link to it.
export const ACCOUNT_COPY = {
  title: pageTitle("Account"),
  headerLink: "Account",
  homeLink: "Home",
  heading: "Account",
  loading: "Loading this month's usage…",
  nameHeading: "Your name",
  nameLabel: "Name",
  nameHint:
    "What the tutor calls you. It uses your name wherever a buddy's prompt says {{name}}. Leave it empty and the tutor says “the user” instead.",
  saveName: "Save",
  nameSaved: "Saved",
  nameMultiLine: "A name is one line. Take out the line break.",
  nameTooLong: (maxLength: number): string =>
    `A name is at most ${maxLength} characters.`,
  nameBraces: "A name can't hold { or }.",
  usageHeading: "This month",
  // Such as "$1.25 of $5.00".
  usage: (spent: string, limit: string): string => `${spent} of ${limit}`,
  usageHint: "What your messages to the tutor have cost this month.",
  resetsOn: (day: string): string => `Resets on ${day} (UTC).`,
  signOutHeading: "Signing out",
  signOut: "Sign out",
  signOutEverywhere: "Sign out everywhere",
  signOutEverywhereTitle: "Sign out everywhere?",
  signOutEverywhereDescription:
    "This signs you out in every browser and on every device, this one included. Any sign-in link already sent stops working. You can sign in again with a new link.",
  stay: "Stay signed in",
} as const;
