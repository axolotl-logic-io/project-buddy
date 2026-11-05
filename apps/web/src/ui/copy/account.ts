import { pageTitle } from "@/ui/copy/site.ts";

// The account page, and the site header's link to it.
export const ACCOUNT_COPY = {
  title: pageTitle("Account"),
  headerLink: "Account",
  homeLink: "Home",
  heading: "Account",
  loading: "Loading your gold…",
  nameHeading: "Your name",
  nameLabel: "Name",
  nameHint:
    "What your constructs call you. A construct uses your name wherever its instructions say {{name}}. Leave it empty and it says “the user” instead.",
  saveName: "Save",
  nameSaved: "Saved",
  nameMultiLine: "A name is one line. Take out the line break.",
  nameTooLong: (maxLength: number): string =>
    `A name is at most ${maxLength} characters.`,
  nameBraces: "A name can't hold { or }.",
  goldHeading: "Gold",
  // Such as "Gold: 87".
  gold: (gold: number): string => `Gold: ${gold}`,
  goldHint:
    "What your constructs spend on your replies, chat names, images and check-ins. It doesn't reset.",
  signOutHeading: "Signing out",
  signOut: "Sign out",
  signOutEverywhere: "Sign out everywhere",
  signOutEverywhereTitle: "Sign out everywhere?",
  signOutEverywhereDescription:
    "This signs you out in every browser and on every device, this one included. Any sign-in link already sent stops working. You can sign in again with a new link.",
  stay: "Stay signed in",
} as const;
