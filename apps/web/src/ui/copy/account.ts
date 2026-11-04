import { pageTitle } from "@/ui/copy/site.ts";

// The account page, and the site header's link to it.
export const ACCOUNT_COPY = {
  title: pageTitle("Account"),
  headerLink: "Account",
  homeLink: "Home",
  heading: "Account",
  signedInAs: (email: string): string => `Signed in as ${email}`,
  loading: "Loading your gold…",
  nameHeading: "Your name",
  nameLabel: "Name",
  nameHint:
    "What the buddy calls you. It uses your name wherever a buddy's prompt says {{name}}. Leave it empty and the buddy says “the user” instead.",
  saveName: "Save",
  nameSaved: "Saved",
  nameMultiLine: "A name is one line. Take out the line break.",
  nameTooLong: (maxLength: number): string =>
    `A name is at most ${maxLength} characters.`,
  nameBraces: "A name can't hold { or }.",
  goldHeading: "Gold balance",
  // Such as "Gold: 87".
  gold: (gold: number): string => `Gold balance: ${gold}`,
  goldHint:
    "Your gold pays for replies, images, chat names and generated openings of chats you start. Check-ins use the project owner's gold. You can earn and spend gold in the Marketplace. Your balance doesn't reset.",
  signOutHeading: "Signing out",
  signOut: "Sign out",
  signOutEverywhere: "Sign out everywhere",
  signOutEverywhereTitle: "Sign out everywhere?",
  signOutEverywhereDescription:
    "This signs you out in every browser and on every device, this one included. Any sign-in link already sent stops working. You can sign in again with a new link.",
  stay: "Stay signed in",
} as const;
